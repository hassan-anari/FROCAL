import { beforeEach, describe, expect, it } from "vitest";
import { useBaseUiStore } from "./baseUiStore";

describe("Base UI store", () => {
  beforeEach(() => {
    useBaseUiStore.setState({ criticalActionVisible: false, promoBannerVisible: false });
  });

  it("cannot enable Season 2 critical action in Season 1", () => {
    useBaseUiStore.getState().toggleCriticalAction();
    expect(useBaseUiStore.getState().criticalActionVisible).toBe(false);
    useBaseUiStore.getState().toggleCriticalAction();
    expect(useBaseUiStore.getState().criticalActionVisible).toBe(false);
  });

  it("keeps the Base promo banner disabled by default and toggles it on demand", () => {
    expect(useBaseUiStore.getState().promoBannerVisible).toBe(false);
    useBaseUiStore.getState().togglePromoBanner();
    expect(useBaseUiStore.getState().promoBannerVisible).toBe(true);
    useBaseUiStore.getState().togglePromoBanner();
    expect(useBaseUiStore.getState().promoBannerVisible).toBe(false);
  });
});

it("rejects previously persisted Season 2 visibility on deployment upgrades", async () => {
  localStorage.setItem("dalexio-base-ui", JSON.stringify({ state: { criticalActionVisible: true }, version: 0 }));
  await useBaseUiStore.persist.rehydrate();
  expect(useBaseUiStore.getState().criticalActionVisible).toBe(false);
  useBaseUiStore.getState().setCriticalActionVisible(true);
  expect(useBaseUiStore.getState().criticalActionVisible).toBe(false);
});
