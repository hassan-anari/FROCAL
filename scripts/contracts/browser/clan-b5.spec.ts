import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
const origin = "http://127.0.0.1:8792";
async function control(body: object): Promise<any> {
  const response = await fetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) });
  expect(response.status).toBe(200); return response.json();
}
async function api(actor: any, path: string, method = "GET", body?: unknown) {
  const response = await fetch(origin + "/api/v1" + path, { method, headers: { Authorization: `tma ${actor.initData}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  expect(response.ok).toBe(true); return response.status === 204 ? null : response.json();
}
async function enter(page: Page, actor: any, path = "/clan") {
  await page.addInitScript(player => {
    localStorage.setItem(`dalexio-onboarding-v1:player:${player}`, JSON.stringify({ version: 1, state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-01-01T00:00:00Z" } }));
    // Deliberately poison the historical store: authenticated server state must win.
    localStorage.setItem("dalexio-clan-state-v1", JSON.stringify({ version: 0, state: { role: "captain", membership: "member", activeClanId: "nova-vanguard", treasury: 999999 } }));
  }, actor.player);
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await page.goto(`${path}#tgWebAppData=${encodeURIComponent(actor.initData)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
}
const close = async (page: Page) => { await page.bringToFront(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0); };
async function snapshot(page: Page, width: number, name: string) {
  const folder = `work/b5-paired/mobile/${width}`; mkdirSync(folder, { recursive: true });
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.screenshot({ path: `${folder}/${name}.png`, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
for (const width of [320, 390, 460]) test(`actual Captain/Soldier lifecycle, economy and approved ClanModal at ${width}`, async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 844 });
  const captain = await control({ action: "player", points: 2500 });
  const group = await control({ action: "b5-group", player: captain.player });
  const name = `Paired ${crypto.randomUUID().slice(0, 8)}`;
  await enter(page, captain);
  await expect(page.getByRole("button", { name: /Lead a clan/ })).toBeVisible();
  await snapshot(page, width, "role-choice");
  await page.getByRole("button", { name: /Lead a clan/ }).click();
  await page.getByRole("button", { name: "Confirm path", exact: true }).click();
  await page.getByRole("button", { name: /Paired Clan home/ }).click();
  await page.getByLabel("Clan name", { exact: true }).fill(name);
  await page.getByLabel("Tag", { exact: true }).fill(crypto.randomUUID().slice(0, 4));
  await snapshot(page, width, "verified-founding");
  await page.getByRole("button", { name: "Register clan headquarters" }).click();
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await expect(page.getByText("999999", { exact: true })).toHaveCount(0);
  await snapshot(page, width, "captain-headquarters");
  const membership = await api(captain, "/clans/membership/current");
  const soldier = await control({ action: "player", points: 2500 });
  const other = await context.newPage(); await other.setViewportSize({ width, height: 844 });
  await enter(other, soldier);
  await other.getByRole("button", { name: /Find a clan/ }).click();
  await other.getByRole("button", { name: "Confirm path", exact: true }).click();
  await other.getByRole("button", { name: "Search", exact: true }).click();
  await other.getByLabel("Clan name or tag").fill(name);
  await other.getByRole("button").filter({ hasText: name }).first().click();
  await snapshot(other, width, "soldier-preview");
  await other.getByRole("button", { name: "Request to join", exact: true }).click();
  await expect(other.getByRole("dialog", { name: "Clan status" })).toContainText("PENDING");
  await snapshot(other, width, "request-pending");
  await page.bringToFront();
  await page.reload();
  await page.getByRole("navigation", { name: "Clan headquarters sections" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /recruits waiting/ }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await close(page);
  await other.bringToFront();
  await other.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(other.getByRole("dialog", { name: "Clan status" })).toContainText("ACCEPTED");
  await other.getByRole("button", { name: "Check invite and access", exact: true }).click();
  await expect(other.getByRole("button", { name: "Open Telegram group", exact: true })).toBeVisible();
  await snapshot(other, width, "accepted-invite");
  await control({ action: "b5-presence", player: soldier.player, group: group.id });
  await other.bringToFront();
  await other.getByRole("button", { name: "Refresh status", exact: true }).click(); await close(other);
  await expect(other.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await snapshot(other, width, "soldier-headquarters");
  await control({ action: "b5-reward", player: soldier.player });
  const mission = await control({ action: "b5-mission", player: soldier.player });
  await control({ action: "b5-mission-progress", player: soldier.player });
  await other.reload();
  await other.getByRole("button", { name: "Missions", exact: true }).click();
  await other.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(other.getByText(mission.key.replaceAll("-", " "), { exact: true })).toBeVisible();
  await snapshot(other, width, "settled-mission");
  await page.bringToFront();
  await page.reload();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  const equipment = await api(captain, "/clans/equipment");
  const item = equipment.items.find((row: any) => row.item_id === "rally-beacon");
  await page.getByRole("button").filter({ hasText: item.name }).first().click();
  await snapshot(page, width, "server-price-purchase");
  const purchaseKeys: string[] = [];
  if (width === 390) await page.route("**/api/v1/clans/shop/rally-beacon/purchase", async route => {
    purchaseKeys.push(route.request().postDataJSON().idempotency_key);
    if (purchaseKeys.length === 1) { await route.fetch(); await route.abort("connectionreset"); }
    else await route.continue();
  });
  await page.getByRole("button", { name: `Buy +1 · ${item.price.toLocaleString("en-US")}`, exact: true }).click();
  if (width === 390) {
    await expect(page.getByRole("button", { name: `Buy +1 · ${item.price.toLocaleString("en-US")}`, exact: true })).toBeEnabled();
    await page.getByRole("button", { name: `Buy +1 · ${item.price.toLocaleString("en-US")}`, exact: true }).click();
    expect(purchaseKeys).toHaveLength(2); expect(purchaseKeys[1]).toBe(purchaseKeys[0]);
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Clan headquarters sections" }).getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("button", { name: "Inventory", exact: true }).last().click();
  await page.getByRole("button").filter({ hasText: item.name }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /^Activate/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("ACTIVE CLAN EFFECTS", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await snapshot(page, width, "governance-status");
  await close(page);
  await control({ action: "b5-bot-admin", player: captain.player, admin: false });
  await page.bringToFront();
  await page.reload();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Admin recovery required");
  await snapshot(page, width, "admin-recovery");
  await control({ action: "b5-captain-authority", player: captain.player, admin: false });
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("CAPTAIN AUTHORITY LOSS");
  await snapshot(page, width, "captain-authority-loss");
  await page.getByRole("button", { name: "Verify Telegram authority", exact: true }).click();
  await expect(page.getByRole("button", { name: "Verify Telegram authority", exact: true })).toBeEnabled();
  await expect(page.getByRole("dialog")).toContainText("CAPTAIN AUTHORITY LOSS");
  await control({ action: "b5-captain-authority", player: captain.player, admin: true });
  await page.getByRole("button", { name: "Verify Telegram authority", exact: true }).click();
  await expect(page.getByRole("button", { name: "Verify Telegram authority", exact: true })).toBeEnabled();
  await expect(page.getByRole("dialog")).toContainText("BOT ADMIN LOSS");
  await control({ action: "b5-bot-admin", player: captain.player, admin: true });
  await page.getByRole("button", { name: "Verify Telegram authority", exact: true }).click();
  await expect(page.getByRole("button", { name: "Verify Telegram authority", exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Available");
  await snapshot(page, width, "captain-authority-restored");
  await close(page);
  await other.reload();
  await other.getByRole("button", { name: "Clan status", exact: true }).click();
  await other.getByRole("button", { name: "Leave Clan", exact: true }).click();
  await snapshot(other, width, "leave-confirmation");
  await other.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(other.getByRole("dialog")).toContainText("No active membership");
  await expect(other.getByRole("dialog")).toContainText("Join cooldown until");
  expect(membership.clan_id).toBeGreaterThan(0);
  await other.close();
});
test("approved governance sheet uses real roster targets, reason codes, electorate and immutable ballots", async ({ page }) => {
  test.setTimeout(120_000);
  const captain = await control({ action: "player", points: 2500 });
  await api(captain, "/clans/role", "POST", { role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: captain.player });
  await api(captain, `/clans/eligible-groups/${group.id}/verify`, "POST");
  const clan = await api(captain, "/clans/", "POST", { telegram_group_id: group.id, name: "Governance paired", tag: crypto.randomUUID().slice(0, 4), motto: "Server governed" });
  const members = [];
  for (let i = 0; i < 3; i++) {
    const soldier = await control({ action: "player", points: 2500 });
    await api(soldier, "/clans/role", "POST", { role: "SOLDIER" });
    const request = await api(soldier, `/clans/${clan.id}/join-requests`, "POST");
    await api(captain, `/clans/join-requests/${request.id}/decision`, "POST", { accept: true });
    await control({ action: "b5-presence", player: soldier.player, group: group.id });
    members.push(await api(soldier, "/clans/membership/current"));
  }
  await enter(page, captain);
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await page.getByRole("button", { name: "Propose removal", exact: true }).click();
  await page.getByLabel("Member", { exact: true }).selectOption(String(members[0].membership_id));
  await page.getByLabel("Reason", { exact: true }).selectOption("COMMUNITY_REASON");
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "removal-confirmation"); }
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("SOLDIER REMOVAL");
  await page.getByRole("button", { name: "Vote yes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Vote yes", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Vote no", exact: true })).toBeDisabled();
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "immutable-vote"); }
  await page.getByRole("button", { name: "Request dissolution", exact: true }).click();
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "dissolution-confirmation"); }
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("CAPTAIN DISSOLUTION");
});
test("server item effect units retain the approved shop sheet at every mobile width", async ({ page }) => {
  const captain = await control({ action: "player", points: 2500 });
  await api(captain, "/clans/role", "POST", { role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: captain.player });
  await api(captain, `/clans/eligible-groups/${group.id}/verify`, "POST");
  await api(captain, "/clans/", "POST", { telegram_group_id: group.id, name: "Equipment paired", tag: crypto.randomUUID().slice(0, 4), motto: "Confirmed equipment" });
  await control({ action: "b5-reward", player: captain.player });
  const rule = (await api(captain, "/clans/equipment")).items.find((item: any) => item.item_id === "rally-beacon");
  expect(rule.effects).toContainEqual({ category: "HQ_XP_RATE_BONUS_BPS", value: 2000 });
  await enter(page, captain);
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await page.getByRole("button").filter({ hasText: rule.name }).first().click();
  await expect(page.getByRole("dialog")).toContainText("+20% HQ XP generation");
  await expect(page.getByRole("dialog")).not.toContainText("BPS");
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "server-price-purchase"); }
});
