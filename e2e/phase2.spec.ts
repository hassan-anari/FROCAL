import { expect, test, type Page } from "@playwright/test";

async function openCompletedGame(page: Page, path = "/base") {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("dalexio-onboarding-v1", JSON.stringify({
      state: { status: "completed", step: "ready", guideIndex: 3, completedAt: new Date().toISOString() },
      version: 1,
    }));
  });
  await page.goto(path);
}

test.describe("Phase 2 game shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("bottom navigation is icon-only but remains accessible", async ({ page }) => {
    await openCompletedGame(page);
    const nav = page.getByRole("navigation", { name: "Primary game navigation" });
    await expect(nav).toBeVisible();
    for (const label of ["Base", "Earn", "Clan", "Arena", "Profile"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(nav.getByText("Base", { exact: true })).toHaveCount(0);
  });

  test("notification drawer opens and closes", async ({ page }) => {
    await openCompletedGame(page);
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await page.getByRole("button", { name: "Close notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toHaveCount(0);
  });

  test("Base contains action, objective and activity systems", async ({ page }) => {
    await openCompletedGame(page);
    await expect(page.getByRole("heading", { name: "Defend your clan signal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next Objective" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Since Your Last Visit" })).toBeVisible();
  });

  test("Earn route renders Mission Control", async ({ page }) => {
    await openCompletedGame(page, "/earn");
    await expect(page.getByRole("heading", { name: "Build your signal." })).toBeVisible();
  });
});
