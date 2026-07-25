import { expect, test } from "@playwright/test";

test("boots the portrait-first Dexo Land foundation stage", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dexo Land/i })).toBeVisible();
  await expect(page.getByText(/world core is ready/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Verify foundation/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open diagnostics/i })).toHaveCount(0);
});

test("keeps the product canvas mobile-sized in a desktop browser", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const stage = page.locator("main");
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(460);
});

test("verifies phase zero without leaving the product shell", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Verify foundation/i }).click();
  await expect(page.getByRole("status")).toContainText(/Phase 1 can now build/i);
});

test("opens the compact diagnostics route directly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/diagnostics");
  await expect(page.getByRole("heading", { name: /Foundation diagnostics/i })).toBeVisible();
  await expect(page.getByText(/Portrait-first product canvas/i)).toBeVisible();
});
