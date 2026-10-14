import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { DexoStage } from "@/design-system/components/DexoStage";
import { getAssetPath } from "@/assets/registry";

it("updates the progression asset during an active personality reaction without restarting the float container", () => {
  const { container, rerender } = render(<DexoStage character="dexo.level01" effect="base" baseCharacter="dexo.level01" />);
  const float = container.querySelector('[class*="characterFloat"]');
  rerender(<DexoStage character="dexo.personalityHappy" effect="base" baseCharacter="dexo.level05" baseCharacterScale={1.09} />);
  expect(container.querySelector('[class*="characterFloat"]')).toBe(float);
  expect(container.querySelector(`img[src="${getAssetPath("dexo.level05")}"]`)).not.toBeNull();
});
