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

  test("bottom navigation has approved labels and remains accessible", async ({ page }) => {
    await openCompletedGame(page);
    const nav = page.getByRole("navigation", { name: "Primary game navigation" });
    await expect(nav).toBeVisible();
    for (const label of ["Base", "Earn", "Clan", "Arena", "Profile"]) {
      await expect(nav.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(nav.getByText("Base", { exact: true })).toBeVisible();
  });

  test("notification drawer opens and closes", async ({ page }) => {
    await openCompletedGame(page);
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await page.getByRole("button", { name: "Close notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toHaveCount(0);
  });

  test("Base contains actions and objectives without fictional activity", async ({ page }) => {
    await openCompletedGame(page);
    await expect(page.getByRole("heading", { name: "Defend your clan outpost" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Next Objective" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Since Your Last Visit" })).toHaveCount(0);
  });

  test("Earn route renders the approved journey", async ({ page }) => {
    await openCompletedGame(page, "/earn");
    await expect(page.getByRole("heading", { name: "Grow your journey." })).toBeVisible();
  });

  test("explicit development retains Season-badge Diagnostics and scenario fixtures", async ({ page }) => {
    await openCompletedGame(page);
    await page.getByRole("button", { name: "SEASON-1 Season One" }).click({ clickCount: 3 });
    await expect(page.getByRole("heading", { name: "System diagnostics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Role choice · L5" })).toBeVisible();
  });
});
