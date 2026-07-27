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

test.describe("Phase 3 Earn loop", () => {
  test("claims the Daily Core and opens the reward reveal", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /Claim daily core/i }).click();
    await expect(page.getByText("REWARD ACQUIRED")).toBeVisible();
    await expect(page.getByRole("heading", { name: "+40 XP" })).toBeVisible();
  });

  test("completes the Daily Signal and makes its reward claimable", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /Start mission/i }).click();
    await page.getByRole("button", { name: /Stabilize signal/i }).click();
    await expect(page.getByRole("button", { name: /Claim 80 XP/i })).toBeVisible({ timeout: 5_000 });
  });

  test("opens the Typing Protocol as a focused challenge", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /Start challenge/i }).click();
    await expect(page.getByRole("heading", { name: /Type with intent/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Typing challenge input/i })).toBeVisible();
  });

  test("opens referral and mission history sheets", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /Invite explorer/i }).click();
    await expect(page.getByRole("heading", { name: /Invite an Explorer/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /History/i }).click();
    await expect(page.getByRole("heading", { name: /Your recent progress/i })).toBeVisible();
  });
});
