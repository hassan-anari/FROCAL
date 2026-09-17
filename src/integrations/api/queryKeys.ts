import type { ScenarioId } from "@/game/scenarios/scenarioStore";

export const queryKeys = {
  bootstrap: (scenario: ScenarioId) => ["bootstrap", scenario] as const,
  profileOverview: ["profile", "overview"] as const,
  notifications: ["notifications"] as const,
  missions: ["missions"] as const,
  daily: ["daily"] as const,
  rewardHistory: ["rewards", "history"] as const,
  clanState: ["clans", "state"] as const,
  dlxBalance: ["arena", "dlx", "balance"] as const,
};
