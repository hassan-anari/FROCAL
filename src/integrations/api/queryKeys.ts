import type { ScenarioId } from "@/game/scenarios/scenarioStore";

export const queryKeys = {
  bootstrap: (scenario: ScenarioId) => ["bootstrap", scenario] as const,
};
