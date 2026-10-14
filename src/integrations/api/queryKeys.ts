import type { ScenarioId } from "@/game/scenarios/scenarioStore";
export interface PlayerScope { session: number; player: string; season: string; config: string }
export const queryKeys = {
  bootstrap: (session: number, source: string, scenario: ScenarioId, runtime: string) => ["bootstrap", session, source, scenario, runtime] as const,
  player: (scope: PlayerScope) => ["player", scope.session, scope.player, scope.season, scope.config] as const,
  profileOverview: (scope: PlayerScope) => [...queryKeys.player(scope), "profile", "overview"] as const,
  notifications: (scope: PlayerScope) => [...queryKeys.player(scope), "notifications", "feed"] as const,
  dlxBalance: (scope: PlayerScope) => [...queryKeys.player(scope), "arena", "dlx", "balance"] as const,
};
