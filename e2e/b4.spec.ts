import { expect, test } from "@playwright/test";
import { fixture, launch, prepareB4 } from "./b4-fixture";

test("confirmed Daily reveal uses exact XP then level-up; refresh and duplicate responses never reveal", async ({ page }) => {
  const state = await prepareB4(page); state.dailyDelay = 600;
  await page.goto(launch("/earn"));
  await page.getByRole("button", { name: "Claim daily core" }).click();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText("+80 XP");
  expect(state.calls.filter(c => c.path === "/daily/claim")).toHaveLength(1);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Dexo level up" })).toBeVisible();
  await page.getByRole("button", { name: "Return to Earn", exact: true }).click();
  await expect(page.getByLabel("Earn summary")).toContainText("350");
  await expect(page.locator("main")).not.toContainText(/Daily reward claimed:|Streak:|Resets 10\//);
  await page.reload();
  await expect(page.getByRole("button", { name: "Claimed today", exact: true })).toBeDisabled();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toHaveCount(0);
});

test("Mission settlement keeps Daily unchanged, reveals exact reward and has one Completed label", async ({ page }) => {
  const state = await prepareB4(page); state.missionDelay = 800;
  const key = fixture.mission_claim.response.key;
  state.missions = state.missions.map((m: any) => ({ ...m, state: m.key === key ? "REWARD_READY" : m.state }));
  await page.goto(launch("/earn"));
  const daily = page.getByRole("button", { name: "Claim daily core", exact: true });
  await expect(daily).toBeEnabled();
  await page.getByRole("button", { name: `Claim ${fixture.mission_claim.response.reward_amount} XP`, exact: true }).click();
  await expect(daily).toHaveText("Claim daily core");
  await expect(daily).toBeEnabled();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText(`+${fixture.mission_claim.response.reward_amount} XP`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const archive = page.getByRole("region", { name: "Completed missions" });
  await expect(archive.getByText("Completed", { exact: true })).toHaveCount(1);
});

test("Typing Claim exists only on Earn dashboard and uses RewardReveal", async ({ page }) => {
  await prepareB4(page);
  await page.goto(launch("/earn/typing"));
  await expect(page.getByRole("heading", { name: "Type with intent." })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Claim / })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/Resets \d|Typing reward claimed/);
  await page.getByRole("button", { name: "Back to Typing tab", exact: true }).click();
  await page.getByRole("button", { name: "Claim 70 XP", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText("+70 XP");
});

test("Profile uses actual entitlements; save waits for confirmation, updates frame immediately and persists on refresh", async ({ page }) => {
  const state = await prepareB4(page); state.saveDelay = 800;
  await page.goto(launch("/profile"));
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Customize profile" });
  await expect(dialog.getByRole("button", { name: "Founder locked", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Premium", exact: true }).click();
  await expect(dialog.locator('[class*="frame"]').first()).toBeVisible();
  await dialog.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save profile", exact: true })).toBeDisabled();
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeHidden();
  expect(state.customization.active_frame).toBe("premium");
  await expect(page.locator('[class*="frame"]').first()).toHaveAttribute("src", /premium/);
  await page.reload();
  await expect(page.locator('[class*="frame"]').first()).toHaveAttribute("src", /premium/);
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Achievements", exact: true }).click();
  await page.getByText("First Verified Activity", { exact: true }).click();
  await expect(page.getByRole("dialog", { name: "First Verified Activity" })).toContainText("5 / 200");
  await expect(page.getByRole("dialog", { name: "First Verified Activity" })).not.toContainText("146");
});

test("rejected Profile save leaves draft open and uses the minimal transient error", async ({ page }) => {
  const state = await prepareB4(page); state.saveError = true;
  await page.goto(launch("/profile"));
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Customize profile" });
  await dialog.getByRole("button", { name: "Premium", exact: true }).click();
  await dialog.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Your profile couldn't be saved.");
  const feedbackLayer = await page.getByRole("alert").evaluate(el => Number(getComputedStyle(el.parentElement!).zIndex));
  const sheetLayer = await dialog.evaluate(el => Number(getComputedStyle(el.parentElement!).zIndex));
  expect(feedbackLayer).toBeGreaterThan(sheetLayer);
  expect(state.customization.active_frame).toBe("standard");
});

test("Network refreshes on entry/return/resume, preserves pending invitees and exposes no manual controls", async ({ page }) => {
  const state = await prepareB4(page);
  await page.goto(launch("/earn"));
  await page.getByRole("button", { name: "Network", exact: true }).click();
  await expect(page.getByText("Start Invitee", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /broadcast|Check status/i })).toHaveCount(0);
  const reads = state.calls.filter(c => c.path === "/network/groups").length;
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Profile", exact: true }).click();
  state.groups.items[0].title = "Updated community";
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await expect(page.getByText("Updated community", { exact: true })).toBeVisible();
  expect(state.calls.filter(c => c.path === "/network/groups").length).toBeGreaterThan(reads);
  expect(state.calls.filter(c => c.path.includes("broadcast-consent") || c.path.endsWith("/reverify"))).toHaveLength(0);
});

test("Arena binds server order, own standing and scroll pagination while Warfront stays locked", async ({ page }) => {
  const state = await prepareB4(page);
  await page.goto(launch("/arena"));
  await expect(page.getByRole("button", { name: "Unlocks in Season 2", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Rankings", exact: true }).click();
  await expect(page.getByText("Explorer 1", { exact: true })).toBeVisible();
  await page.getByText("Explorer 30", { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText("Explorer 32", { exact: true })).toHaveCount(1);
  await expect(page.getByText("#50", { exact: true })).toHaveCount(1);
  expect(state.calls.some(c => c.query.includes("offset=30"))).toBe(true);
  await page.getByRole("button", { name: "Clans", exact: true }).click();
  await expect(page.getByText("Verified Clan", { exact: true })).toBeVisible();
  await expect(page.getByText("No clan standing yet", { exact: true })).toBeVisible();
});

test("existing Notification Center persists confirmed read state without a duplicate center", async ({ page }) => {
  const state = await prepareB4(page);
  await page.goto(launch("/profile"));
  await page.getByRole("button", { name: "Open notifications", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: /Mission complete/ }).click();
  await expect(page.getByRole("button", { name: "Mark all read", exact: true })).toHaveCount(0);
  expect(state.notifications[0].unread).toBe(false);
  await page.reload();
  await page.getByRole("button", { name: "Open notifications", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark all read", exact: true })).toHaveCount(0);
});

test("referral and community photos reuse existing avatar wells and failed private images show initials", async ({ page }) => {
  const state = await prepareB4(page);
  state.invitees.items[0].photo_url = "http://127.0.0.1:4174/api/v1/profile/avatar/00000000-0000-4000-8000-000000000002?token=synthetic";
  state.groups.items[0].photo_url = "http://127.0.0.1:4174/api/v1/profile/group-avatar/00000000-0000-4000-8000-000000000003?token=synthetic";
  await page.route("**/profile/avatar/*?token=synthetic", route => route.fulfill({ contentType: "image/webp", path: "public/assets/profile/seasonal-medal-top-10-percent.webp" }));
  await page.route("**/profile/group-avatar/*?token=synthetic", route => route.fulfill({ status: 410 }));
  await page.goto(launch("/earn"));
  await page.getByRole("button", { name: "Network", exact: true }).click();
  const invite = page.getByRole("article").filter({ has: page.getByText("Start Invitee", { exact: true }) });
  await expect(invite.locator("img")).toBeVisible();
  expect(await invite.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const group = page.getByRole("article", { name: state.groups.items[0].title });
  await group.scrollIntoViewIfNeeded();
  await expect(group.locator("img")).toHaveCount(0);
  await expect(group).toContainText(state.groups.items[0].title.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase());
  state.invitees.items[0].photo_url = "http://127.0.0.1:4174/api/v1/profile/avatar/00000000-0000-4000-8000-000000000004?token=synthetic-broken";
  state.groups.items[0].photo_url = "http://127.0.0.1:4174/api/v1/profile/group-avatar/00000000-0000-4000-8000-000000000005?token=synthetic-valid";
  await page.route("**/profile/avatar/*?token=synthetic-broken", route => route.fulfill({ status: 410 }));
  await page.route("**/profile/group-avatar/*?token=synthetic-valid", route => route.fulfill({ contentType: "image/webp", path: "public/assets/profile/seasonal-medal-top-10-percent.webp" }));
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await expect(invite.locator("img")).toHaveCount(0);
  await expect(invite).toContainText("SI");
  await group.scrollIntoViewIfNeeded();
  await expect(group.locator("img")).toBeVisible();
  expect(await group.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test("Notification Center uses documented safe links and server read-all while ignoring payload URLs", async ({ page }) => {
  const state = await prepareB4(page);
  state.notifications[0].deep_link = { path: "//attacker.example" };
  await page.goto(launch("/profile"));
  await page.getByRole("button", { name: "Open notifications", exact: true }).click();
  await page.getByRole("button", { name: /Mission complete/ }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  state.notifications[0] = { ...state.notifications[0], unread: true, read_at: null, deep_link: { path: "/earn" } };
  await page.getByRole("button", { name: "Close notifications", exact: true }).click();
  await page.getByRole("button", { name: "Open notifications", exact: true }).click();
  await page.getByRole("button", { name: "Mark all read", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark all read", exact: true })).toHaveCount(0);
  expect(state.calls.filter(c => c.path === "/notifications/read-all")).toHaveLength(1);
  await page.getByRole("button", { name: /Mission complete/ }).click();
  await expect(page).toHaveURL(/\/earn/);
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toHaveCount(0);
});

test("Typing TODAY renders actual server score and restarts stale pagination at the authoritative reset", async ({ page }) => {
  const state = await prepareB4(page);
  const run = state.history.items[0];
  state.history = { ...state.history, period_key: "2026-10-14T10:00:00+00:00", period_start: "2026-10-14T10:00:00Z", period_end: "2026-10-15T10:00:00Z" };
  state.history.items = Array.from({ length: 20 }, (_, i) => ({ ...run, reset_period: state.history.period_key, attempt_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}` }));
  state.history.next_cursor = 20;
  await page.goto(launch("/earn"));
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  const history = page.locator("[data-typing-history]");
  await expect(history.locator("article")).toHaveCount(20);
  await expect(history.locator("article").first().locator("em")).toHaveText(Number(run.score).toLocaleString("en-US"));
  await expect(page.getByText("Run history is unavailable.", { exact: true })).toHaveCount(0);
  expect(state.calls.some(c => c.path === "/typing/history" && c.query.includes("period=current"))).toBe(true);
  state.historyPeriodChanged = true;
  state.history = { ...state.history, period_key: "2026-10-16T00:00:00+00:00", period_start: "2026-10-16T00:00:00Z", period_end: "2026-10-17T00:00:00Z", items: [], next_cursor: null };
  await history.locator("article").last().scrollIntoViewIfNeeded();
  await expect(history.locator("article")).toHaveCount(0);
  await expect(history.getByText("No runs today.", { exact: true })).toBeVisible();
  expect(state.calls.some(c => c.path === "/typing/history" && c.query.includes("cursor=20"))).toBe(true);
});
