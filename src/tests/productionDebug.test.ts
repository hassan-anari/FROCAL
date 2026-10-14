import { afterEach, expect, it, vi } from "vitest";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { useEarnStore } from "@/game/earn/earnStore";
import { useClanStore } from "@/game/clan/clanStore";
import { useArenaWarStore } from "@/game/arena/arenaStore";
import { dataSource } from "@/integrations/api/bootstrap";
import { isArenaDebugVisible } from "@/features/arena/ArenaDebugPanel";

afterEach(() => vi.unstubAllEnvs());
it("production ignores public mock/debug configuration and scenario/Diagnostics mutators", () => {
  const earn = useEarnStore.getState(); const clan = useClanStore.getState();
  const arena = useArenaWarStore.getState(); const scenario = useScenarioStore.getState();
  vi.stubEnv("DEV", false);
  vi.stubEnv("VITE_ENABLE_DEV_PANEL", "true");
  vi.stubEnv("VITE_ENABLE_ARENA_DEBUG", "true");
  for (const source of ["local", "msw"]) {
    vi.stubEnv("VITE_DATA_SOURCE", source);
    expect(dataSource()).toBe("remote");
  }
  expect(isArenaDebugVisible()).toBe(false);
  scenario.setScenario("season-champion");
  earn.setLevelForDiagnostics(30); earn.setNearEvolutionForDiagnostics(); earn.completeStarterPathForDiagnostics();
  clan.acceptCurrentJoinForDiagnostics(); clan.rejectCurrentJoinForDiagnostics();
  clan.setSoldierDiscoveryForDiagnostics(); clan.setSoldierPendingForDiagnostics();
  clan.setSoldierMemberForDiagnostics(); clan.setCaptainHeadquartersForDiagnostics();
  arena.openSeason2Diagnostics(); arena.setExperienceMode("season2"); arena.setScenario("result");
  arena.showAttackForDiagnostics(); arena.showDefenceForDiagnostics(); arena.showResultForDiagnostics();
  arena.showStatusForDiagnostics(); arena.setDebugUnlocked(true);
  expect(useEarnStore.getState()).toBe(earn);
  expect(useClanStore.getState()).toBe(clan);
  expect(useArenaWarStore.getState()).toBe(arena);
  expect(useScenarioStore.getState()).toBe(scenario);
});
