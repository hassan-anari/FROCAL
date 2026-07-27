import { expect, test } from "@playwright/test";

test("boots the approved Dexo Land intro", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dexo Land/i })).toBeVisible();
  await expect(page.getByText(/every mission shapes your Dexo/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Enter Dexo Land/i })).toBeVisible();
});

test("keeps the product canvas mobile-sized in a desktop browser", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const stage = page.locator("main");
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(460);
});
