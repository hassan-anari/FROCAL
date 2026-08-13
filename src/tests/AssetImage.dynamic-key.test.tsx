import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssetImage } from "@/design-system/components/AssetImage";

describe("AssetImage dynamic asset keys", () => {
  it("updates src immediately when assetKey changes", () => {
    const { rerender } = render(
      <AssetImage assetKey="profile.frame.standard" data-testid="asset" />,
    );

    const image = screen.getByTestId("asset") as HTMLImageElement;
    const firstSrc = image.getAttribute("src");

    rerender(
      <AssetImage assetKey="profile.frame.premium" data-testid="asset" />,
    );

    expect(image.getAttribute("src")).not.toBe(firstSrc);
  });
});
