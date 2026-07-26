import { beforeEach, describe, expect, it } from "vitest";
import { useOnboardingStore } from "./onboardingStore";

describe("onboarding store", () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.getState().reset();
  });

  it("starts a new journey", () => {
    useOnboardingStore.getState().start();
    expect(useOnboardingStore.getState().status).toBe("in-progress");
    expect(useOnboardingStore.getState().step).toBe("welcome");
  });

  it("marks Dexo as acquired and completes onboarding", () => {
    useOnboardingStore.getState().markAcquired();
    expect(useOnboardingStore.getState().status).toBe("dexo-acquired");
    useOnboardingStore.getState().complete();
    expect(useOnboardingStore.getState().status).toBe("completed");
    expect(useOnboardingStore.getState().completedAt).not.toBeNull();
  });
});
