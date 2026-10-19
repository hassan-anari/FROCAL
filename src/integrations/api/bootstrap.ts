import { bootstrapPayloadSchema, type BootstrapPayload } from "@/game/domain/schemas";
import type { ScenarioId } from "@/game/scenarios/scenarioStore";
import { apiRequest, ApiError } from "./client";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export { remoteBootstrapSchema, type RemoteBootstrap } from "./bootstrapContract";
import { remoteBootstrapSchema, profilePhotoUrl, type RemoteBootstrap } from "./bootstrapContract";

function mapSeasonStatus(status: string): "prelaunch" | "live" | "ended" | "maintenance" {
  if (status === "ACTIVE") return "live";
  if (status === "CLOSED" || status === "ARCHIVED") return "ended";
  return "prelaunch";
}

function mapMood(level: number): "curious" | "happy" | "focused" | "victory" {
  if (level >= 30) return "victory";
  if (level >= 20) return "focused";
  if (level >= 5) return "happy";
  return "curious";
}

export function mapRemoteBootstrap(
  payload: RemoteBootstrap,
  environment: "browser" | "telegram",
  requestId: string | null,
  serverDate: string | null,
): BootstrapPayload {
  const displayName = [payload.player.first_name, payload.player.last_name].filter(Boolean).join(" ").trim();
  const season = payload.season;
  const levelProgress = payload.progression.points_into_level;
  const levelTarget =
    payload.progression.points_remaining === null
      ? Math.max(levelProgress, 1)
      : Math.max(levelProgress + payload.progression.points_remaining, 1);
  const parsedServerDate = new Date(payload.server_time ?? serverDate ?? Date.now());
  const serverTime = Number.isNaN(parsedServerDate.getTime())
    ? new Date().toISOString()
    : parsedServerDate.toISOString();

  return bootstrapPayloadSchema.parse({
    requestId: payload.request_id ?? requestId ?? `remote-bootstrap-${Date.now()}`,
    serverTime,
    clockReceivedAt: performance.now(),
    environment,
    remote: payload,
    season: season
      ? {
          id: season.code,
          name: season.title,
          status: mapSeasonStatus(season.status),
        }
      : {
          id: "no-active-season",
          name: "Season unavailable",
          status: "prelaunch",
        },
    player: {
      id: payload.player.id ?? String(payload.player.telegram_user_id),
      languageCode: payload.player.language_code,
      firstName: payload.player.first_name || payload.player.username || "Explorer",
      displayName: displayName || payload.player.username || "Dexo Explorer",
      telegramUsername: payload.player.username || null,
      avatarUrl: profilePhotoUrl(payload.player.photo_url),
      level: payload.progression.level,
      xp: levelProgress,
      xpToNextLevel: levelTarget,
      lifetimeXp: payload.progression.lifetime_points,
      seasonScore: season?.season_points ?? 0,
      clanId: null,
    },
    dexo: {
      stage: payload.progression.dexo_stage,
      level: payload.progression.level,
      mood: mapMood(payload.progression.level),
      unlockedCosmetics: [],
    },
    featureFlags: {
      onboarding: true,
      daily: payload.daily !== null,
      missions: payload.missions !== null,
      typing: payload.typing !== null,
      referral: payload.referral !== null,
      network: payload.network !== null,
      // Legacy-only fallbacks; explicit server false must always survive.
      clan: payload.config.progression?.clan_min_level === null ? false
        : payload.progression.level >= (payload.config.progression?.clan_min_level ?? 5),
      arena: season !== null,
      base_tap: season !== null,
      profile: true,
      season: season !== null,
      ...payload.features,
      diagnostics: import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_PANEL === "true",
    },
  });
}

export function dataSource(): "local" | "msw" | "remote" {
  if (!import.meta.env.DEV) return "remote";
  const configured = import.meta.env.VITE_DATA_SOURCE;
  if (configured === "local" || configured === "msw") return configured;
  return configured === undefined && import.meta.env.DEV ? "local" : "remote";

}

export function isRemoteDataSource(): boolean {
  return dataSource() === "remote";
}

export async function loadBootstrap(
  scenario: ScenarioId,
  environment: "browser" | "telegram",
  initData?: string | null,
  signal?: AbortSignal,
): Promise<BootstrapPayload> {
  const source = dataSource();

  if (source === "remote") {
    const response = await apiRequest("/bootstrap", { initData, signal });
    let payload: RemoteBootstrap;
    try { payload = remoteBootstrapSchema.parse(await response.json()); }
    catch { throw new ApiError(response.status, "RESPONSE_INVALID", response.headers.get("X-Request-ID")); }
    return mapRemoteBootstrap(
      payload,
      environment,
      response.headers.get("X-Request-ID"),
      response.headers.get("Date"),
    );
  }

  if (source === "msw") {
    const response = await fetch(`/api/bootstrap?scenario=${encodeURIComponent(scenario)}`);
    if (!response.ok) {
      throw new Error(`Bootstrap request failed with ${response.status}`);
    }
    return bootstrapPayloadSchema.parse(await response.json());
  }

  if (import.meta.env.DEV) {
    await sleep(320);
    if (scenario === "error-state") {
      throw new Error("Simulated Phase 0 bootstrap failure");
    }
    const { createBootstrapFixture } = await import("@/mocks/fixtures/bootstrap");
    return bootstrapPayloadSchema.parse(createBootstrapFixture(scenario, environment));
  }
  throw new Error("Development fixtures are unavailable in production.");
}
