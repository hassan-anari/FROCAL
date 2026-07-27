import { beforeEach, describe, expect, it } from "vitest";
import { TYPING_DAILY_LIMIT, getTypingAttemptsRemaining, useEarnStore } from "./earnStore";

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

  it("starts, verifies and claims an external mission", () => {
    useEarnStore.getState().startMission("visit-dalexio");
    expect(useEarnStore.getState().missions["visit-dalexio"].status).toBe("in-progress");
    useEarnStore.getState().completeMission("visit-dalexio");
    expect(useEarnStore.getState().missions["visit-dalexio"].status).toBe("completed");
    useEarnStore.getState().claimMission("visit-dalexio");
    expect(useEarnStore.getState().missions["visit-dalexio"].status).toBe("claimed");
    expect(useEarnStore.getState().rewardEvent?.xp).toBe(60);
  });

  it("records Typing Arena runs and enforces the five-play daily limit", () => {
    for (let index = 0; index < TYPING_DAILY_LIMIT; index += 1) {
      useEarnStore.getState().recordTypingResult({
        accuracy: 92,
        wpm: 24,
        score: 2208 + index,
        completedAt: new Date().toISOString(),
      });
    }
    const state = useEarnStore.getState();
    expect(state.typingAttempts).toHaveLength(5);
    expect(getTypingAttemptsRemaining(state.typingAttemptDate, state.typingAttempts)).toBe(0);
    expect(state.missions["typing-session"].status).toBe("completed");

    useEarnStore.getState().recordTypingResult({
      accuracy: 99,
      wpm: 40,
      score: 3960,
      completedAt: new Date().toISOString(),
    });
    expect(useEarnStore.getState().typingAttempts).toHaveLength(5);
  });

  it("tracks verified referrals and active groups", () => {
    const before = useEarnStore.getState();
    useEarnStore.getState().verifyReferral();
    useEarnStore.getState().verifyGroup();
    const after = useEarnStore.getState();
    expect(after.verifiedReferrals).toBe(before.verifiedReferrals + 1);
    expect(after.activeGroups).toBe(before.activeGroups + 1);
  });

  it("creates an evolution event at level five", () => {
    useEarnStore.getState().setNearEvolutionForDiagnostics();
    useEarnStore.getState().startMission("visit-dalexio");
    useEarnStore.getState().completeMission("visit-dalexio");
    useEarnStore.getState().claimMission("visit-dalexio");
    expect(useEarnStore.getState().level).toBe(5);
    expect(useEarnStore.getState().levelUpEvent?.evolution).toBe(true);
    expect(useEarnStore.getState().levelUpEvent?.evolutionTitle).toBe("Explorer");
  });
});
