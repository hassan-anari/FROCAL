import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OnboardingStep = "welcome" | "meet" | "acquired" | "guide" | "ready";
export type OnboardingStatus = "not-started" | "in-progress" | "dexo-acquired" | "completed";

const stepOrder: OnboardingStep[] = ["welcome", "meet", "acquired", "guide", "ready"];

interface OnboardingState {
  status: OnboardingStatus;
  step: OnboardingStep;
  guideIndex: number;
  completedAt: string | null;
  start: () => void;
  next: () => void;
  previous: () => void;
  setGuideIndex: (index: number) => void;
  markAcquired: () => void;
  complete: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      status: "not-started",
      step: "welcome",
      guideIndex: 0,
      completedAt: null,
      start: () => {
        if (get().status === "completed") return;
        set({ status: "in-progress", step: "welcome", guideIndex: 0 });
      },
      next: () => {
        const state = get();
        const index = stepOrder.indexOf(state.step);
        const nextStep = stepOrder[Math.min(index + 1, stepOrder.length - 1)];
        set({ step: nextStep, status: nextStep === "acquired" ? "dexo-acquired" : state.status });
      },
      previous: () => {
        const state = get();
        const index = stepOrder.indexOf(state.step);
        if (state.step === "guide" && state.guideIndex > 0) {
          set({ guideIndex: state.guideIndex - 1 });
          return;
        }
        const previousStep = stepOrder[Math.max(index - 1, 0)];
        set({ step: previousStep });
      },
      setGuideIndex: (guideIndex) => set({ guideIndex: Math.max(0, Math.min(3, guideIndex)) }),
      markAcquired: () => set({ status: "dexo-acquired", step: "acquired" }),
      complete: () => set({ status: "completed", step: "ready", guideIndex: 3, completedAt: new Date().toISOString() }),
      reset: () => set({ status: "not-started", step: "welcome", guideIndex: 0, completedAt: null }),
    }),
    {
      name: "dalexio-onboarding-v1",
      version: 1,
      partialize: ({ status, step, guideIndex, completedAt }) => ({ status, step, guideIndex, completedAt }),
    },
  ),
);

export const onboardingStepOrder = stepOrder;
