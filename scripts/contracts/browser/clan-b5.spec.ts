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
  await other.getByRole("button", { name: /^(Request to join|One request already active)$/ }).click();
  await expect(other.getByRole("dialog", { name: "Clan status" })).toContainText("Awaiting Captain review");
  await snapshot(other, width, "request-pending");
  await page.bringToFront();
  await page.reload();
  await page.getByRole("navigation", { name: "Clan headquarters sections" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /recruits waiting/ }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await close(page);
  await other.bringToFront();
  await other.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(other.getByRole("dialog", { name: "Clan status" })).toContainText("Accepted · verify Telegram membership");
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
  const settledMission = (await api(soldier, "/clans/missions")).find((row: any) => row.key === mission.key);
  expect(settledMission.completed).toBe(true);
  await expect(other.getByText("Clan mission", { exact: true })).toBeVisible();
  await expect(other.getByText(`${settledMission.progress_units} / ${settledMission.target_units} units`, { exact: true })).toBeVisible();
  await expect(other.getByText(mission.key.replaceAll("-", " "), { exact: true })).toHaveCount(0);
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
  await expect(page.getByRole("dialog")).toContainText("Admin permissions need restoring");
  await snapshot(page, width, "admin-recovery");
  await control({ action: "b5-captain-authority", player: captain.player, admin: false });
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Captain admin permissions need restoring");
  await snapshot(page, width, "captain-authority-loss");
  await page.getByRole("button", { name: "Verify Telegram authority", exact: true }).click();
  await expect(page.getByRole("button", { name: "Verify Telegram authority", exact: true })).toBeEnabled();
  await expect(page.getByRole("dialog")).toContainText("Captain admin permissions need restoring");
  await control({ action: "b5-captain-authority", player: captain.player, admin: true });
  await page.getByRole("button", { name: "Verify Telegram authority", exact: true }).click();
  await expect(page.getByRole("button", { name: "Verify Telegram authority", exact: true })).toBeEnabled();
  await expect(page.getByRole("dialog")).toContainText("Bot admin permissions need restoring");
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
  const clan = await api(captain, "/clans/", "POST", { telegram_group_id: group.id, name: "Governance paired", tag: crypto.randomUUID().slice(0, 8), motto: "Server governed" });
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
  await expect(page.getByRole("dialog")).toContainText("Soldier removal");
  await page.getByRole("button", { name: "Vote yes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Vote yes", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Vote no", exact: true })).toBeDisabled();
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "immutable-vote"); }
  await page.getByRole("button", { name: "Request dissolution", exact: true }).click();
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "dissolution-confirmation"); }
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Captain dissolution");
});
test("server item effect units retain the approved shop sheet at every mobile width", async ({ page }) => {
  const captain = await control({ action: "player", points: 2500 });
  await api(captain, "/clans/role", "POST", { role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: captain.player });
  await api(captain, `/clans/eligible-groups/${group.id}/verify`, "POST");
  await api(captain, "/clans/", "POST", { telegram_group_id: group.id, name: "Equipment paired", tag: crypto.randomUUID().slice(0, 8), motto: "Confirmed equipment" });
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
async function requestWorld() {
  const captain = await control({ action: "player", points: 2500 }); await api(captain, "/clans/role", "POST", { role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: captain.player }); await api(captain, `/clans/eligible-groups/${group.id}/verify`, "POST");
  const name = `Review ${crypto.randomUUID().slice(0, 8)}`;
  const clan = await api(captain, "/clans/", "POST", { telegram_group_id: group.id, name, tag: crypto.randomUUID().slice(0, 8), motto: "Actual request lifecycle" });
  return { captain, group, clan, name };
}
async function preview(page: Page, name: string) {
  await page.getByRole("button", { name: "Search", exact: true }).click(); await page.getByLabel("Clan name or tag").fill(name);
  await page.getByRole("button").filter({ hasText: name }).first().click(); await expect(page.getByRole("dialog")).toBeVisible();
}
const joinButton = (page: Page) => page.getByRole("button", { name: /^(Request to join|One request already active)$/ });
for (const width of [320, 390, 460]) test(`one active request and older accepted invitation survive terminal history at ${width}`, async ({ page }) => {
  test.setTimeout(120_000); await page.setViewportSize({ width, height: 844 });
  const a = await requestWorld(), b = await requestWorld(); const soldier = await control({ action: "player", points: 2500 }); await api(soldier, "/clans/role", "POST", { role: "SOLDIER" });
  const request = await api(soldier, `/clans/${a.clan.id}/join-requests`, "POST"); await enter(page, soldier); await preview(page, b.name);
  await expect(joinButton(page)).toBeDisabled(); await snapshot(page, width, "review-pending-blocks-other-clan"); await close(page);
  await api(a.captain, `/clans/join-requests/${request.id}/decision`, "POST", { accept: true });
  await control({ action: "b5-request-history", player: soldier.player, clan: b.clan.id, count: 26 }); await page.reload();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(a.name); await expect(page.getByRole("dialog")).toContainText("Accepted · verify Telegram membership"); await expect(page.getByLabel("Clan request history")).toContainText("Cancelled");
  await page.getByRole("button", { name: "Check invite and access", exact: true }).click(); await expect(page.getByRole("button", { name: "Open Telegram group", exact: true })).toBeVisible(); await snapshot(page, width, "review-accepted-behind-cancelled-history");
  await close(page); await preview(page, b.name); await expect(joinButton(page)).toBeDisabled(); await close(page); await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await control({ action: "b5-transport", mode: "revoke-unavailable" });
  try {
    await page.getByRole("button", { name: "Cancel request", exact: true }).click(); await control({ action: "b5-revoke-worker", player: soldier.player, request: request.id }); await page.getByRole("button", { name: "Refresh status", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("In progress · your place stays reserved"); await expect(page.getByRole("button", { name: "Cancel request", exact: true })).toBeDisabled(); await expect(page.getByRole("button", { name: "Open Telegram group", exact: true })).toHaveCount(0); await snapshot(page, width, "review-revocation-pending");
  } finally { await control({ action: "b5-transport", mode: "ok" }); }
  await control({ action: "advance", seconds: 120 }); await control({ action: "b5-revoke-worker", player: soldier.player, request: request.id });
  await page.getByRole("button", { name: "Refresh status", exact: true }).click(); await expect(page.getByRole("button", { name: "Cancel request", exact: true })).toHaveCount(0);
  await close(page); await preview(page, b.name); await expect(joinButton(page)).toBeEnabled(); await joinButton(page).click(); await expect(page.getByRole("dialog", { name: "Clan status" })).toContainText("Awaiting Captain review");
  const active = (await api(soldier, "/clans/join-requests/current")).find((row: any) => row.state === "PENDING");
  await api(b.captain, `/clans/join-requests/${active.id}/decision`, "POST", { accept: true }); await control({ action: "b5-presence", player: soldier.player, group: b.group.id });
  await page.getByRole("button", { name: "Refresh status", exact: true }).click(); await close(page); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible(); await snapshot(page, width, "review-verified-membership");
});
test("an application made on another device returns conflict feedback and refreshes the real reservation", async ({ page }) => {
  const a = await requestWorld(), b = await requestWorld(), soldier = await control({ action: "player", points: 2500 }); await api(soldier, "/clans/role", "POST", { role: "SOLDIER" });
  await enter(page, soldier); await preview(page, b.name); await expect(joinButton(page)).toBeEnabled(); await api(soldier, `/clans/${a.clan.id}/join-requests`, "POST"); await joinButton(page).click();
  await expect(page.getByRole("alert")).toBeVisible(); await expect(joinButton(page)).toBeDisabled(); await close(page); await page.getByRole("button", { name: "Clan status", exact: true }).click(); await expect(page.getByRole("dialog")).toContainText(a.name); await expect(page.getByRole("dialog")).toContainText("Awaiting Captain review");
});
test("unexpected legacy overlapping active requests expose no Clan credential or arbitrary action", async ({ page }) => {
  const a = await requestWorld(), b = await requestWorld(), soldier = await control({ action: "player", points: 2500 }); await api(soldier, "/clans/role", "POST", { role: "SOLDIER" });
  const request = await api(soldier, `/clans/${a.clan.id}/join-requests`, "POST"); await api(a.captain, `/clans/join-requests/${request.id}/decision`, "POST", { accept: true });
  await control({ action: "b5-request-history", player: soldier.player, clan: b.clan.id, state: "PENDING" });
  const credentials: string[] = []; page.on("request", request => { if (request.url().includes("/invite/current")) credentials.push(request.url()); });
  await enter(page, soldier); await expect(page.getByRole("status").filter({ hasText: "Your Clan requests need review" })).toBeVisible(); await page.getByRole("button", { name: "Clan status", exact: true }).click(); await expect(page.getByRole("button", { name: "Refresh status", exact: true })).toBeVisible();
  for (const label of ["Check invite and access", "Open Telegram group", "Cancel request"]) await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "review-overlap-safe"); }
  await page.getByRole("button", { name: "Refresh status", exact: true }).click(); await expect(page.getByRole("dialog")).toContainText("Your Clan requests need review"); expect(credentials).toEqual([]);
  await close(page); await preview(page, b.name); await expect(joinButton(page)).toBeDisabled();
});
for (const kind of ["older", "terminal"]) test(`operator-required ${kind} reservation remains read-only until authoritative resolution`, async ({ page }) => {
  const a = await requestWorld(), b = await requestWorld(), soldier = await control({ action: "player", points: 2500 });
  await api(soldier, "/clans/role", "POST", { role: "SOLDIER" });
  const legacy = await control({ action: "b5-legacy-path", player: soldier.player, clan: a.clan.id, kind });
  const credentials: string[] = []; page.on("request", request => { if (request.url().includes("/invite/current")) credentials.push(request.url()); });
  await enter(page, soldier);
  await expect(page.getByRole("status").filter({ hasText: "help from support" })).toBeVisible();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  if (kind === "older") await expect(page.getByRole("dialog")).toContainText(legacy.season_code);
  for (const label of ["Check invite and access", "Open Telegram group", "Cancel request"]) await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, `review-operator-${kind}`); }
  expect(credentials).toEqual([]);
  await close(page); await preview(page, b.name); await expect(joinButton(page)).toBeDisabled(); await close(page);
  // Isolated operator proof invokes the actual authorized backend service; there is no product control for it.
  await control({ action: "b5-resolve-proof", player: soldier.player, request: legacy.request });
  await page.getByRole("button", { name: "Clan status", exact: true }).click(); await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText("help from support");
  await close(page); await preview(page, b.name); await expect(joinButton(page)).toBeEnabled(); await joinButton(page).click();
  await expect(page.getByRole("dialog", { name: "Clan status" })).toContainText("Awaiting Captain review");
});
test("a current application plus an unresolved terminal credential fails closed before any invite action", async ({ page }) => {
  const a = await requestWorld(), b = await requestWorld(), soldier = await control({ action: "player", points: 2500 });
  await api(soldier, "/clans/role", "POST", { role: "SOLDIER" });
  await api(soldier, `/clans/${a.clan.id}/join-requests`, "POST");
  const legacy = await control({ action: "b5-legacy-path", player: soldier.player, clan: b.clan.id, kind: "terminal" });
  const credentials: string[] = []; page.on("request", request => { if (request.url().includes("/invite/current")) credentials.push(request.url()); });
  await enter(page, soldier); await expect(page.getByRole("status").filter({ hasText: "Your Clan requests need review" })).toBeVisible();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  for (const label of ["Check invite and access", "Open Telegram group", "Cancel request"]) await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  for (const width of [320, 390, 460]) { await page.setViewportSize({ width, height: 844 }); await snapshot(page, width, "review-mixed-blockers"); }
  expect(credentials).toEqual([]);
  await control({ action: "b5-resolve-proof", player: soldier.player, request: legacy.request }); await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(a.name); await expect(page.getByRole("dialog")).toContainText("Awaiting Captain review");
  await page.getByRole("button", { name: "Cancel request", exact: true }).click(); await expect(page.getByRole("button", { name: "Cancel request", exact: true })).toHaveCount(0);
  await close(page); await preview(page, b.name); await expect(joinButton(page)).toBeEnabled();
});
