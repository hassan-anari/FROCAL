import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("runs the new-player journey into Base", async ({ page }) => {
  await page.getByRole("button", { name: /Enter Dexo Land/i }).click();
  await expect(page.getByText(/First contact/i)).toBeVisible();

  await page.getByRole("button", { name: /^Begin$/i }).click();
  await expect(page.getByText(/Meet Dexo/i)).toBeVisible();

  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(page.getByText(/Companion acquired/i)).toBeVisible();

  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(page.getByText(/^Play$/i)).toBeVisible();

  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: /^Continue$/i }).click();
  }

  await expect(page.getByText(/Your world is ready/i)).toBeVisible();
  await page.getByRole("button", { name: /Enter Base/i }).click();
  await expect(page.getByText(/Personal Base/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Say hello to Dexo/i })).toBeVisible();
});

test("keeps completed onboarding after refresh", async ({ page }) => {
  await page.goto("/base");
  await page.evaluate(() => {
    localStorage.setItem("dalexio-onboarding-v1", JSON.stringify({
      state: { status: "completed", step: "ready", guideIndex: 3, completedAt: new Date().toISOString() },
      version: 1,
    }));
  });
  await page.reload();
  await expect(page.getByText(/Personal Base/i)).toBeVisible();
});
