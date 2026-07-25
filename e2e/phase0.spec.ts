import { expect, test } from "@playwright/test";

test("boots the Dexo Land foundation stage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dexo Land/i })).toBeVisible();
  await expect(page.getByText(/Foundation online/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Initialize world/i })).toBeVisible();
});

test("opens diagnostics route", async ({ page }) => {
  await page.goto("/diagnostics");
  await expect(page.getByRole("heading", { name: /System diagnostics/i })).toBeVisible();
});
