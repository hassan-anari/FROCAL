import { expect, test } from "@playwright/test";
import { auth, launch, prepareB4 } from "./b4-fixture";
import { mkdirSync } from "node:fs";
// Synthetic responses for existing WEDCAL APIs; not a B5 backend handoff/fixture.
const reward = (id: number) => ({ id, source_type: id % 2 ? "MISSION" : "DAILY", context: "PLAYER", player_amount: id + 7, occurred_at: "2026-10-16T10:10:00Z" });
for (const width of [320, 390, 460]) {
  test(`real data presentation and shared history ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await prepareB4(page);
    state.missions = Array.from({ length: 4 }, (_, i) => ({ ...state.missions[0], key: `synthetic-${i}` })).map((m: any, i: number) => ({ ...m, title: ["Server available", "Server in progress", "Server ready", "Server unavailable"][i], available: i !== 3, state: ["AVAILABLE", "IN_PROGRESS", "REWARD_READY", "UNAVAILABLE"][i], reward_amount: 71 + i }));
    let historyReads = 0;
    await page.route("**/api/v1/rewards/history?*", route => {
      expect(route.request().headers().authorization).toBe(`tma ${auth}`);
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      historyReads++;
      return route.fulfill({ json: cursor ? { items: [reward(80), reward(79)], next_cursor: null } : { items: Array.from({ length: 20 }, (_, i) => reward(100 - i)), next_cursor: 81 } });
    });
    await page.goto(launch("/base"));
    const objectives = page.locator('section[aria-label="Next objectives"]');
    await expect(objectives.locator("article h3")).toHaveText(["Server ready", "Server in progress", "Server available"]);
    await expect(objectives.locator("article strong")).toHaveText(["73 XP", "72 XP", "71 XP"]);
    await expect(objectives).not.toContainText("%");
    await expect(objectives).not.toContainText("Operator Medal");
    const recent = page.getByRole("region", { name: "Recent rewards", exact: true });
    await recent.scrollIntoViewIfNeeded();
    await expect(recent.locator("article")).toHaveCount(3);
    await expect(recent).toContainText("+107 XP");
    await expect(page.getByText("Since Your Last Visit", { exact: true })).toHaveCount(0);
    const dir = `docs/evidence/b5/${width}`; mkdirSync(dir, { recursive: true });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/after-base-confirmed-data.png`, animations: "disabled" });
    expect(historyReads).toBe(1);
    await page.getByRole("button", { name: "All missions" }).click();
    await page.getByRole("button", { name: "History", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Earn history", exact: true });
    await expect(sheet).toContainText("+107 XP");
    // Navigation within the app observes the same fresh query, without a second first-page read.
    expect(historyReads).toBe(1);
    const rows = sheet.locator("article");
    await rows.nth(19).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(22);
    expect(historyReads).toBe(2);
    await expect(rows.last()).toContainText("+86 XP");
    await rows.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${dir}/after-earn-history.png`, animations: "disabled" });
  });
}
test("empty and error history never fabricate recent rewards; fewer missions stay fewer", async ({ page }) => {
  const state = await prepareB4(page);
  state.missions = [{ ...state.missions[0], title: "Only available mission", available: true, state: "AVAILABLE" }];
  let failed = false;
  await page.route("**/api/v1/rewards/history?*", route => route.fulfill(failed ? { status: 503, json: { detail: "private backend diagnostic" } } : { json: { items: [], next_cursor: null } }));
  await page.goto(launch("/base"));
  await expect(page.locator('section[aria-label="Next objectives"] article')).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Recent rewards" })).toHaveCount(0);
  await page.getByRole("button", { name: "All missions" }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Earn history" })).toContainText("No rewards yet.");
  failed = true;
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Earn history" })).toContainText("Rewards couldn't load.");
  await expect(page.getByRole("dialog", { name: "Earn history" })).not.toContainText("private backend diagnostic");
});
test("Notification Center numbering follows the flattened page order while mutations use ledger-independent notification IDs", async ({ page }) => {
  const state = await prepareB4(page);
  const notification = (i: number) => ({ ...state.notifications[0], id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, title: `Notification ${i}`, deep_link: { path: "/profile" } });
  let readPath = "";
  await page.route("**/api/v1/notifications?*", route => route.fulfill({ json: { items: Array.from({ length: new URL(route.request().url()).searchParams.has("cursor") ? 2 : 20 }, (_, i) => notification(new URL(route.request().url()).searchParams.has("cursor") ? 21 + i : 1 + i)), next_cursor: new URL(route.request().url()).searchParams.has("cursor") ? null : 81, unread_count: 22 } }));
  await page.route("**/api/v1/notifications/*/read", route => { readPath = new URL(route.request().url()).pathname; return route.fulfill({ json: { ...notification(22), unread: false, read_at: "2026-10-16T10:10:00Z" } }); });
  await page.goto(launch("/base"));
  await page.getByRole("button", { name: "Open notifications", exact: true }).click();
  const list = page.locator("[data-notification-list]");
  await expect(list.locator(":scope > button")).toHaveCount(20);
  await list.locator(":scope > button").last().scrollIntoViewIfNeeded();
  await expect(list.locator(":scope > button")).toHaveCount(22);
  await expect(list.locator(":scope > button > span:first-child")).toHaveText(Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, "0")));
  await list.locator(":scope > button").last().click();
  expect(readPath).toBe("/api/v1/notifications/00000000-0000-4000-8000-000000000022/read");
  await expect(page.getByRole("button", { name: "Customize", exact: true })).toBeVisible();
});
test("historical local Clan state cannot unlock production even when the backend feature flag is true", async ({ page }) => {
  const state = await prepareB4(page);
  state.bootstrap.features.clan = true;
  await page.addInitScript(() => localStorage.setItem("dalexio-clan-state-v1", JSON.stringify({ version: 0, state: { role: "captain", membership: "member", activeClanId: "nova-vanguard", treasury: 999999 } })));
  await page.goto(launch("/clan"));
  await expect(page.getByRole("button", { name: "Lead a clan" })).toHaveCount(0);
  await expect(page.getByText("999999")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your clan path waits ahead." })).toBeVisible();
  expect(state.calls.some(call => call.path.startsWith("/clans") && call.method !== "GET")).toBe(false);
});
test("history displays pending and continuation-error states without a replacement sheet or fake entries", async ({ page }) => {
  await prepareB4(page);
  let finish!: () => void;
  const gate = new Promise<void>(done => { finish = done; });
  await page.route("**/api/v1/rewards/history?*", async route => {
    if (new URL(route.request().url()).searchParams.has("cursor")) return route.fulfill({ status: 503, json: { detail: "private diagnostic" } });
    await gate;
    return route.fulfill({ json: { items: Array.from({ length: 20 }, (_, i) => reward(100 - i)), next_cursor: 81 } });
  });
  await page.goto(launch("/earn"));
  await page.getByRole("button", { name: "History", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Earn history" });
  await expect(sheet).toContainText("Loading rewards…");
  finish();
  await expect(sheet.locator("article")).toHaveCount(20);
  await sheet.locator("article").last().scrollIntoViewIfNeeded();
  await expect(sheet).toContainText("More rewards couldn't load.");
  await expect(sheet.locator("article")).toHaveCount(20);
  await expect(sheet).not.toContainText("private diagnostic");
});
test("external HTTPS banner uses Telegram openLink with its full query string", async ({ page }) => {
  await prepareB4(page);
  const banner = JSON.parse((await import("node:fs")).readFileSync("src/integrations/api/fixtures/b3/banners.json", "utf8")).active;
  const destination = "https://owner-approved-partner.example/offer?campaign=B5&next=%2Fjoin%3Fref%3Dtma#details";
  banner.banner.destination_type = "HTTPS"; banner.banner.destination = destination;
  await page.addInitScript(() => {
    (window as any).__externalLinks = [];
  });
  await page.route("**/api/v1/content/banners/BASE", route => route.fulfill({ json: banner }));
  await page.route("https://assets.example.test/**", route => route.fulfill({ contentType: "image/webp", path: "e2e/fixtures/banner.webp" }));
  await page.goto(launch("/base"));
  const placement = page.getByLabel("Promotional banner placement");
  await expect(placement).toBeVisible();
  await expect(placement.locator("a")).toHaveAttribute("href", destination);
  await page.evaluate(() => {
    const app = window.Telegram?.WebApp;
    if (!app) throw new Error("Official local Telegram SDK did not initialize");
    app.openLink = url => { (window as any).__externalLinks.push(url); };
  });
  await placement.locator("img").click();
  expect(await page.evaluate(() => (window as any).__externalLinks)).toEqual([destination]);
  expect(new URL(page.url()).pathname).toBe("/base");
});
