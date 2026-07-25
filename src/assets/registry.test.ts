import { describe, expect, it } from "vitest";
import { assetRegistry, getAsset, listAssetsForPhase } from "./registry";

describe("asset registry", () => {
  it("contains unique keys", () => {
    const keys = assetRegistry.assets.map((asset) => asset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("resolves Phase 0 assets", () => {
    expect(getAsset("brand.logo").path).toBe("/assets/brand/dalexio-logo.svg");
    expect(listAssetsForPhase(0).length).toBeGreaterThanOrEqual(4);
  });
});
