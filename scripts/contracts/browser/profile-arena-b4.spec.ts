import { expect, test, type Page } from "@playwright/test";
const api = "http://127.0.0.1:8792";
async function control(body: object) {
  const response = await fetch(`${api}/__b2_test__`, { method: "POST", body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Isolated control failed");
  return response.json();
}
async function enter(page: Page, identity: { player: string; initData: string }, path: string) {
  await page.addInitScript(player => localStorage.setItem(`dalexio-onboarding-v1:player:${player}`, JSON.stringify({ version: 1, state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-01-01T00:00:00Z" } })), identity.player);
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await page.goto(`${path}#tgWebAppData=${encodeURIComponent(identity.initData)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
}
test("real Profile save persists across credentials and real current-season Arena standing uses server ranking", async ({ page }) => {
  test.setTimeout(60_000);
  const actor = await control({ action: "player", points: 270 });
  await control({ action: "b4-rebuild-rankings" });
  await enter(page, actor, "/profile");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Customize profile" })).toBeVisible();
  const saved = page.waitForResponse(response => response.url().includes("/profile/customization") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole("dialog", { name: "Customize profile" })).toHaveCount(0);
  const credentials = await control({ action: "credentials", player: actor.player });
  await page.goto(`/profile#tgWebAppData=${encodeURIComponent(credentials.initData)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
  await page.reload();
  await expect(page.getByRole("button", { name: "Customize", exact: true })).toBeEnabled();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Arena", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unlocks in Season 2", exact: true })).toBeDisabled();
  const ranked = page.waitForResponse(response => response.url().includes("/arena/rankings/players") && response.ok());
  await page.getByRole("button", { name: "Rankings", exact: true }).click();
  const data = await (await ranked).json();
  await expect(page.getByText("You", { exact: true })).toBeVisible();
  const standing = page.getByText("You", { exact: true }).locator("../..");
  await expect(standing).toContainText(`#${data.own_standing.rank}`);
  await expect(standing).toContainText("270");
  expect((await control({ action: "inspect", player: actor.player })).lifetime).toBe(270);
});
test("the sole Notification Center navigates a real canonical link and marks unloaded rows read", async ({ page }) => {
  const actor = await control({ action: "player", points: 0 });
  await control({ action: "b4-notifications", player: actor.player, count: 23 });
  await enter(page, actor, "/profile");
  await page.getByRole("button", { name: "Open notifications", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toHaveCount(1);
  const updated = page.waitForResponse(response => response.url().endsWith("/notifications/read-all"));
  await page.getByRole("button", { name: "Mark all read", exact: true }).click();
  expect(await (await updated).json()).toMatchObject({ updated_count: 23, unread_count: 0 });
  await expect(page.getByRole("button", { name: "Mark all read", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Clan update 22/ }).click();
  await expect(page).toHaveURL(/\/clan/);
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toHaveCount(0);
});
