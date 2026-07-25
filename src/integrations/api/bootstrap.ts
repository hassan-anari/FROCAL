import { bootstrapPayloadSchema, type BootstrapPayload } from "@/game/domain/schemas";
import type { ScenarioId } from "@/game/scenarios/scenarioStore";
import { createBootstrapFixture } from "@/mocks/fixtures/bootstrap";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function loadBootstrap(
  scenario: ScenarioId,
  environment: "browser" | "telegram",
): Promise<BootstrapPayload> {
  const source = import.meta.env.VITE_DATA_SOURCE ?? "local";

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
