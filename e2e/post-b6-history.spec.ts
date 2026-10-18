import { expect, test } from "@playwright/test";
import { TransactionHistoryIcon } from "@hugeicons/core-free-icons";
import { prepareClan } from "./b6-fixture";
import { launch } from "./b4-fixture";

const sources = ["DAILY", "MISSION", "TYPING", "REFERRAL", "CREATOR", "NETWORK_SPEAKER", "CLAN_ACTIVITY", "OTHER_CONFIRMED"];
const row = (id: number) => ({ id, source_type: sources[id % sources.length], context: "PLAYER", player_amount: id % 3 === 0 ? -3 : id % 3 === 1 ? 0 : 7, occurred_at: "2026-10-16T10:10:00Z" });

for (const width of [320, 390, 460]) test(`global History is lazy, mixed, independent and stable at ${width}`, async ({ page }) => {
  test.setTimeout(90_000); await page.setViewportSize({ width, height: 740 }); await prepareClan(page);
  let records = Array.from({ length: 42 }, (_, i) => row(100 - i));
  const globalReads: (string | null)[] = []; let networkReads = 0;
  let releaseFirst!: () => void, releaseNext!: () => void;
  let firstGate: Promise<void> | undefined = new Promise(done => { releaseFirst = done; });
  let nextGate: Promise<void> | undefined = new Promise(done => { releaseNext = done; });
  await page.route("**/api/v1/rewards/history?*", async route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has("category")) {
      expect(params.get("category")).toBe("network"); networkReads++;
      return route.fulfill({ json: { items: [{ ...row(500), source_type: "CREATOR" }], next_cursor: null } });
    }
    expect(params.has("category")).toBe(false); expect(params.get("limit")).toBe("20");
    const cursor = params.get("cursor"); globalReads.push(cursor);
    if (cursor === null) await firstGate;
    if (cursor === "81") await nextGate;
    const remaining = records.filter(item => cursor === null || item.id < Number(cursor));
    const items = remaining.slice(0, 20);
    return route.fulfill({ json: { items, next_cursor: remaining.length > 20 ? items.at(-1)!.id : null } });
  });
  await page.goto(launch("/earn")); await expect.poll(() => networkReads).toBe(1); expect(globalReads).toEqual([]);
  const history = page.getByRole("button", { name: "History", exact: true }); await history.scrollIntoViewIfNeeded();
  await expect(history.locator("svg")).toHaveCount(1);
  expect(await history.locator("svg path").evaluateAll(paths => paths.map(path => path.getAttribute("d"))))
    .toEqual(TransactionHistoryIcon.filter(([kind]) => kind === "path").map(([, attributes]) => attributes.d));
  expect(await history.evaluate(button => {
    const text = Array.from(button.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === "History")!;
    const range = document.createRange(); range.selectNodeContents(text);
    return button.firstElementChild?.tagName.toLowerCase() === "svg" && button.querySelector("svg")!.getBoundingClientRect().right <= range.getBoundingClientRect().left;
  })).toBe(true);
  expect((await history.boundingBox())!.height).toBe(38);
  await page.screenshot({ path: `docs/evidence/post-b6/${width}/earn-history-button.png`, animations: "disabled" });
  await history.click(); const sheet = page.getByRole("dialog", { name: "Earn history" });
  await expect(sheet.getByRole("status", { name: "Loading earnings…" })).toBeVisible();
  await expect(sheet).toContainText("Your confirmed XP and reward history");
  releaseFirst(); firstGate = undefined; await expect(sheet.locator("article")).toHaveCount(20);
  expect(globalReads).toEqual([null]); // A first page never downloads the entire ledger.
  for (const source of sources) await expect(sheet.locator("article strong").filter({ hasText: source.replaceAll("_", " ") }).first()).toBeAttached();
  const amounts = await sheet.locator("article em").allTextContents(); expect(amounts).toEqual(expect.arrayContaining(["+7 XP", "-3 XP", "0 XP"]));
  await sheet.locator("article").first().evaluate(el => { (el as HTMLElement).dataset.confirmedRow = "retained"; });
  await sheet.getByRole("button", { name: "Load more", exact: true }).scrollIntoViewIfNeeded();
  await expect(sheet.getByRole("button", { name: "Loading more…", exact: true })).toBeDisabled();
  await expect.poll(() => globalReads.filter(cursor => cursor === "81").length).toBe(1);
  await expect(sheet.locator("article[data-confirmed-row=retained]")).toBeAttached();
  await expect(sheet.getByRole("status", { name: "Loading earnings…" })).toHaveCount(0);
  releaseNext(); nextGate = undefined; await expect(sheet.locator("article")).toHaveCount(40);
  await sheet.locator("article").last().scrollIntoViewIfNeeded(); await expect(sheet.locator("article")).toHaveCount(42);
  await expect(sheet.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
  expect(globalReads).toEqual([null, "81", "61"]);
  records = [row(101), ...records];
  firstGate = new Promise(done => { releaseFirst = done; });
  await sheet.locator("article").first().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => globalReads.length).toBe(4);
  await expect(sheet.locator("article[data-confirmed-row=retained]")).toBeAttached();
  await expect(sheet.locator("article")).toHaveCount(42);
  await expect(sheet.getByRole("status", { name: "Loading earnings…" })).toHaveCount(0);
  releaseFirst(); firstGate = undefined; await expect(sheet.locator("article")).toHaveCount(43);
  expect(globalReads).toEqual([null, "81", "61", null, "82", "62"]);
  const beforeClose = globalReads.length; await sheet.evaluate(el => el.parentElement!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))); await expect(sheet).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("focus"))); expect(globalReads).toHaveLength(beforeClose);
  await history.click(); await expect(sheet.locator("article")).toHaveCount(43);
  await expect(sheet.locator("article em")).toHaveText(records.map(item => `${item.player_amount > 0 ? "+" : ""}${item.player_amount} XP`));
  await sheet.locator("article").first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/evidence/post-b6/${width}/global-history-mixed.png`, animations: "disabled" });
});

test("global empty/error retry is independent of Network history and never shows private diagnostics", async ({ page }) => {
  await prepareClan(page); let failed = true;
  await page.route("**/api/v1/rewards/history?*", route => {
    const network = new URL(route.request().url()).searchParams.get("category") === "network";
    return route.fulfill(!network && failed ? { status: 503, json: { detail: "private diagnostic" } } : { json: { items: [], next_cursor: null } });
  });
  await page.goto(launch("/earn")); await page.getByRole("button", { name: "History", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Earn history" });
  await expect(sheet).toContainText("Earnings couldn't load."); await expect(sheet).not.toContainText("private diagnostic");
  failed = false; await sheet.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(sheet).toContainText("No rewards yet"); await expect(sheet.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
});
