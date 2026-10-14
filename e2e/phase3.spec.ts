import { expect, test, type Page } from "@playwright/test";

async function openEarn(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dalexio-onboarding-v1", JSON.stringify({
      state: { status: "completed", step: "ready", guideIndex: 3, completedAt: new Date().toISOString() },
      version: 1,
    }));
  });
  await page.goto("/earn");
}

test.describe("Phase 3.1 Earn Center", () => {
  test("claims the Daily Core and opens the reward reveal", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /Claim daily core/i }).click();
    await expect(page.getByText("REWARD ACQUIRED")).toBeVisible();
    await expect(page.getByRole("heading", { name: "+40 XP" })).toBeVisible();
  });

  test("separates active and completed missions", async ({ page }) => {
    await openEarn(page);
    await expect(page.getByRole("heading", { name: /Active Missions/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Completed Missions/i })).toBeVisible();
  });

  test("opens Network and Typing tabs", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: "Network" }).click();
    await expect(page.getByRole("heading", { name: /Grow with people and groups/i })).toBeVisible();
    await page.getByRole("navigation", { name: "Earn sections" }).getByRole("button", { name: "Typing", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Typing Arena", exact: true })).toBeVisible();
  });

  test("opens the permanent Typing Arena", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("navigation", { name: "Earn sections" }).getByRole("button", { name: "Typing", exact: true }).click();
    await page.getByRole("button", { name: /Enter Typing Arena/i }).click();
    await expect(page.getByRole("heading", { name: /Type with intent/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Typing challenge input/i })).toBeVisible();
  });

  test("opens the shared activity history", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /History/i }).click();
    await expect(page.getByRole("heading", { name: /Your recent progress/i })).toBeVisible();
  });
});
