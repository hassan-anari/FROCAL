import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
test.setTimeout(120_000);
const origin = "http://127.0.0.1:8792";
async function control(body: object): Promise<any> { const r = await fetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) }); expect(r.status).toBe(200); return r.json(); }
async function api(actor: any, path: string, method = "GET", body?: unknown): Promise<any> { const r = await fetch(origin + "/api/v1/clans" + path, { method, headers: { Authorization: `tma ${actor.initData}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); expect(r.ok).toBe(true); return r.status === 204 ? null : r.json(); }
async function soldier(captain: any, clan: any, group: any, activate = true) {
  const actor = await control({ action: "player", points: 2500 }); await api(actor, "/role", "POST", { role: "SOLDIER" });
  const request = await api(actor, `/${clan.id}/join-requests`, "POST"); await api(captain, `/join-requests/${request.id}/decision`, "POST", { accept: true });
  if (activate) await control({ action: "b5-presence", player: actor.player, group: group.id }); return actor;
}
async function world(count: number) {
  const captain = await control({ action: "player", points: 2500 }); await api(captain, "/role", "POST", { role: "CAPTAIN" }); const group = await control({ action: "b5-group", player: captain.player }); await api(captain, `/eligible-groups/${group.id}/verify`, "POST");
  const clan = await api(captain, "/", "POST", { telegram_group_id: group.id, name: "Actual hotfix Clan", tag: crypto.randomUUID().slice(0, 8) });
  for (let i = 0; i < count; i++) await soldier(captain, clan, group); return { captain, clan, group };
}
async function enter(page: Page, captain: any) {
  await page.addInitScript(player => localStorage.setItem(`dalexio-onboarding-v1:player:${player}`, JSON.stringify({ version: 1, state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-01-01T00:00:00Z" } })), captain.player);
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await page.goto(`/clan#tgWebAppData=${encodeURIComponent(captain.initData)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible(); await page.getByRole("button", { name: "Clan status", exact: true }).click();
}
async function shot(page: Page, width: number, name: string) { const dir = `work/post-b6-paired/mobile/${width}`; mkdirSync(dir, { recursive: true }); await page.screenshot({ path: `${dir}/${name}.png`, animations: "disabled" }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
for (const width of [320, 390, 460]) {
  test(`actual IMMEDIATE dissolution is irreversible and deliberate at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 }); const { captain } = await world(0); await enter(page, captain);
    await page.getByRole("button", { name: "Request dissolution", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("There is no vote"); await expect(page.getByRole("dialog")).toContainText("You cannot create another Clan in the same Season");
    await expect(page.getByRole("button", { name: "Dissolve now", exact: true })).toBeDisabled(); await expect(page.getByRole("checkbox")).not.toBeChecked();
    await shot(page, width, "immediate-warning");
    await page.getByRole("button", { name: "Cancel", exact: true }).click(); expect(await api(captain, "/membership/current")).toBeTruthy();
    await page.getByRole("button", { name: "Request dissolution", exact: true }).click(); await expect(page.getByRole("checkbox")).toBeEnabled(); await page.getByRole("checkbox").check();
    await shot(page, width, "immediate-armed");
    await page.getByRole("button", { name: "Dissolve now", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Clan status" })).toContainText("No active membership"); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toHaveCount(0);
    await expect(page.getByText("Your Clan dissolved. You cannot create another Clan during the current Season.", { exact: true })).toBeVisible();
    expect(await api(captain, "/membership/current")).toBeNull(); await shot(page, width, "immediate-complete");
  });
  test(`actual VOTE_REQUIRED opens a case and retains the Clan at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 }); const { captain } = await world(3); await enter(page, captain);
    await page.getByRole("button", { name: "Request dissolution", exact: true }).click(); await expect(page.getByRole("dialog")).toContainText("Confirmation opens a governance vote");
    await expect(page.getByRole("button", { name: "Open dissolution vote", exact: true })).toBeDisabled(); await expect(page.getByRole("checkbox")).toBeEnabled(); await page.getByRole("checkbox").check();
    await shot(page, width, "vote-required"); await page.getByRole("button", { name: "Open dissolution vote", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Clan status" })).toContainText("Captain dissolution"); expect(await api(captain, "/membership/current")).toBeTruthy(); expect((await api(captain, "/governance")).length).toBe(1);
  });
  test(`actual BLOCKED readiness shows target electorate and disables action at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 }); const { captain } = await world(1); await enter(page, captain);
    await expect(page.getByLabel("Governance prerequisites")).toContainText("not enough eligible voters"); await expect(page.getByRole("button", { name: "Request dissolution", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Propose removal", exact: true })).toBeDisabled(); await expect(page.getByLabel("Governance prerequisites")).toContainText("Eligible voters: 1 / 3");
    expect(await api(captain, "/governance")).toEqual([]); await shot(page, width, "blocked-electorate");
  });
}
test("actual fresh preflight prevents stale singleton confirmation from posting", async ({ page }) => {
  const { captain, clan, group } = await world(0); await enter(page, captain); let posts = 0;
  page.on("request", r => { if (r.method() === "POST" && r.url().endsWith("/clans/dissolution")) posts++; });
  await page.getByRole("button", { name: "Request dissolution", exact: true }).click(); await expect(page.getByRole("checkbox")).toBeEnabled(); await page.getByRole("checkbox").check();
  await soldier(captain, clan, group); await page.getByRole("button", { name: "Dissolve now", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unavailable", exact: true })).toBeDisabled(); await expect(page.getByRole("dialog")).toContainText("not enough eligible voters"); expect(posts).toBe(0); expect(await api(captain, "/membership/current")).toBeTruthy();
});
test("a real 409 race after preflight never pretends that a case or dissolution succeeded", async ({ page }) => {
  const { captain, clan, group } = await world(0); const pending = await soldier(captain, clan, group, false); await enter(page, captain);
  await page.getByRole("button", { name: "Request dissolution", exact: true }).click(); await expect(page.getByRole("checkbox")).toBeEnabled(); await page.getByRole("checkbox").check();
  await page.route("**/api/v1/clans/dissolution", async route => { await control({ action: "b5-presence", player: pending.player, group: group.id }); await route.continue(); });
  await page.getByRole("button", { name: "Dissolve now", exact: true }).click(); await expect(page.getByRole("dialog")).toContainText("not enough eligible voters");
  expect(await api(captain, "/membership/current")).toBeTruthy(); expect(await api(captain, "/governance")).toEqual([]); await expect(page.getByText(/Your Clan dissolved/)).toHaveCount(0);
});
