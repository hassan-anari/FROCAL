import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("keeps broadcast and manual verification controls out of the Mini App", () => {
  const page = readFileSync("src/pages/EarnPage.tsx", "utf8");
  const hook = readFileSync("src/integrations/api/useB3.ts", "utf8");
  expect(page).not.toMatch(/Enable broadcasts|Revoke broadcast consent|Check status|broadcastGroup/);
  expect(hook).not.toMatch(/broadcast-consent|\/reverify/);
  expect(page).toContain("startgroup_url");
});
