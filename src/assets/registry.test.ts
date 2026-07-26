import { describe, expect, it } from "vitest";
import { assetRegistry, getAsset, listAssetsForPhase } from "./registry";

describe("asset registry", () => {
  it("contains unique keys", () => {
    const keys = assetRegistry.assets.map((asset) => asset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps repository-maintained Phase 0 paths", () => {
    expect(getAsset("brand.logo").path).toBe("/assets/brand/dalexio-logo.svg");
    expect(getAsset("world.foundationBackdrop").path).toBe("/assets/world/dexo-land-foundation.webp");
  });

  it("maps the supplied Phase 1 Dexo pack", () => {
    expect(getAsset("dexo.base").path).toBe("/assets/dexo/dexo-base-companion.webp");
    expect(getAsset("dexo.platform").path).toBe("/assets/dexo/dexo-place.webp");
    expect(listAssetsForPhase(1).length).toBeGreaterThanOrEqual(14);
  });
});
