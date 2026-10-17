import { expect, test } from "@playwright/test";
import { prepareClan } from "./b6-fixture";
import { launch } from "./b4-fixture";

test("initial entry resolves membership and HQ before exposing the destination", async ({ page }) => {
  const f = await prepareClan(page);
  const stateDone = f.hold("/state"), memberDone = f.hold("/membership/current"), hqDone = f.hold("/home");
  await page.goto(launch("/clan"));
  await expect(page.getByRole("status", { name: "Connecting to your Clan…" })).toBeVisible();
  const intermediate = () => expect(page.getByRole("heading", { name: /Headquarters access locked|Choose where you stand|Register your headquarters|Find your seasonal home/ })).toHaveCount(0);
  await intermediate(); stateDone(); await expect.poll(() => f.reads.includes("/membership/current")).toBe(true); await intermediate();
  memberDone(); await expect(page.getByRole("status", { name: "Preparing your headquarters…" })).toBeVisible(); await intermediate();
  hqDone(); await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  expect(f.calls.filter(call => call.method !== "GET")).toEqual([]);
});
test("initial failure has an integrated retry and cannot unlock from historical local state", async ({ page }) => {
  const f = await prepareClan(page); f.failures.add("/state");
  await page.goto(launch("/clan"));
  await expect(page.getByText("Clan couldn't load. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose where you stand." })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("private diagnostic");
  f.failures.clear(); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
});
test("HQ initial failure recovers without removing the confirmed role", async ({ page }) => {
  const f = await prepareClan(page); f.failures.add("/equipment");
  await page.goto(launch("/clan"));
  await expect(page.getByText("Headquarters couldn't load fully.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Register your headquarters." })).toHaveCount(0);
  f.failures.clear(); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
});
test("Captain groups use loading, retry and empty states with a neutral environment-based add-bot link", async ({ page }) => {
  const f = await prepareClan(page); f.setMembership(null);
  const finish = f.hold("/eligible-groups");
  await page.goto(launch("/clan"));
  await expect(page.getByRole("status", { name: "Finding your Telegram groups…" })).toBeVisible();
  f.failures.add("/eligible-groups"); finish();
  await expect(page.getByText("Groups couldn't load.", { exact: true })).toBeVisible();
  f.failures.clear(); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No eligible groups yet", { exact: true })).toBeVisible();
  await page.evaluate(() => { window.Telegram!.WebApp!.openTelegramLink = url => { (window as any).__botLink = url; }; });
  await page.getByRole("button", { name: "Add Dalexio Bot to a group", exact: true }).click();
  const url = new URL(await page.evaluate(() => (window as any).__botLink));
  expect(url.pathname).toBe("/DalexioTestBot"); expect(url.searchParams.get("startgroup")).toBe(""); expect(url.searchParams.has("start")).toBe(false);
  await expect(page.getByRole("button", { name: "Refresh groups", exact: true })).toBeEnabled();
});
test("Soldier requests resolve before discovery; accepted is never membership", async ({ page }) => {
  const f = await prepareClan(page); f.data.state.role = "SOLDIER"; f.setMembership(null); f.setOwn(f.lifecycle.pending_request.map((row: any) => ({ ...row, ...f.lifecycle.accepted_request, reserves_capacity: true, credential_unresolved: true, invite_state: "ACTIVE" })));
  const finish = f.hold("/join-requests/current");
  await page.goto(launch("/clan"));
  await expect(page.getByRole("status", { name: "Connecting to your Clan…" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Clan discovery sections" })).toHaveCount(0);
  finish(); await expect(page.getByRole("navigation", { name: "Clan discovery sections" })).toBeVisible();
  await expect(page.getByText("REQUEST ACCEPTED", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toHaveCount(0);
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Clan status" });
  await expect(dialog).toContainText("No active membership"); await expect(dialog).toContainText("Accepted · verify Telegram membership");
  await expect(dialog).not.toContainText("Current credential"); await expect(dialog).not.toContainText("Delivery");
});
test("discovery pending, failure, empty and preview retry use integrated states", async ({ page }) => {
  const f = await prepareClan(page); f.data.state.role = "SOLDIER"; f.setMembership(null);
  const finish = f.hold("/"); await page.goto(launch("/clan"));
  await expect(page.getByRole("status", { name: "Finding clans…" })).toBeVisible();
  f.failures.add("/"); finish(); await expect(page.getByText("Clans couldn't load.", { exact: true })).toBeVisible();
  f.failures.clear(); f.setClans([]); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No clans found", { exact: true })).toBeVisible();
  f.setClans([f.identity]); await page.reload();
  f.failures.add(`/${f.identity.id}`);
  await page.getByRole("button").filter({ hasText: f.identity.name }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Clan couldn't load. Please try again.");
  f.failures.clear(); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(f.identity.name);
});

test("distinguishes progression lock, unselected role and Captain registration from API failure", async ({ page }) => {
  const f = await prepareClan(page); f.setMembership(null); f.data.state.eligible = false; f.data.state.role = null;
  await page.goto(launch("/clan")); await expect(page.getByRole("heading", { name: "Headquarters access locked" })).toBeVisible();
  f.data.state.eligible = true; await page.reload(); await expect(page.getByRole("heading", { name: "Choose where you stand." })).toBeVisible();
  f.data.state.role = "CAPTAIN"; await page.reload(); await expect(page.getByRole("heading", { name: "Register your headquarters." })).toBeVisible();
  expect(f.calls.every(call => call.method === "GET")).toBe(true);
});
test("request error and unsafe legacy reservations stay persistent and read-only", async ({ page }) => {
  const f = await prepareClan(page); f.data.state.role = "SOLDIER"; f.setMembership(null); f.failures.add("/join-requests/current");
  await page.goto(launch("/clan")); await expect(page.getByText("Clan requests couldn't load. Refresh status to try again.")).toBeVisible();
  f.failures.clear(); const row = f.lifecycle.pending_request[0];
  f.setOwn([row, { ...row, id: row.id + 1 }]); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Your Clan requests need review before you can continue. Refresh your status or contact support.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Clan discovery sections" })).toBeVisible();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel request", exact: true })).toHaveCount(0);
  f.setOwn([{ ...row, is_current_season: false, handling: "OPERATOR_REQUIRED" }]);
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("This request needs help from support");
  await expect(page.getByRole("button", { name: "Check invite and access" })).toHaveCount(0);
  expect(f.calls.every(call => call.method === "GET")).toBe(true);
});
test("server membership verification automatically replaces accepted discovery with HQ on resume", async ({ page }) => {
  const f = await prepareClan(page); f.data.state.role = "SOLDIER"; f.setMembership(null);
  f.setOwn(f.lifecycle.pending_request.map((row: any) => ({ ...row, ...f.lifecycle.accepted_request, reserves_capacity: true, credential_unresolved: true })));
  await page.goto(launch("/clan")); await expect(page.getByText("REQUEST ACCEPTED", { exact: true })).toBeVisible();
  f.setMembership({ ...f.member, role: "SOLDIER" }); f.setOwn([]);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await expect(page.getByText("REQUEST ACCEPTED", { exact: true })).toHaveCount(0);
});
test("Clan status pending and failed recovery reads stay inside the approved modal", async ({ page }) => {
  const f = await prepareClan(page); const finish = f.hold("/recovery");
  await page.goto(launch("/clan")); await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await expect(page.getByRole("status", { name: "Checking Clan status…" })).toBeVisible();
  f.failures.add("/recovery"); finish();
  await expect(page.getByRole("dialog")).toContainText("Clan status couldn't load fully.");
  await expect(page.getByRole("button", { name: "Request dissolution", exact: true })).toBeDisabled();
  f.failures.clear(); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Available");
});
test("Captain candidate photos and absent counts retain approved fallbacks; registration stays 46px", async ({ page }) => {
  const f = await prepareClan(page); f.setMembership(null);
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const group = { id: 1, title: "Eligible Telegram Home", username: "", verification_state: "CANDIDATE", member_count: null, image_url: `${origin}/api/v1/profile/group-avatar/00000000-0000-4000-8000-000000000091?token=photo` };
  f.setGroups([group]);
  await page.route("**/profile/group-avatar/*", route => route.fulfill({ contentType: "image/png", path: "e2e/fixtures/b5/community-photo.png" }));
  await page.route("**/clans/eligible-groups/1/verify", route => route.fulfill({ json: { ...group, verification_state: "VERIFIED" } }));
  await page.goto(launch("/clan")); const candidate = page.getByRole("button").filter({ hasText: "Eligible Telegram Home" }).first();
  await expect(candidate).toContainText("Member count unavailable"); await expect(candidate.locator("img")).toBeVisible();
  await candidate.click(); const register = page.getByRole("button", { name: "Register clan headquarters", exact: true });
  await expect(register).toBeEnabled(); expect((await register.boundingBox())!.height).toBe(46);
  expect(f.calls.some(call => call.path === "/" && call.method === "POST")).toBe(false);
});

test("zero whole Treasury credits and zero HQ XP remain zero despite a nonzero Clan Score", async ({ page }) => {
  const f = await prepareClan(page);
  Object.assign(f.data.home, { hq_level: 1, hq_xp: 0, current_threshold: 0, next_threshold: 1000, progress_to_next: 0, max_level: false, treasury_balance: 0, own_contribution: 3, total_contribution: 3, competitive_score: 3 });
  Object.assign(f.data.treasury, { balance: 0, earned_total: 0, history: [] });
  await page.goto(launch("/clan"));
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await expect(page.getByText("0 credits", { exact: true })).toBeVisible();
  await expect(page.getByText("0%", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("3 clan score", { exact: true })).toBeVisible();
  expect(f.calls.every(call => call.method === "GET")).toBe(true);
});

test("Captain inbox remains reachable while requests load or fail and retries into an empty list", async ({ page }) => {
  const f = await prepareClan(page); const finish = f.hold("/applicants");
  await page.goto(launch("/clan"));
  await page.getByRole("button").filter({ hasText: "CAPTAIN INBOX" }).click();
  await expect(page.getByRole("status", { name: "Checking join requests…" })).toBeVisible();
  f.failures.add("/applicants"); finish();
  await expect(page.getByRole("dialog")).toContainText("Join requests couldn't refresh.");
  f.failures.clear(); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("No join requests yet");
});
