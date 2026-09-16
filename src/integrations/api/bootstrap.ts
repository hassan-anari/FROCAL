import { z } from "zod";
import { bootstrapPayloadSchema, type BootstrapPayload } from "@/game/domain/schemas";
import type { ScenarioId } from "@/game/scenarios/scenarioStore";
import { createBootstrapFixture } from "@/mocks/fixtures/bootstrap";
import { apiRequest } from "./client";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const dexoStageSchema = z.enum([
  "newborn",
  "explorer",
  "connector",
  "specialist",
  "vanguard",
  "legend",
]);

const remoteBootstrapSchema = z.object({
  player: z.object({
    telegram_user_id: z.number().int(),
    first_name: z.string(),
    last_name: z.string(),
    username: z.string(),
  }),
  progression: z.object({
    lifetime_points: z.number().int().nonnegative(),
    level: z.number().int().positive(),
    current_threshold: z.number().int().nonnegative(),
    next_threshold: z.number().int().positive().nullable(),
    points_into_level: z.number().int().nonnegative(),
    points_remaining: z.number().int().nonnegative().nullable(),
    dexo_stage: dexoStageSchema,
  }),
  season: z
    .object({
      code: z.string(),
      title: z.string(),
      status: z.string(),
      starts_at: z.string(),
      ends_at: z.string(),
      season_points: z.number().int().nonnegative(),
    })
    .nullable(),
  config: z.object({
    version: z.string(),
    effective_at: z.string(),
  }),
  daily: z.unknown().nullable(),
  typing: z.unknown().nullable(),
  missions: z.unknown().nullable(),
  referral: z.unknown().nullable(),
  network: z.unknown().nullable(),
});

type RemoteBootstrap = z.infer<typeof remoteBootstrapSchema>;

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

function mapRemoteBootstrap(
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
  const parsedServerDate = serverDate ? new Date(serverDate) : new Date();
  const serverTime = Number.isNaN(parsedServerDate.getTime())
    ? new Date().toISOString()
    : parsedServerDate.toISOString();

  return bootstrapPayloadSchema.parse({
    requestId: requestId || `remote-bootstrap-${Date.now()}`,
    serverTime,
    environment,
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
      id: String(payload.player.telegram_user_id),
      firstName: payload.player.first_name || payload.player.username || "Explorer",
      displayName: displayName || payload.player.username || "Dexo Explorer",
      telegramUsername: payload.player.username || null,
      avatarUrl: null,
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
      clan: payload.progression.level >= 5,
      arena: false,
      season: season !== null,
      diagnostics: import.meta.env.VITE_ENABLE_DEV_PANEL === "true",
    },
  });
}

function dataSource(): "local" | "msw" | "remote" {
  return import.meta.env.VITE_DATA_SOURCE ?? (import.meta.env.PROD ? "remote" : "local");
}

export function isRemoteDataSource(): boolean {
  return dataSource() === "remote";
}

export async function loadBootstrap(
  scenario: ScenarioId,
  environment: "browser" | "telegram",
  initData: string | null = null,
): Promise<BootstrapPayload> {
  const source = dataSource();

  if (source === "remote") {
    const response = await apiRequest("/bootstrap", { initData });
    const payload = remoteBootstrapSchema.parse(await response.json());
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

  await sleep(320);
  if (scenario === "error-state") {
    throw new Error("Simulated Phase 0 bootstrap failure");
  }
  return bootstrapPayloadSchema.parse(createBootstrapFixture(scenario, environment));
}
