import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { legacyBootstrap } from "../src/integrations/api/bootstrapFixture.test-data";
const tapFixture = JSON.parse(readFileSync(new URL("../src/integrations/api/fixtures/tap-v2.json", import.meta.url), "utf8"));
const b1Fixture = JSON.parse(readFileSync(new URL("../src/integrations/api/fixtures/bootstrap-b1.json", import.meta.url), "utf8"));

// Signed-shaped, intentionally NON-production credentials. The API is fully intercepted.
const credentials = (id = 42) => `user=${encodeURIComponent(JSON.stringify({ id, first_name: "Unsigned impostor" }))}&auth_date=123&hash=test-fixture-${id}`;
const launch = (path: string, id = 42, platform = "android") => `${path}#tgWebAppData=${encodeURIComponent(credentials(id))}&tgWebAppPlatform=${platform}&tgWebAppVersion=8.0`;
async function mockApi(page: Page, bootstrapResponse?: (attempt: number) => { status?: number; body: unknown }) {
  let attempts = 0;
  const authorizations: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    // Guard every test: no mutation or live API escape is permitted.
    if (new URL(request.url()).pathname === "/api/v1/profile/review") {
      expect(request.method()).toBe("POST");
      return route.fulfill({ json: { active_frame: "standard", active_title: "explorer", featured_medal: null, featured_achievement: null } });
    }
    expect(request.method()).toBe("GET");
    const auth = request.headers().authorization;
    expect(auth).toMatch(/^tma /); authorizations.push(auth);
    const id = auth === `tma ${credentials(99)}` ? 99 : 42;
    const data = { ...legacyBootstrap, player: { ...legacyBootstrap.player, telegram_user_id: id, first_name: id === 99 ? "Second" : "Verified" } };
    if (request.url().endsWith("/bootstrap")) {
      attempts += 1;
      const response = bootstrapResponse?.(attempts);
      await route.fulfill({ status: response?.status ?? 200, json: response?.body ?? data });
    } else if (request.url().endsWith("/profile/overview")) {
      await route.fulfill({ json: { identity: { ...data.player, photo_url: "" }, progression: data.progression, journey: { claimed_missions: 0, current_daily_streak: 0, verified_referrals: 0 }, customization: { active_frame: "standard", active_title: "explorer", featured_medal: null, featured_achievement: null } } });
    } else if (new URL(request.url()).pathname.endsWith("/tap-state")) {
      await route.fulfill({ json: { ...tapFixture.initial_state, player_id: String(id), season_id: data.season?.code ?? null, config_version: data.config.version, lease: null, issuance_enabled: false, progression: data.progression, progression_policy: b1Fixture.config.progression, season_points: data.season?.season_points ?? 0 } });
    } else if (new URL(request.url()).pathname.endsWith("/notifications")) {
      await route.fulfill({ json: { items: [], next_cursor: null } });
    } else {
      // No other data is needed for these initial-state tests.
      await route.fulfill({ status: 503, json: { detail: "fixture endpoint unavailable" } });
    }
  });
  return { authorizations, attempts: () => attempts };
}

test("recovers valid official LaunchParams after the locally served SDK fails", async ({ page }) => {
  await page.route("**/vendor/telegram/*.js", (route) => route.abort());
  const api = await mockApi(page);
  await page.goto(launch("/profile", 42, "ios"));
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  await expect(page.getByText("321", { exact: true })).toBeVisible();
  expect(api.authorizations[0]).toBe(`tma ${credentials()}`);
  await expect(page.locator("html")).toHaveAttribute("data-runtime", "telegram");
  await expect(page.locator("html")).toHaveAttribute("data-telegram-sdk", "failed");
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await expect(page.getByText("Level 7 progress", { exact: true })).toBeVisible();
});

test("uses the locally pinned official SDK on a desktop cold launch and refresh", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto(launch("/profile", 42, "tdesktop"));
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-telegram-sdk", "loaded");
  expect(await page.evaluate(() => window.Telegram?.WebApp?.initData)).toBe(credentials());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  expect(api.authorizations.every((auth) => auth === `tma ${credentials()}`)).toBe(true);
});

test("recovers delayed SDK credentials without labeling the launch as an ordinary browser", async ({ page }) => {
  await mockApi(page);
  await page.goto("/profile#tgWebAppPlatform=android");
  await expect(page.getByRole("heading", { name: "Telegram launch needs recovery" })).toBeVisible();
  await page.evaluate((raw) => { window.Telegram = { WebApp: { initData: raw, platform: "android" } }; }, credentials());
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
});

test("genuine production browser has no protected calls and a distinct launch state", async ({ page }) => {
  const api = await mockApi(page); await page.goto("/profile");
  await expect(page.locator('[data-initial-state="NO_TELEGRAM_CONTEXT"]')).toBeVisible();
  expect(api.attempts()).toBe(0);
});

test("missing credentials with SDK failure offers recovery instead of browser advice", async ({ page }) => {
  await page.route("**/vendor/telegram/*.js", (route) => route.abort());
  const api = await mockApi(page); await page.goto("/onboarding#tgWebAppPlatform=ios");
  await expect(page.locator('[data-initial-state="SDK_LOAD_FAILED"]')).toBeVisible();
  expect(api.attempts()).toBe(0);
});

test("missing launch data with a loaded SDK is a separate state", async ({ page }) => {
  const api = await mockApi(page); await page.goto("/base#tgWebAppPlatform=tdesktop");
  await expect(page.locator('[data-initial-state="LAUNCH_DATA_MISSING"]')).toBeVisible();
  expect(api.attempts()).toBe(0);
});

for (const code of ["AUTH_INVALID", "AUTH_EXPIRED", "AUTH_REJECTED"]) {
  test(`handles ${code} without authentication retry loops or fake progression`, async ({ page }) => {
    const api = await mockApi(page, () => ({ status: 401, body: code === "AUTH_REJECTED" ? { detail: "Unauthorized" } : { code } }));
    await page.goto(launch("/profile"));
    await expect(page.locator(`[data-initial-state="${code}"]`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verified" })).toHaveCount(0);
    expect(api.attempts()).toBe(1);
  });
}

test("classifies API network failure and recovers on manual retry", async ({ page }) => {
  let online = false; let attempts = 0;
  await page.route("**/api/v1/**", async (route) => {
    expect(route.request().method()).toBe("GET"); attempts += 1;
    if (!online) await route.abort("internetdisconnected");
    else await route.fulfill({ json: legacyBootstrap });
  });
  await page.goto(launch("/"));
  await expect(page.locator('[data-initial-state="API_UNREACHABLE"]')).toBeVisible();
  expect(attempts).toBe(3); online = true;
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enter Dexo Land" })).toBeVisible();
});

test("bounded transient API retries succeed without substituting demo data", async ({ page }) => {
  const api = await mockApi(page, (attempt) => attempt < 3 ? { status: 503, body: {} } : { body: legacyBootstrap });
  await page.goto(launch("/profile"));
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  expect(api.attempts()).toBe(3);
});

test("no active Season preserves Profile and blocks playable routes", async ({ page }) => {
  await mockApi(page, () => ({ body: { ...legacyBootstrap, season: null } }));
  await page.goto(launch("/profile"));
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await expect(page.locator('[data-initial-state="SEASON_UNAVAILABLE"]')).toBeVisible();
});

test("credential switching isolates identity and player data on the same page", async ({ page }) => {
  await mockApi(page); await page.goto(launch("/profile"));
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  await page.evaluate((hash) => { window.location.hash = hash; }, launch("", 99).slice(1));
  await expect(page.getByRole("heading", { name: "Second" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verified" })).toHaveCount(0);
});

test("authenticated cold onboarding retains progress on refresh and reaches Base", async ({ page }) => {
  const api = await mockApi(page); await page.goto(launch("/onboarding"));
  await page.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.getByText("MEET DEXO", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("MEET DEXO", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("COMPANION ACQUIRED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Enter Base", exact: true }).click();
  await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
  expect(api.authorizations.every((auth) => auth === `tma ${credentials()}`)).toBe(true);
});

test("reviewed B1 fixture blocks disabled Clan above its level gate and displays server photo metadata", async ({ page }) => {
  const fixture = b1Fixture;
  await mockApi(page, () => ({ body: fixture }));
  await page.route("https://example.test/**", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="gray"/></svg>' }));
  await page.goto(launch("/profile"));
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  await expect(page.locator('img[src="https://example.test/verified-player.png"]').first()).toBeVisible();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Clan", exact: true }).click();
  await expect(page.locator('[data-initial-state="FEATURE_UNAVAILABLE"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clan is unavailable" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose your place in the season." })).toHaveCount(0);
});

test("reviewed Arena availability retains the approved locked S2 preview", async ({ page }) => {
  const fixture = b1Fixture;
  await mockApi(page, () => ({ body: fixture }));
  await page.goto(launch("/arena"));
  await expect(page.getByRole("navigation", { name: "Arena Season 1 sections" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Arena Season 2 sections" })).toHaveCount(0);
  await expect(page.getByText("Warfront", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Deploy attack|Find target/i })).toHaveCount(0);
});

test("production Season badge cannot open Diagnostics or enable public debug controls", async ({ page }) => {
  await mockApi(page);
  await page.goto(launch("/profile?arenaDebug=1&VITE_ENABLE_DEV_PANEL=true&VITE_DATA_SOURCE=local"));
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  const badge = page.getByRole("button", { name: "SEASON-1 Season One" });
  await expect(badge).toBeVisible();
  await badge.click({ clickCount: 3 });
  await expect(page).toHaveURL(/\/profile\?/);
  await expect(page.getByRole("heading", { name: "System diagnostics" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Development scenario controls" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Arena debug controls" })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("dalexio-diagnostics-return-path"))).toBeNull();
});

test("production rejects direct Diagnostics navigation with and without Telegram context", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await mockApi(page);
  await page.goto(launch("/diagnostics?arenaDebug=1"));
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("button", { name: "Enter Dexo Land" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "System diagnostics" })).toHaveCount(0);
  const browser = await page.context().newPage();
  await mockApi(browser);
  await browser.goto("/diagnostics");
  await expect(browser).toHaveURL(/\/$/);
  await expect(browser.locator('[data-initial-state="NO_TELEGRAM_CONTEXT"]')).toBeVisible();
  await browser.close();
  expect(requests.some((url) => /DiagnosticsPage|DevScenarioPanel|mocks\/browser/.test(url))).toBe(false);
});

for (const code of ["AUTH_UNAVAILABLE", "INITIALIZATION_UNAVAILABLE"]) {
  test(`reviewed ${code} is retryable service failure without credential renewal or raw details`, async ({ page }) => {
    let recover = false;
    const fixture = b1Fixture;
    const api = await mockApi(page, () => recover ? { body: fixture } : { status: 503, body: { code, detail: "raw-sensitive-server-detail", request_id: "synthetic-error-trace" } });
    await page.goto(launch("/profile"));
    await expect(page.locator(`[data-initial-state="${code}"]`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Telegram" })).toHaveCount(0);
    await expect(page.getByText("raw-sensitive-server-detail", { exact: true })).toHaveCount(0);
    expect(api.attempts()).toBe(3);
    recover = true;
    await page.getByRole("button", { name: "Try Again", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
  });
}

test("server earning eligibility disables reward actions while Profile and Arena reads remain available", async ({ page }) => {
  const fixture = b1Fixture;
  await mockApi(page, () => ({ body: { ...fixture, features: { ...fixture.features, daily: true }, gameplay: { moderation_state: "SUSPENDED", reward_earning_allowed: false } } }));
  await page.addInitScript(() => localStorage.setItem("dalexio-onboarding-v1:player:42", JSON.stringify({ state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-10-14T00:00:00Z" }, version: 1 })));
  await page.goto(launch("/base"));
  const target = page.getByRole("button", { name: "Interact with Dexo" });
  await expect(target).toBeVisible();
  const box = await target.boundingBox(); expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  expect(await page.evaluate(() => localStorage.getItem("dalexio-base-tap-queue:42"))).toBeNull();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Earn", exact: true }).click();
  await expect(page.getByLabel("Daily claim").getByRole("button")).toBeDisabled();
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
});
