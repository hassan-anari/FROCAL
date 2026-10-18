import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";
import { analyticsConfig, CONSENT_KEY, createAnalytics, maskReplayAttribute, playerPseudonym, readConsent } from "./analytics";

const config = { enabled: true, key: "test-token", host: "https://ingest.test", replay: true };
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function harness(overrides: Parameters<typeof createAnalytics>[0] = config) {
  let options: Partial<PostHogConfig> = {};
  const sent: CaptureResult[] = [];
  const sdk = {
    init: vi.fn((_key, value) => { options = value; }),
    identify: vi.fn((id: string) => sdk.capture("$identify", { distinct_id: id })),
    capture: vi.fn((event: string, properties = {}) => {
      const safe = (options.before_send as Function)?.({ event, properties });
      if (safe) sent.push(safe);
    }),
    opt_in_capturing: vi.fn(), opt_out_capturing: vi.fn(), reset: vi.fn(),
    stopSessionRecording: vi.fn(), startSessionRecording: vi.fn(),
    _send_request: vi.fn(), _retryQueue: { retriableRequest: vi.fn() },
  };
  const load = vi.fn(async () => sdk as unknown as PostHog);
  const hash = vi.fn(async (id: string) => `frocal:player:v1:hash-of-${id}`);
  const a = createAnalytics(overrides, { load, hash });
  return { a, sdk, load, hash, sent, options: () => options };
}
beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("configuration and identity", () => {
  it("fails closed for unconfigured/dev/unit/local/MSW/explicitly disabled builds", () => {
    const env = { PROD: true, MODE: "production", VITE_POSTHOG_KEY: "test", VITE_POSTHOG_HOST: "https://ingest.test", VITE_DATA_SOURCE: "remote" as const };
    expect(analyticsConfig(env).enabled).toBe(true);
    for (const patch of [{ PROD: false }, { MODE: "test" }, { VITE_DATA_SOURCE: "local" as const }, { VITE_DATA_SOURCE: "msw" as const }, { VITE_POSTHOG_ENABLED: "false" }, { VITE_POSTHOG_KEY: "" }, { VITE_POSTHOG_HOST: "" }, { VITE_POSTHOG_HOST: "http://ingest.test" }, { VITE_POSTHOG_HOST: "https://ingest.test/?secret=x" }, { VITE_POSTHOG_HOST: "https://user:pass@ingest.test" }]) {
      expect(analyticsConfig({ ...env, ...patch }).enabled).toBe(false);
    }
  });
  it("uses versioned SHA-256 of verified numeric IDs, stable across visits/devices", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const id = await playerPseudonym("9001");
    expect(id).toMatch(/^frocal:player:v1:[a-f0-9]{64}$/);
    expect(id).toBe(await playerPseudonym("9001"));
    expect(id).not.toBe(await playerPseudonym("9002"));
    expect(id).not.toContain("9001");
    for (const invalid of ["unverified", "mock-player", "0", "-1", "09001", "9.1", "9007199254740992"]) expect(await playerPseudonym(invalid)).toBeNull();
  });
  it("never imports/initializes/captures before explicit consent, verification or when disabled", async () => {
    const { a, load, hash, sdk } = harness({ ...config, requireConsent: true });
    a.page("base"); a.setPlayer("9001", 1); a.feature("earn_history_opened"); await settle();
    expect(load).not.toHaveBeenCalled(); expect(hash).not.toHaveBeenCalled();
    a.setPlayer(null, 2); a.setConsent("replay"); await settle();
    expect(load).not.toHaveBeenCalled();
    const off = harness({ ...config, enabled: false }); off.a.setConsent("replay"); off.a.setPlayer("9001", 1); await settle();
    expect(off.load).not.toHaveBeenCalled(); expect(sdk.capture).not.toHaveBeenCalled();
  });
  it("identifies once across StrictMode/repeated bootstrap reads and resets on account/session changes", async () => {
    const { a, sdk, sent } = harness(); a.setConsent("replay"); a.setPlayer("9001", 1); a.page("base"); await settle();
    a.setPlayer("9001", 1); a.page("base"); await settle();
    expect(sdk.init).toHaveBeenCalledOnce(); expect(sdk.identify).toHaveBeenCalledOnce();
    expect(sent.filter(e => e.event === "$pageview")).toHaveLength(1);
    a.setPlayer("9002", 2); expect(a.isReady()).toBe(false); expect(sdk.reset).toHaveBeenCalledWith(true);
    await settle(); expect(sdk.identify).toHaveBeenLastCalledWith("frocal:player:v1:hash-of-9002");
    a.featureFor("9001", 1, "daily_reward_claimed", "old-response");
    expect(sent.filter(e => e.event === "daily_reward_claimed")).toHaveLength(0);
    a.setPlayer(null, 3); a.feature("earn_history_opened"); expect(a.isReady()).toBe(false);
  });
  it("cancels stale SDK loading and hashing after withdrawal/account changes", async () => {
    let finish!: (sdk: PostHog) => void;
    const { sdk } = harness();
    const load = vi.fn(() => new Promise<PostHog>(done => { finish = done; }));
    const a = createAnalytics(config, { load, hash: async id => `hashed-${id}` });
    a.setConsent("replay"); a.setPlayer("9001", 1); await settle();
    a.setConsent("declined"); finish(sdk as unknown as PostHog); await settle();
    expect(sdk.init).not.toHaveBeenCalled(); expect(a.isReady()).toBe(false);
    let finishHash!: (value: string) => void;
    const b = createAnalytics(config, { load, hash: () => new Promise(done => { finishHash = done; }) });
    b.setConsent("analytics"); b.setPlayer("9001", 1); b.setPlayer(null, 2); finishHash("stale"); await settle();
    expect(load).toHaveBeenCalledOnce();
  });
});

describe("default demo replay and consent-required rollout", () => {
  it("defaults new demo players to replay while respecting an existing withdrawal", async () => {
    const { a, load, sdk } = harness();
    expect(a.getConsent()).toBe("replay");
    a.setPlayer("9001", 1);
    await settle();
    expect(load).toHaveBeenCalledWith(true);
    expect(sdk.startSessionRecording).toHaveBeenCalledWith({ sampling: true });
    a.setConsent("declined");
    expect(localStorage.getItem(CONSENT_KEY)).toBe("declined");
    const returning = harness();
    expect(returning.a.getConsent()).toBe("declined");
    returning.a.setPlayer("9001", 1);
    await settle();
    expect(returning.load).not.toHaveBeenCalled();
  });
  it("requires an explicit opt-in when the public consent gate is enabled", async () => {
    const { a, load } = harness({ ...config, requireConsent: true });
    expect(a.getConsent()).toBe("unknown");
    a.setPlayer("9001", 1);
    await settle();
    expect(load).not.toHaveBeenCalled();
    a.setConsent("replay");
    await settle();
    expect(load).toHaveBeenCalledWith(true);
  });
});

describe("consent, replay and data boundary", () => {
  it("persists preferences, starts replay only with replay consent and stops all tracking on withdrawal", async () => {
    const { a, sdk, load, sent, options } = harness();
    a.setConsent("analytics"); a.setPlayer("9001", 1); await settle();
    expect(readConsent()).toBe("analytics"); expect(load).toHaveBeenCalledWith(false);
    expect(sdk.startSessionRecording).not.toHaveBeenCalled();
    a.setConsent("replay"); await settle(); expect(load).toHaveBeenLastCalledWith(true);
    expect(sdk.startSessionRecording).toHaveBeenCalledWith({ sampling: true });
    a.setConsent("declined"); expect(readConsent()).toBe("declined");
    expect(sdk.stopSessionRecording).toHaveBeenCalled(); expect(sdk.opt_out_capturing).toHaveBeenCalled();
    const count = sent.length; a.feature("earn_history_opened"); a.active(30); a.page("profile");
    expect((options().before_send as Function)({ event: "$snapshot", properties: { $snapshot_data: "late" } })).toBeNull();
    expect(sent).toHaveLength(count);
    localStorage.setItem(CONSENT_KEY, "bad-value"); expect(readConsent()).toBe("unknown");
  });
  it("keeps analytics usable when replay is switched off and storage/crypto/SDK fails", async () => {
    const { a, sdk } = harness({ ...config, replay: false }); a.setConsent("replay"); a.setPlayer("9001", 1); await settle();
    expect(sdk.startSessionRecording).not.toHaveBeenCalled(); expect(a.isReady()).toBe(true);
    const broken = createAnalytics(config, { load: async () => { throw new Error("offline"); }, hash: async () => "hashed" });
    broken.setPlayer("9001", 1); await settle(); expect(broken.isReady()).toBe(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("blocked"); });
    a.setConsent("declined"); expect(a.getConsent()).toBe("declined");
  });
  it("records SPA sections and deliberate feature events separately without repeated-render duplicates", async () => {
    const { a, sent } = harness(); a.setConsent("analytics"); a.setPlayer("9001", 1); a.page("base"); await settle();
    for (const page of ["earn", "network", "typing", "clan", "arena", "profile"] as const) { a.page(page); a.page(page); }
    a.feature("daily_reward_claimed", "receipt-1"); a.feature("daily_reward_claimed", "receipt-1");
    a.feature("earn_history_opened"); a.feature("earn_history_opened");
    a.page("base");
    expect(sent.filter(e => e.event === "$pageview").map(e => e.properties.section)).toEqual(["base", "earn", "network", "typing", "clan", "arena", "profile", "base"]);
    expect(sent.filter(e => e.event === "daily_reward_claimed")).toHaveLength(1);
    expect(sent.filter(e => e.event === "earn_history_opened")).toHaveLength(2);
    expect(JSON.stringify(sent)).not.toContain("receipt-1");
  });
  it("tracks the Typing tab and Typing challenge as separate navigation, even with the same section", async () => {
    const { a, sent } = harness(); a.setConsent("analytics"); a.setPlayer("9001", 1); await settle();
    a.page("typing", "/earn"); a.page("typing"); a.page("typing");
    expect(sent.filter(e => e.event === "$pageview").map(e => e.properties.$pathname)).toEqual(["/earn", "/earn/typing"]);
  });
  it("drops PII, launch URLs, auth, arbitrary properties and unsupported automatic events", async () => {
    const { a, options } = harness(); a.setConsent("replay"); a.setPlayer("9001", 1); a.page("network"); await settle();
    const filter = options().before_send as Function;
    const safe = filter({ event: "mission_claimed", properties: { token: "test-token", distinct_id: "hashed", $session_id: "session", section: "network", $current_url: "https://app.test/?token=secret#tgWebAppData=raw", $referrer: "private", $set: { name: "Private Name" }, telegram_id: 9001, Authorization: "tma auth", typed_text: "private" } });
    expect(safe.properties).toEqual({ token: "test-token", distinct_id: "hashed", $session_id: "session", section: "network", $current_url: `${location.origin}/earn`, $pathname: "/earn", $ip: "0.0.0.0", $geoip_disable: true });
    expect(filter({ event: "$autocapture", properties: {} })).toBeNull();
    const envelope = filter({ event: "$identify", properties: { distinct_id: "hashed" }, $set: { name: "private" }, $set_once: { $initial_current_url: "private-token-url" } });
    expect(envelope.$set).toBeUndefined(); expect(envelope.$set_once).toBeUndefined();
    expect(filter({ event: "active_time", properties: { active_seconds: 999, section: "profile" } }).properties.active_seconds).toBe(60);
    const snapshot = filter({ event: "$snapshot", properties: { $snapshot_data: [{ type: 2 }], $snapshot_bytes: 20, $session_id: "session", distinct_id: "hashed", $current_url: "private" } });
    expect(snapshot.properties).toEqual({ $snapshot_data: [{ type: 2 }], $snapshot_bytes: 20, $session_id: "session", distinct_id: "hashed", $ip: "0.0.0.0", $geoip_disable: true });
  });
  it("masks all text/inputs, private UI, attributes and replay URLs; disables network bodies, console and canvas", async () => {
    const { a, options } = harness(); a.setConsent("replay"); a.setPlayer("9001", 1); a.page("clan"); await settle();
    const opts = options();
    expect(opts).toMatchObject({ autocapture: false, capture_pageview: false, capture_pageleave: false, capture_performance: false, enable_recording_console_log: false, disable_external_dependency_loading: true, ip: false });
    const replay = opts.session_recording!;
    expect(replay).toMatchObject({ maskAllInputs: true, maskTextSelector: "*", recordHeaders: false, recordBody: false, captureJsonLd: false });
    expect(replay.maskTextFn!("Private Name")).toBe("******* ****");
    expect(replay.blockSelector).toContain("img"); expect(replay.blockSelector).toContain("[data-ph-sensitive]");
    expect(maskReplayAttribute("href", "https://t.me/+invite-secret")).toBe("");
    expect(maskReplayAttribute("data-player-id", "9001")).toBe("");
    expect(maskReplayAttribute("style", "background: url(https://private/image?token=secret)")).toBe("");
    expect(maskReplayAttribute("style", '--private-person:"PRIVATE_NAME";content:"PRIVATE_NAME";color:var(--PRIVATE_NAME)')).toBe("");
    expect(maskReplayAttribute("style", "opacity:0.5;--tg-stable-height:640px")).toContain("--tg-stable-height:640px");
    expect(maskReplayAttribute("class", "public-layout")).toBe("public-layout");
    expect(replay.maskCapturedNetworkRequestFn!({ name: "https://app.test/#tgWebAppData=secret" } as any)).toEqual({ name: `${location.origin}/clan` });
    expect(replay.maskCapturedNetworkRequestFn!({ name: "https://api.test", requestHeaders: { authorization: "secret" } } as any)).toBeNull();
    expect(replay.canvasCapture!.maskRegionsFn!({} as HTMLCanvasElement)).toBeNull();
  });
});
