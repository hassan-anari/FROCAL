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
      criticalActionVisible: true,
      promoBannerVisible: false,
      setCriticalActionVisible: (criticalActionVisible) => set({ criticalActionVisible }),
      toggleCriticalAction: () => set((state) => ({ criticalActionVisible: !state.criticalActionVisible })),
      setPromoBannerVisible: (promoBannerVisible) => set({ promoBannerVisible }),
      togglePromoBanner: () => set((state) => ({ promoBannerVisible: !state.promoBannerVisible })),
    }),
    { name: "dalexio-base-ui" },
  ),
);
