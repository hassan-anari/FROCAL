import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BaseUiState {
  criticalActionVisible: boolean;
  promoBannerVisible: boolean;
  setCriticalActionVisible: (visible: boolean) => void;
  toggleCriticalAction: () => void;
  setPromoBannerVisible: (visible: boolean) => void;
  togglePromoBanner: () => void;
}

export const useBaseUiStore = create<BaseUiState>()(
  persist(
    (set) => ({
      criticalActionVisible: false,
      promoBannerVisible: false,
      setCriticalActionVisible: () => set({ criticalActionVisible: false }),
      toggleCriticalAction: () => set({ criticalActionVisible: false }),
      setPromoBannerVisible: (promoBannerVisible) => set({ promoBannerVisible }),
      togglePromoBanner: () => set((state) => ({ promoBannerVisible: !state.promoBannerVisible })),
    }),
    { name: "dalexio-base-ui", merge: (persisted, current) => ({ ...current, ...(persisted as Partial<BaseUiState>), criticalActionVisible: false }) },
  ),
);
