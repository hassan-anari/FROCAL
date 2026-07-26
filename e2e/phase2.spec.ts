import { expect, test } from "@playwright/test";

test.describe("Phase 2.1 Base shell", () => {
  test("bottom navigation is icon-only but remains accessible", async ({ page }) => {
    await page.goto("/base");
    const nav = page.getByRole("navigation", { name: "Primary game navigation" });
    await expect(nav).toBeVisible();
    for (const label of ["Base", "Earn", "Clan", "Arena", "Profile"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(nav.getByText("Base", { exact: true })).toHaveCount(0);
  });

  test("notification drawer opens and closes outside the panel", async ({ page }) => {
    await page.goto("/base");
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await page.getByRole("button", { name: "Close notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toHaveCount(0);
  });

  test("Base contains dynamic action, objective and activity sections", async ({ page }) => {
    await page.goto("/base");
    await expect(page.getByRole("heading", { name: "Defend your clan signal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next Objective" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Since Your Last Visit" })).toBeVisible();
  });

  test("earn route renders the mission control shell", async ({ page }) => {
    await page.goto("/earn");
    await expect(page.getByRole("heading", { name: "Earn momentum." })).toBeVisible();
  });
});
