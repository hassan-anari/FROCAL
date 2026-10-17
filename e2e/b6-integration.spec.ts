import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { prepareClan } from "./b6-fixture";
import { launch } from "./b4-fixture";
const published = JSON.parse(readFileSync("src/integrations/api/fixtures/b6/activity-http.json", "utf8"));
const standing = JSON.parse(readFileSync("src/integrations/api/fixtures/b6/clan-standing-http.json", "utf8"));
const applicants = JSON.parse(readFileSync("src/integrations/api/fixtures/b6/applicants-http.json", "utf8"));

test("new feed pending/failure/empty and recovery stay inside the existing HQ card", async ({ page }) => {
  const f = await prepareClan(page); const release = f.hold("/activity");
  await page.goto(launch("/clan")); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Checking recent Clan activity…" })).toBeVisible();
  f.failures.add("/activity"); release(); await expect(page.getByText("Recent activity couldn't refresh.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible(); f.failures.clear();
  await page.getByRole("button", { name: "Retry", exact: true }).click(); await expect(page.getByText("No recent activity yet")).toBeVisible();
});

test("activity pagination retries, suppresses stable duplicates and retains source timestamps/background content", async ({ page }) => {
  const f = await prepareClan(page); let failNext = true; let failFirst = false;
  await page.route("**/api/v1/clans/activity?*", async route => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    if (cursor && failNext || !cursor && failFirst) return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
    return route.fulfill({ json: cursor ? { ...published[1], items: [published[0].items[0], ...published[1].items] } : published[0] });
  });
  await page.goto(launch("/clan")); const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Recent activity", exact: true }) }).last();
  await expect(card.locator("[data-activity-id]")).toHaveCount(2); await card.getByRole("button", { name: "Earlier activity", exact: true }).click();
  await expect(card.getByText("Recent activity couldn't refresh.")).toBeVisible(); await expect(card.locator("[data-activity-id]")).toHaveCount(2);
  failNext = false; await card.getByRole("button", { name: "Retry", exact: true }).click();
  const expected = new Set([...published[0].items, ...published[1].items].map((row: any) => row.id)); await expect(card.locator("[data-activity-id]")).toHaveCount(expected.size);
  for (const row of [...published[0].items, ...published[1].items]) await expect(card.locator(`[data-activity-id="${row.id}"] time`)).toHaveAttribute("datetime", row.occurred_at);
  failFirst = true; await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await expect(card.getByText("Recent activity couldn't refresh.")).toBeVisible(); await expect(card.locator("[data-activity-id]")).toHaveCount(expected.size);
  expect(f.calls.filter(call => call.method !== "GET")).toHaveLength(0);
});

for (const width of [320, 390, 460]) test(`authoritative #1/zero XP and applicant rank status/Streak preserve layout at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); const f = await prepareClan(page);
  Object.assign(f.data.home, standing.home); Object.assign(f.identity, { rank: 1, rank_status: "RANKED", score: 3 }); f.setApplicants(applicants.ready);
  await page.goto(launch("/clan")); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  const standingPanel = page.locator("section").filter({ has: page.getByText("SEASON STANDING", { exact: true }) }).last(); await expect(standingPanel.getByText("#1", { exact: true })).toBeVisible(); await expect(page.getByText("0% ready", { exact: true })).toBeVisible(); await expect(page.getByText("0 credits", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /recruits waiting/ }).click(); const dialog = page.getByRole("dialog"); await expect(dialog).toContainText("Unranked"); await expect(dialog).toContainText("0d"); await expect(dialog).toContainText("1d"); await expect(dialog).toContainText("STREAK");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("resume refreshes page one to discover late-finalized events at their original source time", async ({ page }) => {
  await prepareClan(page); let late = false, firstPageReads = 0;
  const event = published[1].items[0];
  await page.route("**/api/v1/clans/activity?*", route => { firstPageReads++; return route.fulfill({ json: { ...published[0], items: late ? [...published[0].items, event] : published[0].items } }); });
  await page.goto(launch("/clan")); await expect(page.locator("[data-activity-id]")).toHaveCount(2);
  late = true; await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(`[data-activity-id="${event.id}"] time`)).toHaveAttribute("datetime", event.occurred_at);
  expect(firstPageReads).toBe(2); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
});
