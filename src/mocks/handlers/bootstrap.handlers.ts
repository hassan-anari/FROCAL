import { delay, http, HttpResponse } from "msw";
import { createBootstrapFixture } from "@/mocks/fixtures/bootstrap";
import { scenarioOptions, type ScenarioId } from "@/game/scenarios/scenarioStore";

export const bootstrapHandlers = [
  http.get("/api/bootstrap", async ({ request }) => {
    await delay(280);
    const url = new URL(request.url);
    const requestedScenario = url.searchParams.get("scenario") ?? "new-user";
    const scenario: ScenarioId = scenarioOptions.some((item) => item.id === requestedScenario)
      ? (requestedScenario as ScenarioId)
      : "new-user";

    if (scenario === "error-state") {
      return HttpResponse.json({ message: "Simulated bootstrap failure" }, { status: 503 });
    }

    return HttpResponse.json(createBootstrapFixture(scenario, "browser"));
  }),
  http.get("/api/health", () => HttpResponse.json({ status: "ok", phase: 1 })),
];
