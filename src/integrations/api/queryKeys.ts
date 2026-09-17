import type { ScenarioId } from "@/game/scenarios/scenarioStore";

export const queryKeys = {
  bootstrap: (scenario: ScenarioId) => ["bootstrap", scenario] as const,
  profileOverview: ["profile", "overview"] as const,
  notifications: ["notifications", "feed"] as const,
  dlxBalance: ["arena", "dlx", "balance"] as const,
};
