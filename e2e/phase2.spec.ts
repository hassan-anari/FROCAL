import { expect, test } from "@playwright/test";

test.describe("Phase 2 app shell", () => {
  test("bottom navigation exposes all primary destinations", async ({ page }) => {
    await page.goto("/base");
    const nav = page.getByRole("navigation", { name: "Primary game navigation" });
    await expect(nav).toBeVisible();
    for (const label of ["Base", "Earn", "Clan", "Arena", "Profile"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("earn route renders the mission control shell", async ({ page }) => {
    await page.goto("/earn");
    await expect(page.getByRole("heading", { name: "Earn momentum." })).toBeVisible();
  });
});
