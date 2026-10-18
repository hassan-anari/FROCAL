import { governanceFixture } from "./post-b6-fixture";
import { expect, test } from "@playwright/test";
import { prepareClan } from "./b6-fixture";
import { launch } from "./b4-fixture";
for (const width of [320, 390, 460]) test(`Soldier leave succeeds without old-scope warnings at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 740 });
  const f = await prepareClan(page); f.data.state.role = "SOLDIER"; f.setMembership({ ...f.member, role: "SOLDIER" });
  let leaveCalls = 0;
  await page.route("**/api/v1/clans/leave", route => {
    leaveCalls++; f.setMembership(null); f.data.state.cooldown_until = "2026-10-19T10:00:00Z"; f.data.state.voluntary_leave_count = 1;
    return route.fulfill({ status: 204, body: "" });
  });
  await page.goto(launch("/clan")); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await page.getByRole("button", { name: "Leave Clan", exact: true }).click();
  // Reads scoped to the old Clan are no longer valid after the committed leave.
  await page.route("**/api/v1/clans/{home,roster*,treasury,equipment,missions,trophies,governance,recovery,activity*}", route => route.fulfill({ status: width === 390 ? 401 : 403, json: { code: "CLAN_FORBIDDEN" } }));
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Clan status" })).toContainText("No active membership");
  await expect(page.getByRole("dialog")).toContainText("Join cooldown until");
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toHaveCount(0);
  await expect(page.getByText("You left the Clan.", { exact: true })).toBeVisible();
  await expect(page.getByText(/couldn't refresh|couldn't load fully/)).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toHaveCount(0);
  expect(leaveCalls).toBe(1);
  await page.screenshot({ path: `docs/evidence/post-b6/${width}/soldier-left.png`, animations: "disabled" });
  await page.reload(); await expect(page.getByRole("navigation", { name: "Clan discovery sections" })).toBeVisible();
});
test("FACILITIES updates from equipment after activation, expiry, refresh and foreground resume", async ({ page }) => {
  const f = await prepareClan(page);
  f.data.equipment.items.forEach((item: any) => { item.quantity = 0; }); f.data.equipment.active_effects = [];
  await page.goto(launch("/clan"));
  const metric = page.locator("article").filter({ has: page.getByText("FACILITIES", { exact: true }) });
  await expect(metric).toContainText("0 items");
  await metric.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/evidence/post-b6/390/facilities-empty.png", animations: "disabled" });
  f.data.equipment.items[0].quantity = 3;
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(metric).toContainText("3 items");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await metric.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/evidence/post-b6/390/facilities-owned.png", animations: "disabled" });
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  const timed = f.data.equipment.items.filter((item: any) => item.activation === "TIMED");
  const at = Date.parse(f.data.equipment.server_time);
  f.data.equipment.active_effects = [0, 1, 2].map((id: number) => ({ id: id + 1, item_id: timed[id === 2 ? 1 : 0].item_id, category: "HQ_XP_RATE_BONUS_BPS", value: 2000, starts_at: new Date(at - 1000).toISOString(), expires_at: new Date(at + 5000).toISOString(), effective: true }));
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(metric).toContainText(`${timed[0].name} +1`);
  await expect(page.locator("article").filter({ has: page.getByText("EFFECTS", { exact: true }) })).toContainText("3 active");
  await expect(metric).toContainText("3 items", { timeout: 8000 });
  f.data.equipment.items[0].quantity = 4;
  f.data.equipment.server_time = new Date(at + 10_000).toISOString();
  await page.waitForTimeout(1001); await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(metric).toContainText("4 items");
});
test("blank invite notifications explain the next action and navigate without credentials", async ({ page }) => {
  const f = await prepareClan(page);
  f.app.notifications = [{ ...f.app.notifications[0], type: "CLAN_INVITE_READY", title: " ", body: "", unread: false, deep_link: null }];
  await page.goto(launch("/base")); await page.getByRole("button", { name: "Open notifications" }).click();
  const panel = page.getByRole("region", { name: "Notifications" });
  await expect(panel).toContainText("Clan invitation ready"); await expect(panel).toContainText("Open Clan Status");
  await panel.getByRole("button").filter({ hasText: "Clan invitation ready" }).click();
  await expect(page).toHaveURL(/\/clan$/); await expect(page.getByRole("button", { name: "Clan status", exact: true })).toBeVisible();
});

test("History preserves row nodes during foreground refresh and duplicate pagination", async ({ page }) => {
  await prepareClan(page);
  const row = (id: number) => ({ id, source_type: "CREATOR", context: "NETWORK_GROUP", player_amount: 20, occurred_at: "2026-10-16T10:10:00Z" });
  let release: (() => void) | undefined;
  let held: Promise<void> | undefined;
  let pageTwoCalls = 0;
  await page.route("**/api/v1/rewards/history?*", async route => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    if (cursor) pageTwoCalls++;
    await held;
    return route.fulfill({ json: { items: cursor ? [row(19)] : [row(20)], next_cursor: cursor ? null : 20 } });
  });
  await page.goto(launch("/earn")); await page.getByRole("button", { name: "History", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Earn history" });
  await expect(sheet.locator("article")).toHaveCount(2); // Intersection continuation may finish immediately.
  const first = sheet.locator("article").first(); await first.evaluate(el => { (el as HTMLElement).dataset.confirmedRow = "retained"; });
  held = new Promise(done => { release = done; });
  await page.waitForTimeout(1001); await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(sheet.getByRole("status", { name: "Loading earnings…" })).toHaveCount(0);
  await expect(sheet.locator("article[data-confirmed-row=retained]")).toBeVisible();
  release!(); await expect(sheet.locator("article")).toHaveCount(2);
  expect(pageTwoCalls).toBeLessThanOrEqual(2); // one continuation plus one refetch of the loaded page
  await page.screenshot({ path: "docs/evidence/post-b6/390/history-preserved.png", animations: "disabled" });
});

for (const width of [320, 390, 460]) test(`dissolution warning defaults to cancellation at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 640 });
  const f = await prepareClan(page);
  f.data.recovery.governance = governanceFixture();
  await page.goto(launch("/clan")); await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await page.getByRole("button", { name: "Request dissolution", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("You cannot create another Clan in the same Season");
  await expect(dialog.getByRole("button", { name: "Dissolve now", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeEnabled();
  await page.screenshot({ path: `docs/evidence/post-b6/${width}/dissolution-warning.png`, animations: "disabled" });
  await dialog.getByRole("checkbox").check();
  await expect(dialog.getByRole("button", { name: "Dissolve now", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(f.calls.every(call => call.method === "GET")).toBe(true);
});
