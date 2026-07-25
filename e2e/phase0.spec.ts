import { expect, test } from "@playwright/test";

test("boots the polished Dexo Land intro", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dexo Land/i })).toBeVisible();
  await expect(page.getByText(/every mission shapes your Dexo/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Enter Dexo Land/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open diagnostics/i })).toBeVisible();
});

test("keeps the product canvas mobile-sized in a desktop browser", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const stage = page.locator("main");
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(440);
});

test("opens diagnostics from the global Hugeicons control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Open diagnostics/i }).click();
  await expect(page.getByRole("heading", { name: /Foundation diagnostics/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Back to Dexo Land/i })).toBeVisible();
});

test("returns from diagnostics using the global control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/diagnostics");
  await page.getByRole("button", { name: /Back to Dexo Land/i }).click();
  await expect(page.getByRole("heading", { name: /Dexo Land/i })).toBeVisible();
});
