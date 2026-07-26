import { beforeEach, describe, expect, it } from "vitest";
import { useBaseUiStore } from "./baseUiStore";

describe("Base UI store", () => {
  beforeEach(() => {
    useBaseUiStore.setState({ criticalActionVisible: true });
  });

  it("toggles the critical action card", () => {
    useBaseUiStore.getState().toggleCriticalAction();
    expect(useBaseUiStore.getState().criticalActionVisible).toBe(false);
    useBaseUiStore.getState().toggleCriticalAction();
    expect(useBaseUiStore.getState().criticalActionVisible).toBe(true);
  });
});
