import { beforeEach, describe, expect, it } from "vitest";
import { useScenarioStore } from "./scenarioStore";

describe("scenario store", () => {
  beforeEach(() => {
    useScenarioStore.setState({ activeScenario: "new-user" });
  });

  it("switches mock scenarios", () => {
    useScenarioStore.getState().setScenario("battle-ready");
    expect(useScenarioStore.getState().activeScenario).toBe("battle-ready");
  });
});
