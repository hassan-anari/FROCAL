import { expect, test } from "@playwright/test";

async function setCompletedOnboarding(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("dalexio-onboarding-v1", JSON.stringify({
      state: { status: "completed", step: "ready", guideIndex: 3, completedAt: new Date().toISOString() },
      version: 1,
    }));
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("runs the new-player journey into Base", async ({ page }) => {
  await page.getByRole("button", { name: /Enter Dexo Land/i }).click();
  await expect(page.getByRole("heading", { name: "Your journey is about to begin." })).toBeVisible();

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
  await expect(page.getByText(/Your Dexo/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Interact with Dexo/i })).toBeVisible();
});

test("keeps completed onboarding after refresh", async ({ page }) => {
  await setCompletedOnboarding(page);
  await page.goto("/base");
  await page.reload();
  await expect(page.getByText(/Your Dexo/i)).toBeVisible();
});

test("keeps Dexo visible through Base reactions", async ({ page }) => {
  await setCompletedOnboarding(page);
  await page.goto("/base");

  const dexoButton = page.getByRole("button", { name: /Interact with Dexo/i });
  await expect(dexoButton).toBeVisible();
  // The approved artwork/button continuously floats. Exercise a physical pointer
  // at its current center instead of requiring the animated target to be stationary.
  const box = await dexoButton.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(dexoButton.getByRole("img", { name: "Dexo level one newborn", exact: true })).toBeVisible();
  await expect(dexoButton).toBeVisible();
});
