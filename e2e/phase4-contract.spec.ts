import { expect, test } from "@playwright/test";
import { fixture, launch, prepareB4 } from "./b4-fixture";
import { readFileSync } from "node:fs";
const read = (name: string) => JSON.parse(readFileSync(`src/integrations/api/fixtures/phase4/${name}.json`, "utf8"));
const two = read("registered-2"), six = read("registered-6"), three = read("configurable-3"), missions = read("missions");

function configure(state: Awaited<ReturnType<typeof prepareB4>>, profile = two, now = profile.server_time, allowed = false, status = "ACTIVE") {
  state.bootstrap.season = { ...state.bootstrap.season, ...profile.season, code: state.bootstrap.season.code, season_points: state.bootstrap.season.season_points, title: "Configurable Season" };
  state.bootstrap.server_time = now;
  state.bootstrap.gameplay = { moderation_state: "ACTIVE", reward_earning_allowed: allowed };
  state.bootstrap.features.base_tap = true;
  const claim = fixture.mission_claim.response;
  state.missions = state.missions.map((m: any) => ({ ...m, state: m.key === claim.key ? "REWARD_READY" : "AVAILABLE" }));
  state.missions.push({ ...missions[2], key: "additional-earning", title: "Additional earning", state: "AVAILABLE" });
  state.bootstrap.season.status = status;
}
async function rankings(page: import("@playwright/test").Page) {
  await page.goto(launch("/arena"));
  await expect(page.getByRole("button", { name: "Unlocks in Season 2", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Rankings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Configurable Season", exact: true })).toBeVisible();
}
for (const profile of [two, six, three]) test(`${profile.season.timing.product_period_days} days: Earning, exact cutoff, Closing, reload and resume`, async ({ page }) => {
  const state = await prepareB4(page);
  const cutoff = Date.parse(profile.season.timing.economic_ends_at);
  configure(state, profile, new Date(cutoff - 20_000).toISOString(), true);
  await page.clock.install();
  await rankings(page);
  await expect(page.getByText("EARNING ACTIVE", { exact: true })).toBeVisible();
  await page.clock.runFor(20_000);
  await expect(page.getByText("CLOSING", { exact: true })).toBeVisible();
  state.bootstrap.server_time = profile.season.timing.economic_ends_at;
  state.bootstrap.gameplay.reward_earning_allowed = false;
  await page.goto(launch("/earn"));
  await expect(page.getByRole("button", { name: "Earning unavailable", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Start mission", exact: true }).first()).toBeDisabled();
  const claim = page.getByRole("button", { name: `Claim ${fixture.mission_claim.response.reward_amount} XP`, exact: true });
  await expect(claim).toBeEnabled();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enter Typing Arena", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Claim 70 XP", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Enter Typing Arena", exact: true })).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: "Claim 70 XP", exact: true })).toBeEnabled();
  await page.goto(launch("/earn/typing"));
  await expect(page.getByRole("button", { name: "Start arena run", exact: true })).toBeDisabled();
  await page.goto(launch("/base"));
  await expect(page.getByRole("button", { name: "Interact with Dexo", exact: true })).toBeDisabled();
  expect(state.calls.filter(c => c.method === "POST" && ["/daily/claim", "/typing/attempts/start", "/typing/claim"].includes(c.path))).toHaveLength(0);
});
test("Closing preserves confirmed Mission and Typing claims and prevents duplicate submissions", async ({ page }) => {
  const state = await prepareB4(page); configure(state); state.missionDelay = 500;
  await page.goto(launch("/earn"));
  const mission = state.missions.find((m: any) => m.key === fixture.mission_claim.response.key);
  const title = mission.title || mission.key.replaceAll("-", " ");
  const claim = page.locator("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).getByRole("button");
  await claim.click(); await expect(claim).toBeDisabled();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText(`+${fixture.mission_claim.response.reward_amount} XP`);
  expect(state.calls.filter(c => c.path.endsWith("/claim") && c.path.startsWith("/missions"))).toHaveLength(1);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await page.getByRole("button", { name: "Claim 70 XP", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText("+70 XP");
  expect(state.calls.filter(c => c.path === "/typing/claim")).toHaveLength(1);
});
for (const status of ["CLOSED", "ARCHIVED"]) test(`${status}: disables earning and keeps standings/profile readable`, async ({ page }) => {
  const state = await prepareB4(page); configure(state, two, two.server_time, true, status);
  await rankings(page);
  await expect(page.getByText(status, { exact: true })).toBeVisible();
  await expect(page.getByText("Explorer 1", { exact: true })).toBeVisible();
  await page.goto(launch("/earn"));
  await expect(page.getByRole("button", { name: "Earning unavailable", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Claim \d+ XP$/ }).first()).toBeDisabled();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await expect(page.getByRole("button", { name: "Claim 70 XP", exact: true })).toBeDisabled();
  await page.goto(launch("/profile"));
  await expect(page.getByRole("button", { name: "Customize", exact: true })).toBeEnabled();
  await expect(page.getByText("Configurable Season Explorer", { exact: true })).toBeVisible();
});
test("new Mission keys remain visible and unsupported internal semantics cannot execute", async ({ page }) => {
  const state = await prepareB4(page); configure(state, two, two.season.starts_at, true);
  state.missions = missions;
  await page.goto(launch("/earn"));
  for (const m of missions) await expect(page.getByRole("heading", { name: m.title, exact: true })).toBeAttached();
  const unknown = page.locator("article").filter({ has: page.getByRole("heading", { name: "new-internal-key", exact: true }) });
  await expect(unknown.getByRole("button", { name: "Unavailable", exact: true })).toBeDisabled();
  const external = page.locator("article").filter({ has: page.getByRole("heading", { name: "new-reading-key", exact: true }) });
  await expect(external.getByRole("button", { name: "Start mission", exact: true })).toBeEnabled();
  expect(state.calls.filter(c => c.method === "POST" && c.path.startsWith("/missions"))).toHaveLength(0);
});

test("actual Closed backend shape: null Bootstrap Season retains archived standings and confirmed balances", async ({ page }) => {
  const state = await prepareB4(page); configure(state);
  state.bootstrap.season = null;
  state.bootstrap.features.season = false;
  const archived = { ...two.season, code: "historical-server-season", title: "Archived Configurable", status: "ARCHIVED" };
  await page.route("**/api/v1/arena/state", route => route.fulfill({ json: { season: null, seasons: [archived], warfront: { state: "LOCKED", available_season: 2, message: "Warfront arrives in Season 2" }, wallet_enabled: false, account_link_enabled: false } }));
  await page.goto(launch("/arena"));
  await page.getByRole("button", { name: "Rankings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Archived Configurable", exact: true })).toBeVisible();
  await expect(page.getByText("ARCHIVED", { exact: true })).toBeVisible();
  await expect(page.getByText("Explorer 1", { exact: true })).toBeVisible();
  expect(state.calls.some(c => c.path === "/arena/rankings/players" && c.query.includes("season=historical-server-season"))).toBe(true);
  await page.goto(launch("/base"));
  await expect(page.getByRole("button", { name: "Interact with Dexo", exact: true })).toBeDisabled();
  await expect.poll(() => state.calls.some(c => c.path === "/arena/dlx")).toBe(true);
});

for (const width of [320, 390, 460]) test(`Base objective eligibility and empty-section removal at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const state = await prepareB4(page);
  const m = { ...state.missions[0], title: "Authoritative objective" };
  const section = page.getByRole("region", { name: "Next objectives", exact: true });
  await page.goto(launch("/base"));
  for (const rows of [[], [{ ...m, state: "CLAIMED" }], [{ ...m, state: "UNAVAILABLE" }], [{ ...m, state: "AVAILABLE", available: false }]]) {
    state.missions = rows;
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/missions"), page.reload()]);
    await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeAttached();
    await expect(section).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Next Objective" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "All missions" })).toHaveCount(0);
    await expect(page.getByText("All missions cleared.", { exact: true })).toHaveCount(0);
  }
  state.missions = [{ ...m, state: "AVAILABLE" }];
  await page.reload();
  await expect(section.locator("article")).toHaveCount(1);
  state.missions = [
    { ...m, key: "available", title: "Available objective", state: "AVAILABLE" },
    { ...m, key: "working", title: "Working objective", state: "IN_PROGRESS" },
    { ...m, key: "vested", title: "Vested objective", state: "REWARD_READY", available: false },
    { ...m, key: "fourth", title: "Fourth objective", state: "AVAILABLE" },
  ];
  await page.reload();
  await expect(section.locator("article h3")).toHaveText(["Vested objective", "Working objective", "Available objective"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Base distinguishes pending and failed Mission reads from confirmed empty results and recovers on refresh", async ({ page }) => {
  const state = await prepareB4(page);
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  let reads = 0;
  let failed = true;
  await page.route("**/api/v1/missions", async route => {
    reads++; await gate;
    return route.fulfill(failed ? { status: 503, json: { detail: "private mission diagnostic" } } : { json: state.missions });
  });
  await page.goto(launch("/base"));
  await expect.poll(() => reads).toBeGreaterThan(0);
  await expect(page.getByRole("region", { name: "Next objectives" })).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "Objectives couldn't load" })).toHaveCount(0);
  await expect(page.getByText("All missions cleared.", { exact: true })).toHaveCount(0);
  finish();
  await expect(page.getByRole("alert")).toContainText("Objectives couldn't load. Please try again.");
  await expect(page.getByText("private mission diagnostic")).toHaveCount(0);
  failed = false;
  state.missions = [{ ...state.missions[0], title: "Refreshed objective" }];
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Base", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Refreshed objective", exact: true })).toBeVisible();
  state.missions = [];
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Base", exact: true }).click();
  await expect(page.getByRole("region", { name: "Next objectives" })).toHaveCount(0);
  await expect(page.getByText("All missions cleared.", { exact: true })).toHaveCount(0);
});

async function telegramMissionFixture(page: import("@playwright/test").Page, options: { inProgress?: boolean; failStart?: boolean; mismatch?: string; destination?: string | null } = {}) {
  const state = await prepareB4(page);
  const destination = options.destination === undefined ? "https://t.me/reviewed_channel" : options.destination;
  const mission = { ...state.missions[0], key: "join-reviewed-channel", title: "Join the reviewed channel", verification_family: "TELEGRAM", destination_url: destination, state: options.inProgress ? "IN_PROGRESS" : "AVAILABLE" };
  state.missions = [mission];
  let joined = false;
  const posts: string[] = [];
  let claims = 0;
  await page.route("**/api/v1/missions/*/*", route => {
    const path = new URL(route.request().url()).pathname;
    posts.push(path);
    if (path.endsWith("/start")) {
      if (options.failStart) return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
      state.missions[0].state = "IN_PROGRESS";
      if (options.mismatch === "definition") state.missions[0].destination_url = "https://t.me/replacement_channel";
      if (options.mismatch === "refresh-version") state.missions[0].version++;
      return route.fulfill({ json: { ...fixture.mission_start.response, key: options.mismatch === "key" ? "unrelated-key" : mission.key, version: options.mismatch === "version" ? mission.version + 1 : mission.version, destination_url: null, open_token: null } });
    }
    if (path.endsWith("/verify")) {
      state.missions[0].state = joined ? "REWARD_READY" : "IN_PROGRESS";
      return route.fulfill({ json: { ...fixture.mission_dwell_wait.response, key: mission.key, version: mission.version, state: state.missions[0].state } });
    }
    if (path.endsWith("/claim")) {
      claims++;
      state.missions[0].state = "CLAIMED";
      return route.fulfill({ json: { ...fixture.mission_claim.response, key: mission.key, version: mission.version, created: claims === 1 } });
    }
    return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
  });
  await page.goto(launch("/earn"));
  await page.evaluate(() => {
    (window as any).__telegramDestinations = [];
    window.Telegram!.WebApp!.openTelegramLink = url => { (window as any).__telegramDestinations.push(url); };
  });
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: mission.title, exact: true }) });
  const destinations = () => page.evaluate(() => (window as any).__telegramDestinations);
  return { state, mission, posts, card, destinations, join: () => { joined = true; }, claims: () => claims };
}
for (const width of [320, 390, 460]) test(`Telegram null-Start destination, return, reopen, membership and server Claim at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const h = await telegramMissionFixture(page);
  await h.card.getByRole("button", { name: "Start mission", exact: true }).click();
  await expect.poll(h.destinations).toEqual([h.mission.destination_url]);
  await expect(h.card.getByRole("button", { name: "Verify", exact: true })).toBeEnabled();
  expect(h.state.missions[0].state).toBe("IN_PROGRESS");
  expect(h.posts).toEqual([`/api/v1/missions/${h.mission.key}/start`]);
  await page.evaluate(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(h.card.getByRole("button", { name: "Verify", exact: true })).toBeEnabled();
  const starts = h.posts.length;
  await h.card.getByRole("button", { name: "Open Telegram", exact: true }).click();
  await expect.poll(h.destinations).toEqual([h.mission.destination_url, h.mission.destination_url]);
  expect(h.posts).toHaveLength(starts);
  await h.card.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(h.card.getByRole("button", { name: "Verify", exact: true })).toBeEnabled();
  expect(h.state.missions[0].state).toBe("IN_PROGRESS");
  expect(h.claims()).toBe(0);
  await expect(page.getByRole("dialog", { name: "XP reward" })).toHaveCount(0);
  h.join();
  await h.card.getByRole("button", { name: "Verify", exact: true }).click();
  const claim = h.card.getByRole("button", { name: `Claim ${h.mission.reward_amount} XP`, exact: true });
  await expect(claim).toBeEnabled();
  await claim.dblclick();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toContainText(`+${fixture.mission_claim.response.reward_amount} XP`);
  expect(h.claims()).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("an existing in-progress Telegram mission reopens without any Start mutation", async ({ page }) => {
  const h = await telegramMissionFixture(page, { inProgress: true });
  await h.card.getByRole("button", { name: "Open Telegram", exact: true }).click();
  await expect.poll(h.destinations).toEqual([h.mission.destination_url]);
  expect(h.posts).toEqual([]);
  await expect(h.card.getByRole("button", { name: "Verify", exact: true })).toBeEnabled();
});
test("native Telegram failure is truthful and leaves a safe retry plus Verify", async ({ page }) => {
  const h = await telegramMissionFixture(page);
  await page.evaluate(() => { window.Telegram!.WebApp!.openTelegramLink = () => { throw new Error("Isolated native failure"); }; });
  await h.card.getByRole("button", { name: "Start mission", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Telegram couldn't open. Use Open Telegram to try again.");
  await expect(h.card.getByRole("button", { name: "Verify", exact: true })).toBeEnabled();
  expect(h.state.missions[0].state).toBe("IN_PROGRESS");
  await page.evaluate(() => { window.Telegram!.WebApp!.openTelegramLink = url => { (window as any).__telegramDestinations.push(url); }; });
  await h.card.getByRole("button", { name: "Open Telegram", exact: true }).click();
  await expect.poll(h.destinations).toEqual([h.mission.destination_url]);
  expect(h.posts).toHaveLength(1);
});
for (const options of [{ failStart: true }, { mismatch: "key" }, { mismatch: "version" }, { mismatch: "definition" }, { mismatch: "refresh-version" }]) test(`Telegram refuses failed or stale Start: ${JSON.stringify(options)}`, async ({ page }) => {
  const h = await telegramMissionFixture(page, options);
  await h.card.getByRole("button", { name: "Start mission", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await h.destinations()).toEqual([]);
  expect(h.claims()).toBe(0);
});
for (const destination of [null, "javascript:alert(1)", "https://t.me.evil.example/channel"]) test(`Telegram refuses invalid list destination: ${destination}`, async ({ page }) => {
  const h = await telegramMissionFixture(page, { destination });
  await expect(h.card.getByRole("button", { name: "Unavailable", exact: true })).toBeDisabled();
  expect(h.posts).toEqual([]);
  expect(await h.destinations()).toEqual([]);
});
test("TIMED_EXTERNAL continues opening the Start response URL and verifying with its server token", async ({ page }) => {
  const state = await prepareB4(page);
  const destination = "https://reviewed-partner.example/offer?campaign=phase4";
  const token = "isolated-server-open-token";
  let verifyBody: unknown;
  await page.route("**/api/v1/missions/*/start", route => {
    state.missions[0].state = "IN_PROGRESS";
    return route.fulfill({ json: { ...fixture.mission_start.response, destination_url: destination, open_token: token } });
  });
  await page.route("**/api/v1/missions/*/verify", route => { verifyBody = route.request().postDataJSON(); return route.fulfill({ json: fixture.mission_dwell_wait.response }); });
  await page.goto(launch("/earn"));
  await page.evaluate(() => { window.Telegram!.WebApp!.openLink = url => { (window as any).__externalDestination = url; }; });
  await page.getByRole("button", { name: "Start mission", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__externalDestination)).toBe(destination);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect.poll(() => verifyBody).toEqual({ open_token: token });
  await expect(page.getByRole("button", { name: "Verify", exact: true })).toBeEnabled();
  await expect(page.getByRole("dialog", { name: "XP reward" })).toHaveCount(0);
});

for (const status of ["ACTIVE", "CLOSED", "ARCHIVED"]) test(`referral invitations stop at cutoff while ${status} history stays readable`, async ({ page }) => {
  const state = await prepareB4(page);
  const cutoff = Date.parse(two.season.timing.economic_ends_at);
  configure(state, two, new Date(cutoff - 20_000).toISOString(), true, status);
  await page.clock.install();
  await page.goto(launch("/earn"));
  await page.getByRole("button", { name: "Network", exact: true }).click();
  const copy = page.getByRole("button", { name: "Copy link", exact: true });
  const share = page.getByRole("button", { name: "Share in Telegram", exact: true });
  if (status === "ACTIVE") {
    await expect(copy).toBeEnabled(); await expect(share).toBeEnabled();
    await page.clock.fastForward(20_000);
  }
  await expect(copy).toBeDisabled(); await expect(share).toBeDisabled();
  await expect(page.getByText("Start Invitee", { exact: true })).toBeVisible();
  await expect(page.getByText("Referral XP", { exact: true })).toBeVisible();
  expect(state.calls.filter(c => c.method === "POST" && c.path.startsWith("/referrals"))).toEqual([]);
});

const tapWire = JSON.parse(readFileSync("src/integrations/api/fixtures/tap-v2.json", "utf8"));
for (const mode of ["pending", "in-flight", "committed-lost", "expired-reload"]) test(`Tap cutoff reconciles ${mode} evidence without new earning or lease issuance`, async ({ page }) => {
  const state = await prepareB4(page);
  const cutoff = Date.parse(two.season.timing.economic_ends_at);
  configure(state, two, new Date(cutoff - 20_000).toISOString(), true);
  const originalLifetime = state.canonical.progression.lifetime_points;
  const originalPoints = state.canonical.season_points;
  let atCutoff = false;
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const posts: any[] = [];
  let leaseRequests = 0;
  let receipt: any;
  const rawState = (session: string, committed = false) => ({ ...tapWire.initial_state,
    player_id: "9001", season_id: state.bootstrap.season.code, config_version: state.bootstrap.config.version,
    server_time: atCutoff ? two.season.timing.economic_ends_at : state.bootstrap.server_time,
    reward_earning_allowed: !atCutoff, receipt_cursor: state.canonical.receipt_cursor, revision: committed ? 2 : 1,
    progression: state.canonical.progression, progression_policy: state.bootstrap.config.progression,
    season_points: state.canonical.season_points,
    lease: atCutoff ? null : { ...tapWire.initial_state.lease, session_id: session,
      expires_at: two.season.timing.economic_ends_at, season_id: state.bootstrap.season.code, config_version: state.bootstrap.config.version },
  });
  await page.route("**/api/v1/base/v2/tap-state*", route => route.fulfill({ json: rawState(new URL(route.request().url()).searchParams.get("session_id")!) }));
  await page.route("**/api/v1/base/v2/tap-leases", route => { leaseRequests++; return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } }); });
  await page.route("**/api/v1/base/v2/tap-batches", async route => {
    const body = route.request().postDataJSON(); posts.push(body);
    if (!receipt && ["in-flight", "committed-lost"].includes(mode)) {
      const count = body.tap_count;
      state.canonical = { ...state.canonical, receipt_cursor: state.canonical.receipt_cursor + 1, season_points: originalPoints + count,
        progression: { ...state.canonical.progression, lifetime_points: originalLifetime + count, points_into_level: originalLifetime + count, points_remaining: 300 - originalLifetime - count } };
      receipt = { ...tapWire.batch_response, accepted_taps: count, rejected_taps: 0, earned_points: count,
        receipt_id: state.canonical.receipt_cursor, sequence_through: body.sequence_start + count - 1,
        receipt: { ...tapWire.batch_response.receipt, ...body, requested_taps: count, receipt_id: state.canonical.receipt_cursor,
          sequence_through: body.sequence_start + count - 1, accepted_taps: count, rejected_taps: 0, earned_points: count,
          season_id: state.bootstrap.season.code, config_version: state.bootstrap.config.version } };
      delete receipt.receipt.tap_count;
    }
    if (posts.length === 1) {
      await gate;
      if (mode === "committed-lost") return route.abort("failed");
    }
    if (receipt) return route.fulfill({ json: { ...receipt, duplicate: posts.length > 1, snapshot: rawState(body.session_id, true) } });
    return route.fulfill({ status: 409, json: { code: mode === "expired-reload" ? "LEASE_EXPIRED" : "SEASON_UNAVAILABLE", detail: "Isolated server rejection", retryable: false, retry_after_ms: null } });
  });
  await page.clock.install();
  await page.goto(launch("/base"));
  const tap = page.getByRole("button", { name: "Interact with Dexo", exact: true });
  await expect(tap).toBeEnabled();
  const journal = () => page.evaluate(() => JSON.parse(localStorage.getItem("dalexio-tap-v2:9001")!));
  await expect.poll(async () => (await journal()).leases.length).toBe(1);
  await tap.click();
  await expect.poll(async () => (await journal()).events.length).toBe(1);
  await expect(page.getByLabel(`${originalLifetime + 1} lifetime XP`, { exact: true })).toBeVisible();
  if (["in-flight", "committed-lost"].includes(mode)) {
    await page.clock.runFor(200); await expect.poll(() => posts.length).toBe(1);
  }
  atCutoff = true;
  state.bootstrap.server_time = two.season.timing.economic_ends_at;
  state.bootstrap.gameplay.reward_earning_allowed = false;
  await page.clock.fastForward(20_000);
  await expect(tap).toBeDisabled();
  await expect(page.getByText("Saved taps are awaiting server confirmation.", { exact: true })).toBeVisible();
  const before = await journal();
  expect(before.events).toHaveLength(1);
  if (mode === "expired-reload") {
    // Reload with the original uncertain batch still durable; the new controller must replay it.
    await page.reload();
    finish();
    await expect.poll(async () => (await journal()).events.length).toBe(0);
    await expect(tap).toBeDisabled();
  } else {
    finish();
    if (mode === "committed-lost") await page.reload();
    await expect.poll(async () => (await journal()).events.length).toBe(0);
  }
  const after = await journal();
  expect(leaseRequests).toBe(0);
  expect(after.session).toBe(before.session);
  expect(posts.every(body => JSON.stringify(body) === JSON.stringify(posts[0]))).toBe(true);
  await expect(page.getByLabel(`${receipt ? originalLifetime + 1 : originalLifetime} lifetime XP`, { exact: true })).toBeVisible();
  if (!receipt) expect(after.resolved[0]).toMatchObject({ sequences: [1], key: before.batches[0].key });
  await expect(page.getByRole("navigation", { name: "Primary game navigation" })).toBeVisible();
});
