import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = "http://127.0.0.1:8792";
async function control(body: object): Promise<any> { const r = await fetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) }); expect(r.status).toBe(200); return r.json(); }
async function api(actor: any, path: string, method = "GET", body?: unknown): Promise<any> { const r = await fetch(origin + "/api/v1/clans" + path, { method, headers: { Authorization: `tma ${actor.initData}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); expect(r.ok).toBe(true); return r.status === 204 ? null : r.json(); }
async function enter(page: Page, actor: any) {
  await page.addInitScript(player => localStorage.setItem(`dalexio-onboarding-v1:player:${player}`, JSON.stringify({ version: 1, state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-01-01T00:00:00Z" } })), actor.player);
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await page.goto(`/clan#tgWebAppData=${encodeURIComponent(actor.initData)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
}
async function refresh(page: Page) { await page.evaluate(() => window.dispatchEvent(new Event("focus"))); }
async function snapshot(page: Page, width: number, name: string) {
  mkdirSync(`work/b6-paired/mobile/${width}`, { recursive: true });
  await page.screenshot({ path: `work/b6-paired/mobile/${width}/${name}.png`, animations: "disabled", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
for (const width of [320, 390, 460]) test(`B6 canonical applicants, standing, missions and activity refresh at ${width}`, async ({ page }) => {
  test.setTimeout(150000); await page.setViewportSize({ width, height: 844 });
  const captain = await control({ action: "player", points: 2500 }); await api(captain, "/role", "POST", { role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: captain.player }); await api(captain, `/eligible-groups/${group.id}/verify`, "POST");
  const clan = await api(captain, "/", "POST", { telegram_group_id: group.id, name: `B6 Clan ${width}`, tag: crypto.randomUUID().slice(0, 8) });
  await control({ action: "b6-settle", player: captain.player, gross: 3 }); await control({ action: "b6-rankings", player: captain.player });
  const soldier = await control({ action: "player", points: 2500 }); await api(soldier, "/role", "POST", { role: "SOLDIER" }); await control({ action: "b6-daily", player: soldier.player });
  await api(soldier, `/${clan.id}/join-requests`, "POST"); await control({ action: "b6-rankings", player: captain.player });
  const applicant = (await api(captain, "/applicants"))[0], home = await api(captain, "/home");
  await enter(page, captain);
  const standing = page.locator("section").filter({ has: page.getByText("SEASON STANDING", { exact: true }) }).last();
  await expect(standing.getByText(`#${home.rank}`, { exact: true })).toBeVisible();
  await expect(page.getByText("0 credits", { exact: true })).toBeVisible(); await expect(page.getByText("0% ready", { exact: true })).toBeVisible();
  await snapshot(page, width, "standing-and-source-activity");
  await page.getByRole("button", { name: /recruits waiting/ }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toContainText("STREAK"); await expect(dialog).toContainText("1d"); await expect(dialog).toContainText(`#${applicant.rank}`);
  await snapshot(page, width, "applicant-rank-streak");
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  expect(await api(soldier, "/membership/current")).toBeNull(); await expect.poll(async () => { const invite = await api(soldier, "/invite/current"); return invite.state === "ACTIVE" && Boolean(invite.invite_link); }).toBe(true);
  expect((await control({ action: "b6-invite-deliveries", player: soldier.player })).private_invites).toBe(0);
  await control({ action: "b5-presence", player: soldier.player, group: group.id });
  const definitions = await control({ action: "b6-missions", player: captain.player });
  await refresh(page); await page.getByRole("button", { name: "Missions", exact: true }).click();
  await expect(page.getByText(definitions.missions[0].title, { exact: true })).toBeVisible({ timeout: 40000 });
  await expect(page.getByText(definitions.missions[1].description, { exact: true })).toBeVisible();
  await snapshot(page, width, "admin-group-individual-missions");
  await control({ action: "b6-signal", player: captain.player }); await control({ action: "b6-signal", player: captain.player });
  await refresh(page); await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByText(definitions.missions[0].title, { exact: true })).toBeVisible({ timeout: 40000 });
  await expect(page.getByText(/XP · Settled/).first()).toBeVisible(); await expect(page.getByRole("button", { name: /claim/i })).toHaveCount(0);
  await page.getByRole("button", { name: "HQ", exact: true }).click();
  const feed = page.locator("section").filter({ has: page.getByRole("heading", { name: "Recent activity", exact: true }) }).last();
  await expect(feed.getByText("Clan mission completed").first()).toBeVisible({ timeout: 40000 });
  const actual = await api(captain, "/activity");
  await expect(feed.locator("time")).toHaveCount(actual.items.length);
  for (const item of actual.items) await expect(feed.locator(`[data-activity-id="${item.id}"] time`)).toHaveAttribute("datetime", item.occurred_at);
  expect(new Set(await feed.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-activity-id")))).size).toBe(actual.items.length);
  await snapshot(page, width, "settled-missions-and-verified-roster-activity");
});

for (const width of [320, 390, 460]) test(`B6 actual zero-net Treasury rollover renders safely at ${width}`, async ({ page }) => {
  test.setTimeout(60000); await page.setViewportSize({ width, height: 844 });
  const captain = await control({ action: "player", points: 2500 }); await api(captain, "/role", "POST", { role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: captain.player }); await api(captain, `/eligible-groups/${group.id}/verify`, "POST");
  await api(captain, "/", "POST", { telegram_group_id: group.id, name: `Treasury rollover ${width}`, tag: crypto.randomUUID().slice(0, 8) });
  await control({ action: "b6-settle", player: captain.player, gross: 9 });
  await enter(page, captain);
  const settled = await control({ action: "b6-settle", player: captain.player, gross: 1 });
  expect(settled).toMatchObject({ gross: 1, player_amount: 0, treasury_amount: 1 });
  const actual = await api(captain, "/activity"), event = actual.items.find((row: any) => row.event_type === "CLAN_REWARD_SETTLED" && row.amount === 0);
  expect(event).toMatchObject({ amount: 0, unit: "PLAYER_POINTS", treasury_amount: 1, contribution_amount: 1 });
  await refresh(page);
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Recent activity", exact: true }) }).last();
  const row = card.locator(`[data-activity-id="${event.id}"]`);
  await expect(row.locator("strong")).toHaveText(`${event.actor_name || "A member"} contributed to the Clan Treasury`, { timeout: 40000 });
  await expect(row.locator("p")).toHaveText("1 Treasury credits · 1 contribution");
  await expect(row.locator("time")).toHaveAttribute("datetime", event.occurred_at);
  await expect(row).toHaveCount(1); await expect(card.getByText(/earned 0 points/)).toHaveCount(0);
  await expect(page.getByText("1 credits", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await snapshot(page, width, "zero-net-treasury-rollover");
  writeFileSync(`work/b6-paired/mobile/${width}/zero-net-activity-http.json`, JSON.stringify(actual, null, 2) + "\n");
});
