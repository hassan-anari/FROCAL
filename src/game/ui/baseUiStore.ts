import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BaseUiState {
  criticalActionVisible: boolean;
  setCriticalActionVisible: (visible: boolean) => void;
  toggleCriticalAction: () => void;
}

export const useBaseUiStore = create<BaseUiState>()(
  persist(
    (set) => ({
      criticalActionVisible: true,
      setCriticalActionVisible: (criticalActionVisible) => set({ criticalActionVisible }),
      toggleCriticalAction: () => set((state) => ({ criticalActionVisible: !state.criticalActionVisible })),
    }),
    { name: "dalexio-base-ui" },
  ),
);
