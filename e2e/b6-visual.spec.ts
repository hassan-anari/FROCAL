import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { prepareClan } from "./b6-fixture";
import { launch } from "./b4-fixture";
const before = Boolean(process.env.B6_BASELINE);
const phase = before ? "before" : "after";
const buttonDesign = (el: Element) => {
  const s = getComputedStyle(el);
  return { height: s.height, padding: s.padding, border: s.border, background: s.backgroundColor, radius: s.borderRadius, fontSize: s.fontSize, fontWeight: s.fontWeight, gap: s.gap };
};
for (const width of [320, 390, 460]) test(`B6 preserved scenes and corrected async surfaces ${phase} ${width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 844 });
  const f = await prepareClan(page);
  const dir = `docs/evidence/b6/${width}`; mkdirSync(dir, { recursive: true });
  // Phase 4 authorizes the Season eyebrow and intro copy, with no design changes.
  const masks = (name: string) => name === "preserved-profile" ? [page.locator('[class*="identityCopy"] > span')] : name === "preserved-arena" ? [page.locator("main > header > p")] : [];
  const shot = async (name: string) => {
    // Let the existing 450ms artwork fade finish; this is capture stabilization only.
    await page.waitForTimeout(650);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).filter(img => img.complete).map(img => img.decode().catch(() => {}))); });
    await page.screenshot({ mask: masks(name), path: `${dir}/${phase}-${name}.png`, animations: "disabled" });
  };
  const finish = f.hold("/state");
  await page.goto(launch("/clan"));
  await expect.poll(() => f.reads.includes("/state")).toBe(true);
  if (!before) {
    await expect(page.getByRole("status", { name: "Connecting to your Clan…" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Register your headquarters." })).toHaveCount(0);
  }
  await shot("clan-initial"); finish();
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  const status = page.getByRole("button", { name: "Clan status", exact: true });
  const statusDesign = await status.evaluate(buttonDesign);
  const dimensions = await status.evaluate(el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right, headerRight: el.closest("header")!.getBoundingClientRect().right, iconCount: el.querySelectorAll("svg").length }));
  writeFileSync(`${dir}/${phase}-computed.json`, JSON.stringify(dimensions, null, 2) + "\n");
  if (!before) { expect(dimensions.width).toBeLessThan(150); expect(dimensions.iconCount).toBe(1); expect(Math.abs(dimensions.right - dimensions.headerRight)).toBeLessThan(3); }
  await shot("captain-hq");
  // Crop the immutable HQ scene to prove header/status changes do not alter the approved scene.
  await page.locator('section').filter({ has: page.locator('h2').filter({ hasText: f.identity.name }) }).first().screenshot({ path: `${dir}/${phase}-hq-scene.png`, animations: "disabled" });
  await status.click(); await expect(page.getByRole("dialog", { name: "Clan status" })).toBeVisible(); await shot("clan-status");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  f.failures.add("/home");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  if (!before) { await expect(page.getByText("Some Clan details couldn't refresh.")).toBeVisible(); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible(); }
  else await page.waitForTimeout(250);
  await shot("hq-refresh-error");
  f.failures.clear(); f.setMembership(null);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Choose your headquarters group" })).toBeVisible();
  await shot("captain-groups-empty");
  const group = { id: 1, title: "Eligible Telegram Home", username: "", member_count: null, image_url: null };
  f.setGroups([group]);
  await page.route("**/clans/eligible-groups/1/verify", route => route.fulfill({ json: { ...group, verification_state: "VERIFIED" } }));
  await page.reload();
  await page.getByRole("button").filter({ hasText: group.title }).first().click();
  const registration = page.getByRole("button", { name: "Register clan headquarters", exact: true });
  await registration.scrollIntoViewIfNeeded();
  const registrationHeight = (await registration.boundingBox())!.height;
  writeFileSync(`${dir}/${phase}-computed.json`, JSON.stringify({ ...dimensions, registrationHeight }, null, 2) + "\n");
  if (!before) expect(registrationHeight).toBe(46);
  await shot("captain-registration");
  let historyState: "error" | "empty" | "rows" = "error";
  let finishHistory!: () => void;
  const historyGate = new Promise<void>(resolve => { finishHistory = resolve; });
  await page.route("**/api/v1/rewards/history?*", async route => {
    await historyGate;
    if (historyState === "error") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
    return route.fulfill({ json: { items: historyState === "empty" ? [] : (new URL(route.request().url()).searchParams.get("category") === "network" ? ["CREATOR", "NETWORK_SPEAKER"] : ["CREATOR", "NETWORK_SPEAKER", "DAILY"]).map((source_type, i) => ({ id: 10 - i, source_type, context: "NETWORK_GROUP", player_amount: 20 - i, occurred_at: "2026-10-16T10:10:00Z" })), next_cursor: null } });
  });
  await page.goto(launch("/earn"));
  const history = page.getByRole("button", { name: "History", exact: true });
  // Clan status follows the approved live Earn History design at each width.
  if (!before) expect(statusDesign).toEqual(await history.evaluate(buttonDesign));
  await history.click();
  await expect(page.getByRole("dialog", { name: "Earn history" })).toBeVisible(); await shot("history-loading");
  finishHistory();
  await expect(page.getByRole("dialog")).toContainText(before ? "Rewards couldn't load." : "Earnings couldn't load."); await shot("history-error");
  historyState = "empty"; await page.reload(); await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(before ? "No rewards yet." : "No rewards yet"); await shot("history-empty");
  historyState = "rows"; await page.reload(); await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("dialog").locator("article")).toHaveCount(3); await shot("history-filtered");
  const b6Standing = JSON.parse(readFileSync("src/integrations/api/fixtures/b6/clan-standing-http.json", "utf8"));
  const b6Applicants = JSON.parse(readFileSync("src/integrations/api/fixtures/b6/applicants-http.json", "utf8"));
  const b6Activity = JSON.parse(readFileSync("src/integrations/api/fixtures/b6/activity-http.json", "utf8"));
  Object.assign(f.data.home, b6Standing.home);
  f.setMembership(f.member); f.setApplicants(b6Applicants.ready);
  f.data.activity = b6Activity[0];
  await page.goto(launch("/clan"));
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await page.getByText("SEASON STANDING", { exact: true }).scrollIntoViewIfNeeded();
  await shot("canonical-standing");
  await page.getByRole("button", { name: /recruits waiting/ }).click();
  await expect(page.getByRole("dialog")).toContainText(before ? "ACTIVE" : "STREAK");
  await shot("applicant-metrics");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("heading", { name: "Recent activity", exact: true }).scrollIntoViewIfNeeded();
  if (!before) await expect(page.locator("[data-activity-id]")).toHaveCount(b6Activity[0].items.length);
  await shot("source-activity");
  // Compare the unchanged positive-objective scene in both releases; Phase 4 separately tests removal of empty sections.
  f.app.missions = [{ ...f.app.missions[0], title: "Server objective", available: true, state: "AVAILABLE" }];
  for (const path of ["/base", "/profile", "/arena"]) {
    await page.goto(launch(path));
    await expect(page.locator("main")).toBeVisible();
    if (path === "/base") await expect(page.getByRole("region", { name: "Next objectives" }).locator("article h3")).toHaveText(["Server objective"]);
    if (path === "/profile") await expect(page.getByRole("button", { name: "Customize", exact: true })).toBeEnabled();
    if (path === "/arena") await expect(page.getByRole("button", { name: "Unlocks in Season 2" })).toBeDisabled();
    await page.waitForTimeout(400);
    await shot(`preserved-${path.slice(1)}`);
    if (!before) await expect(page).toHaveScreenshot([String(width), `before-preserved-${path.slice(1)}.png`], { mask: masks(`preserved-${path.slice(1)}`), animations: "disabled", maxDiffPixelRatio: .002 });
  }
});
