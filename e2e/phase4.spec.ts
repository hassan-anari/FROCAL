import { expect, test } from "@playwright/test";

test("profile overview, achievements and collection are available", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Shape your legacy." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Wallet", { exact: true })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Connect" })).toHaveCount(0);

  await page.getByRole("button", { name: "Achievements" }).click();
  await expect(page.getByText("Milestones that matter.")).toBeVisible();
  await expect(page.getByText("First Verified Activity", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Collection" }).click();
  await expect(page.getByText("Your profile inventory.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Frames" })).toBeVisible();
});

test("profile detail modal is viewport fixed and owns its scrolling", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Achievements" }).click();
  await page.locator("[data-game-scroll]").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await page.getByText("First Referral", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "First Referral" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Got it" })).toBeVisible();
  await expect(page.locator("#root")).toHaveAttribute("inert", "");

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport?.height ?? 0);

  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
});
