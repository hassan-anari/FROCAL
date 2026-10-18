import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";
import { guardSdkTransport } from "./transport";

export type Consent = "unknown" | "declined" | "analytics" | "replay";
export type Section = "base" | "earn" | "network" | "typing" | "clan" | "arena" | "profile";
export type FeatureEvent = "daily_reward_claimed" | "mission_claimed" | "typing_session_completed"
  | "network_group_registration_initiated" | "clan_registration_completed" | "clan_join_request_submitted"
  | "clan_status_opened" | "clan_shop_purchase_completed" | "clan_shop_activation_completed"
  | "earn_history_opened" | "arena_leaderboard_viewed";
export const CONSENT_KEY = "frocal-analytics-consent-v1";
const sections: Section[] = ["base", "earn", "network", "typing", "clan", "arena", "profile"];
const events: FeatureEvent[] = ["daily_reward_claimed", "mission_claimed", "typing_session_completed",
  "network_group_registration_initiated", "clan_registration_completed", "clan_join_request_submitted",
  "clan_status_opened", "clan_shop_purchase_completed", "clan_shop_activation_completed",
  "earn_history_opened", "arena_leaderboard_viewed"];

export function readConsent(): Consent {
  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    return saved === "declined" || saved === "analytics" || saved === "replay" ? saved : "unknown";
  } catch { return "unknown"; }
}

export function analyticsConfig(env: Partial<ImportMetaEnv>) {
  const key = env.VITE_POSTHOG_KEY?.trim();
  const host = env.VITE_POSTHOG_HOST?.trim();
  let validHost = false;
  try {
    const url = new URL(host ?? "");
    validHost = url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
  } catch { /* Missing/invalid configuration stays off. */ }
  return {
    enabled: Boolean(env.PROD && env.MODE !== "test" && env.VITE_DATA_SOURCE !== "local" && env.VITE_DATA_SOURCE !== "msw"
      && env.VITE_POSTHOG_ENABLED !== "false" && key && validHost),
    key: key ?? "", host: host ?? "", replay: env.VITE_POSTHOG_REPLAY_ENABLED !== "false",
    requireConsent: env.VITE_POSTHOG_REQUIRE_CONSENT === "true",
  };
}

/** The authenticated bootstrap's player.id is a Telegram ID, not a database ID.
 * Public, versioned namespace is stable across devices. This is pseudonymization,
 * not encryption/anonymization: a client-side salt cannot be a secret. */
export async function playerPseudonym(telegramId: string): Promise<string | null> {
  if (!/^[1-9]\d{0,15}$/.test(telegramId) || !Number.isSafeInteger(Number(telegramId))) return null;
  const bytes = new TextEncoder().encode(`frocal:telegram-player:v1:${telegramId}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return `frocal:player:v1:${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("")}`;
}

type Config = Omit<ReturnType<typeof analyticsConfig>, "requireConsent"> & { requireConsent?: boolean };
type Dependencies = {
  load: (replay: boolean) => Promise<PostHog>;
  hash: typeof playerPseudonym;
};

// No remote script loading. Vite serves the official recorder from our own build.
async function loadSdk(replay: boolean) {
  const { default: sdk } = await import("posthog-js/no-external");
  if (replay) await import("posthog-js/dist/lazy-recorder");
  return sdk;
}

/** Only structural attributes survive replay. No arbitrary data-*, URLs, labels,
 * titles or field values. Images are blocked separately (including private avatars). */
export function maskReplayAttribute(name: string, value: string, element?: Element) {
  if (["class", "width", "height", "viewBox", "d", "fill", "stroke", "stroke-width", "role", "type", "disabled", "rel"].includes(name)) return value;
  if (name === "style") {
    const style = document.createElement("div").style;
    style.cssText = value;
    const layout = ["opacity", "transform", "transform-origin", "position", "left", "right", "top", "bottom", "width", "height", "min-width", "max-width", "min-height", "max-height", "display", "overflow", "touch-action", "overscroll-behavior", "z-index", "color", "background-color"];
    return Array.from(style).filter(property => {
      const content = style.getPropertyValue(property);
      if (layout.includes(property)) return !/["']|(?:url|var|env|attr|image|paint)\s*\(/i.test(content);
      // Preserve Telegram safe-area/theme layout, without arbitrary custom data.
      return /^--(?:safe-(?:top|right|bottom|left)|tg-(?:stable-height|(?:safe-area-inset|content-safe-area-inset)-(?:top|right|bottom|left)|theme-(?:bg|text|hint|button|button-text|secondary-bg|accent|bottom-bar)))$/.test(property)
        && /^(?:-?[\d.]+(?:px|rem|vh|vw|%)?|#[\da-f]{3,8}|rgba?\([\d.,%\s]+\))$/i.test(content.trim());
    }).map(property => `${property}:${style.getPropertyValue(property)}`).join(";");
  }
  // rrweb inlines our build stylesheet for faithful playback. Only the static
  // same-origin Vite CSS is eligible; arbitrary inline stylesheets are redacted.
  if (name === "_cssText" && element?.tagName === "LINK" && maskReplayAttribute("href", element.getAttribute("href") ?? "")) return value;
  // Keep build stylesheets loadable; never retain query strings or other URLs.
  if (name === "href") {
    try {
      const url = new URL(value, location.origin);
      if (url.origin === location.origin && /^\/assets\/[\w.-]+\.css$/.test(url.pathname) && !url.search && !url.hash) return url.href;
    } catch { /* redact */ }
  }
  return "";
}

export function createAnalytics(config: Config, deps: Dependencies = { load: loadSdk, hash: playerPseudonym }) {
  // In the configured demo, new verified players use the full masked replay mode.
  // Explicit saved preferences (especially an earlier withdrawal) always win.
  let consent = readConsent();
  if (consent === "unknown" && !config.requireConsent) consent = "replay";
  let player: string | null = null;
  let session = 0;
  let generation = 0;
  let sdk: PostHog | undefined;
  let initialized = false;
  let identity: string | null = null;
  let ready = false;
  let replaying = false;
  let section: Section | null = null;
  let pathname = "/";
  let lastPage: string | null = null;
  const seen = new Set<string>();
  const listeners = new Set<() => void>();
  const pageListeners = new Set<() => void>();
  const optional = (call: () => void) => { try { call(); } catch { /* Analytics never changes gameplay outcomes. */ } };
  const publish = () => listeners.forEach(fn => fn());
  const allowed = () => config.enabled && player !== null && (consent === "analytics" || consent === "replay");
  const safeUrl = () => `${location.origin}${pathname}`;
  const beforeSend = (event: CaptureResult | null): CaptureResult | null => {
    if (!event || !ready || !allowed()) return null;
    const snapshot = event.event === "$snapshot";
    if (snapshot && !replaying) return null;
    if (!snapshot && !["$identify", "$pageview", "active_time", ...events].includes(event.event)) return null;
    // Drop SDK enrichment (referrers, initial URLs, campaign params, person properties,
    // titles, geo/IP lookup, etc.) and any accidental arbitrary event properties.
    const keep = ["token", "distinct_id", "$device_id", "$session_id", "$window_id", "$lib", "$lib_version", "$is_identified", "$process_person_profile", "$anon_distinct_id"];
    if (snapshot) keep.push("$snapshot_data", "$snapshot_bytes");
    const properties = Object.fromEntries(keep.filter(k => k in event.properties).map(k => [k, event.properties[k]]));
    properties.$ip = "0.0.0.0";
    properties.$geoip_disable = true;
    if (!snapshot) {
      properties.$current_url = safeUrl();
      properties.$pathname = new URL(safeUrl()).pathname;
      if (sections.includes(event.properties.section)) properties.section = event.properties.section;
      if (["players", "clans"].includes(event.properties.mode)) properties.mode = event.properties.mode;
      if (event.event === "active_time" && Number.isFinite(event.properties.active_seconds)) {
        properties.active_seconds = Math.max(0, Math.min(60, Math.round(event.properties.active_seconds)));
      }
    }
    // Person setters also exist at the envelope level; never spread the envelope.
    return { uuid: event.uuid, event: event.event, timestamp: event.timestamp, properties };
  };
  const options = (): Partial<PostHogConfig> => ({
    api_host: config.host,
    request_batching: false, // Low-volume explicit events; no post-withdrawal batch delivery.
    persistence: "memory", // Only our consent preference persists; no raw identity or credentials.
    opt_out_capturing_by_default: true,
    capture_pageview: false, capture_pageleave: false, autocapture: false,
    disable_capture_url_hashes: true,
    disable_session_recording: true,
    enable_recording_console_log: false,
    capture_performance: false, capture_exceptions: false, capture_dead_clicks: false,
    enable_heatmaps: false, rageclick: false,
    disable_surveys: true, disable_product_tours: true,
    disable_external_dependency_loading: true,
    advanced_disable_feature_flags: true,
    advanced_disable_toolbar_metrics: true,
    person_profiles: "identified_only", ip: false,
    reuseAnonymousId: true, // No growing collection of anonymous aliases across visits.
    save_referrer: false, save_campaign_params: false,
    get_current_url: safeUrl,
    before_send: beforeSend,
    session_recording: {
      maskAllInputs: true, maskTextSelector: "*",
      maskTextFn: text => text.replace(/\S/g, "*"),
      maskInputFn: () => "***",
      maskAttributeFn: maskReplayAttribute,
      blockSelector: "[data-ph-sensitive], .ph-no-capture, img, iframe, canvas, input[type='hidden'], input[type='file']",
      recordHeaders: false, recordBody: false, collectFonts: false,
      captureCanvas: { recordCanvas: false },
      captureJsonLd: false,
      slimDOMOptions: "all",
      recordCrossOriginIframes: false,
      maskCapturedNetworkRequestFn: data => Object.keys(data).length === 1 && "name" in data ? { ...data, name: safeUrl() } : null,
      canvasCapture: { maskRegionsFn: () => null },
      sampling: { mousemove: false },
    },
  });
  const stop = () => {
    ready = false; replaying = false; identity = null; lastPage = null; seen.clear();
    if (sdk && initialized) {
      optional(() => sdk!.stopSessionRecording());
      optional(() => sdk!.opt_out_capturing());
      optional(() => sdk!.reset(true));
    }
    publish();
  };
  const capturePage = () => {
    const key = `${pathname}:${section}`;
    if (ready && section && key !== lastPage) {
      lastPage = key;
      optional(() => { sdk?.capture("$pageview", { section }); });
    }
  };
  const connect = async () => {
    const turn = ++generation;
    if (!allowed()) return;
    try {
      const id = await deps.hash(player!);
      if (!id || turn !== generation || !allowed()) return;
      const loaded = await deps.load(consent === "replay" && config.replay);
      if (turn !== generation || !allowed()) return;
      sdk = loaded;
      if (!initialized) {
        sdk.init(config.key, options());
        guardSdkTransport(sdk, () => ({ allowed: ready && allowed(), generation, identity }));
        initialized = true;
      }
      sdk.opt_in_capturing({ captureEventName: false });
      identity = id;
      ready = true;
      sdk.identify(id);
      replaying = consent === "replay" && config.replay;
      if (replaying) sdk.startSessionRecording({ sampling: true });
      capturePage(); publish();
    } catch { stop(); /* Missing crypto/SDK support must never break an old WebView. */ }
  };
  return {
    config,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    beforePageChange: (fn: () => void) => { pageListeners.add(fn); return () => { pageListeners.delete(fn); }; },
    getConsent: () => consent,
    isReady: () => ready,
    setConsent(next: Consent, persist = true) {
      const effective = next === "unknown" && !config.requireConsent ? "replay" : next;
      if (effective === consent) return;
      consent = effective; ++generation; stop();
      if (persist) try { localStorage.setItem(CONSENT_KEY, effective); } catch { /* Session choice still applies. */ }
      void connect();
    },
    setPlayer(verifiedTelegramId: string | null, authenticatedSession: number) {
      if (verifiedTelegramId === player && authenticatedSession === session) return;
      ++generation; stop();
      player = verifiedTelegramId; session = authenticatedSession;
      void connect();
    },
    page(next: Section | null, earnTabPath?: "/earn") {
      const path = earnTabPath === "/earn" ? "/earn" : next === "network" ? "/earn" : next === "typing" ? "/earn/typing" : next ? `/${next}` : "/";
      if (next !== section || path !== pathname) pageListeners.forEach(fn => fn());
      section = next; pathname = path;
      if (!next) lastPage = null;
      capturePage();
    },
    feature(event: FeatureEvent, dedupeKey?: string, mode?: "players" | "clans") {
      if (!ready || !allowed()) return;
      // Keys are memory-only server receipts/intents; never event properties.
      const key = dedupeKey ? `${event}:${dedupeKey}` : null;
      if (key && seen.has(key)) return;
      if (key) { if (seen.size >= 500) seen.delete(seen.values().next().value!); seen.add(key); }
      optional(() => { sdk?.capture(event, mode ? { mode } : undefined); });
    },
    featureFor(verifiedPlayer: string, authenticatedSession: number, event: FeatureEvent, dedupeKey?: string) {
      if (verifiedPlayer === player && authenticatedSession === session) this.feature(event, dedupeKey);
    },
    active(seconds: number) {
      if (ready && allowed() && section && seconds >= 1) optional(() => { sdk?.capture("active_time", { section, active_seconds: seconds }); });
    },
  };
}

export const analytics = createAnalytics(analyticsConfig(import.meta.env));
