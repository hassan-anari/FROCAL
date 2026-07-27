import type { BootstrapPayload } from "@/game/domain/schemas";
import type { ScenarioId } from "@/game/scenarios/scenarioStore";

const basePayload: BootstrapPayload = {
  requestId: "local-bootstrap-001",
  serverTime: new Date().toISOString(),
  environment: "browser",
  season: {
    id: "season-1",
    name: "Season One",
    status: "prelaunch",
  },
  player: {
    id: "demo-player",
    firstName: "Explorer",
    displayName: "Dexo Explorer",
    telegramUsername: null,
    avatarUrl: null,
    level: 1,
    xp: 120,
    xpToNextLevel: 500,
    seasonScore: 0,
    clanId: null,
  },
  dexo: {
    stage: "newborn",
    level: 1,
    mood: "curious",
    unlockedCosmetics: [],
  },
  featureFlags: {
    onboarding: true,
    missions: true,
    clan: false,
    arena: false,
    season: false,
    diagnostics: true,
  },
};

export function createBootstrapFixture(scenario: ScenarioId, environment: "browser" | "telegram"): BootstrapPayload {
  const fixture = structuredClone(basePayload);
  fixture.environment = environment;
  fixture.requestId = `local-${scenario}-${Date.now()}`;
  fixture.serverTime = new Date().toISOString();

  if (scenario === "active-player") {
    fixture.player.level = 12;
    fixture.player.xp = 4_820;
    fixture.player.xpToNextLevel = 5_500;
    fixture.player.seasonScore = 8_420;
    fixture.dexo.stage = "connector";
    fixture.dexo.level = 12;
    fixture.dexo.mood = "happy";
  }

  if (scenario === "level-20" || scenario === "clan-member" || scenario === "clan-captain") {
    fixture.player.level = 20;
    fixture.player.xp = 11_250;
    fixture.player.xpToNextLevel = 13_000;
    fixture.player.seasonScore = 22_700;
    fixture.dexo.stage = "vanguard";
    fixture.dexo.level = 20;
    fixture.dexo.mood = "focused";
  }

  if (scenario === "clan-member" || scenario === "clan-captain") {
    fixture.player.clanId = "clan-aurora";
    fixture.featureFlags.clan = true;
  }

  if (scenario === "battle-ready") {
    fixture.player.level = 26;
    fixture.player.clanId = "clan-aurora";
    fixture.player.seasonScore = 41_800;
    fixture.dexo.stage = "vanguard";
    fixture.dexo.level = 26;
    fixture.featureFlags.clan = true;
    fixture.featureFlags.arena = true;
  }

  if (scenario === "season-champion") {
    fixture.player.level = 38;
    fixture.player.clanId = "clan-aurora";
    fixture.player.seasonScore = 184_300;
    fixture.dexo.stage = "legend";
    fixture.dexo.level = 38;
    fixture.dexo.mood = "victory";
    fixture.featureFlags.clan = true;
    fixture.featureFlags.arena = true;
    fixture.featureFlags.season = true;
  }

  if (scenario === "maintenance") {
    fixture.season.status = "maintenance";
  }

  return fixture;
}
