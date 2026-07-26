import { beforeEach, describe, expect, it } from "vitest";
import { useBaseUiStore } from "./baseUiStore";

describe("Base UI store", () => {
  beforeEach(() => {
    useBaseUiStore.setState({ criticalActionVisible: true, promoBannerVisible: false });
  });

  it("toggles the critical action card", () => {
    useBaseUiStore.getState().toggleCriticalAction();
    expect(useBaseUiStore.getState().criticalActionVisible).toBe(false);
    useBaseUiStore.getState().toggleCriticalAction();
    expect(useBaseUiStore.getState().criticalActionVisible).toBe(true);
  });

  it("keeps the Base promo banner disabled by default and toggles it on demand", () => {
    expect(useBaseUiStore.getState().promoBannerVisible).toBe(false);
    useBaseUiStore.getState().togglePromoBanner();
    expect(useBaseUiStore.getState().promoBannerVisible).toBe(true);
    useBaseUiStore.getState().togglePromoBanner();
    expect(useBaseUiStore.getState().promoBannerVisible).toBe(false);
  });
});
