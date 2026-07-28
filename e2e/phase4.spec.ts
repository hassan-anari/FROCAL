import { expect, test } from "@playwright/test";

test("profile overview, achievements and collection are available", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Shape your legacy." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Wallet", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Achievements" }).click();
  await expect(page.getByText("Milestones that matter.")).toBeVisible();
  await expect(page.getByText("First Verified Activity", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Collection" }).click();
  await expect(page.getByText("Your profile inventory.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Frames" })).toBeVisible();
});
