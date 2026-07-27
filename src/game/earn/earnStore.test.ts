import { beforeEach, describe, expect, it } from "vitest";
import { useEarnStore } from "./earnStore";

beforeEach(() => {
  useEarnStore.getState().resetEarnProgress();
});

describe("earn store", () => {
  it("claims the daily core once", () => {
    useEarnStore.getState().claimDaily();
    const first = useEarnStore.getState();
    expect(first.streak).toBe(1);
    expect(first.lifetimeXp).toBe(2_356_294);

    useEarnStore.getState().claimDaily();
    expect(useEarnStore.getState().lifetimeXp).toBe(2_356_294);
  });

  it("completes and claims a mission", () => {
    useEarnStore.getState().completeDailySignal();
    expect(useEarnStore.getState().missions["daily-signal"].status).toBe("completed");
    useEarnStore.getState().claimMission("daily-signal");
    expect(useEarnStore.getState().missions["daily-signal"].status).toBe("claimed");
    expect(useEarnStore.getState().rewardEvent?.xp).toBe(80);
  });

  it("passes the typing protocol at the required accuracy", () => {
    const passed = useEarnStore.getState().recordTypingResult({
      accuracy: 92,
      wpm: 24,
      score: 2208,
      completedAt: new Date().toISOString(),
    });
    expect(passed).toBe(true);
    expect(useEarnStore.getState().missions["typing-protocol"].status).toBe("completed");
  });

  it("creates an evolution event at level five", () => {
    useEarnStore.getState().setNearEvolutionForDiagnostics();
    useEarnStore.getState().completeDailySignal();
    useEarnStore.getState().claimMission("daily-signal");
    expect(useEarnStore.getState().level).toBe(5);
    expect(useEarnStore.getState().levelUpEvent?.evolution).toBe(true);
    expect(useEarnStore.getState().levelUpEvent?.evolutionTitle).toBe("Explorer");
  });
});
