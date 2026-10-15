import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
const bootstrap = JSON.parse(readFileSync("src/integrations/api/fixtures/bootstrap-b1.json", "utf8"));
const tap = JSON.parse(readFileSync("src/integrations/api/fixtures/tap-v2.json", "utf8"));
const auth = `user=${encodeURIComponent(JSON.stringify({ id: 42, first_name: "Verified" }))}&auth_date=123&hash=isolated-b3-client`;
const launch = (path: string) => `${path}#tgWebAppData=${encodeURIComponent(auth)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`;

async function api(page: Page, options: { photo?: string; sessionError?: string; bootstrapError?: string } = {}) {
  const calls: string[] = [];
  await page.route("**/api/v1/**", async route => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") return route.fallback();
    const path = new URL(route.request().url()).pathname;
    calls.push(path);
    expect(route.request().headers().authorization).toBe(`tma ${auth}`);
    const player = { ...bootstrap.player, photo_url: options.photo ?? "" };
    if (path.endsWith("/bootstrap")) {
      if (options.bootstrapError) return route.fulfill({ status: 401, json: { code: options.bootstrapError, detail: "private implementation detail" } });
      return route.fulfill({ json: { ...bootstrap, player, features: { ...bootstrap.features, base_tap: Boolean(options.sessionError) } } });
    }
    if (path.endsWith("/profile/overview")) return route.fulfill({ json: { identity: player, progression: bootstrap.progression, journey: { claimed_missions: 0, current_daily_streak: 0, verified_referrals: 0 }, customization: { active_frame: "standard", active_title: "explorer", featured_medal: null, featured_achievement: null } } });
    if (path.endsWith("/notifications")) return route.fulfill({ json: { items: [], next_cursor: null } });
    if (path.endsWith("/tap-state")) return route.fulfill({ json: { ...tap.initial_state, player_id: "42", lease: null } });
    if (path.endsWith("/tap-leases")) return route.fulfill({ status: 409, json: { code: options.sessionError, detail: "private session implementation detail", retryable: true } });
    return route.fulfill({ status: 503, json: { code: "TEMPORARY_UNAVAILABLE", detail: "isolated unavailable" } });
  });
  return calls;
}

async function prepare(page: Page, release: string | null = "b3-1") {
  await page.addInitScript(({ release }) => {
    if (release) localStorage.setItem("dalexio-client-storage-release", release);
    localStorage.setItem("dalexio-base-ui", JSON.stringify({ state: { criticalActionVisible: true, promoBannerVisible: true }, version: 0 }));
    localStorage.setItem("dalexio-onboarding-v1:player:42", JSON.stringify({ state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-10-14T00:00:00Z" }, version: 1 }));
  }, { release });
}

for (const release of [null, "b2-1", "b3-1"]) {
  test(`Season 1 hides Critical Action and local promo flags on fresh/upgrade/persisted ${release}`, async ({ page }) => {
    await api(page); await prepare(page, release);
    await page.goto(launch("/base"));
    await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
    for (const text of ["Next critical action", "Defend your clan outpost", "Join clan defence", "BASE PROMO BANNER"]) await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    await expect(page.locator('[class*="promoSlot"]')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
    await expect(page.getByText("Defend your clan outpost", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary game navigation" })).toBeVisible();
  });
}

for (const code of ["ACTIVE_SESSION", "GENERATION_STALE", "LEASE_REVOKED", "LEASE_EXPIRED", "AUTH_EXPIRED"]) {
  test(`production recovery copy/diagnostics exclusion for ${code}`, async ({ page }) => {
    await api(page, code === "AUTH_EXPIRED" ? { bootstrapError: code } : { sessionError: code });
    await prepare(page); await page.goto(launch("/base"));
    const expected = code === "ACTIVE_SESSION" ? "You're already playing on another device"
      : ["GENERATION_STALE", "LEASE_REVOKED"].includes(code) ? "Your game is open on another device"
      : code === "AUTH_EXPIRED" ? "Please reopen Dexo Land" : "Having trouble connecting";
    await expect(page.getByRole("heading", { name: expected })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try Again", exact: true })).toBeVisible();
    await expect(page.locator("details, summary")).toHaveCount(0);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/Launch diagnostics|private.*detail|ACTIVE_SESSION|GENERATION_STALE|LEASE_REVOKED|LEASE_EXPIRED|AUTH_EXPIRED|Recovery code|Bridge:|Credentials:/);
    await expect(page.getByRole("button", { name: "Switch to This Device" })).toHaveCount(0); // finalized B3 operation still pending
  });
}

for (const photo of ["", "https://blocked.telegram.test/avatar.jpg", "https://cache.test/api/v1/profile/avatar/00000000-0000-4000-8000-000000000001"]) {
  test(`turquoise fallback preserves Header/Profile dimensions and stops repeated requests: ${photo || "no-photo"}`, async ({ page }, info) => {
    const requests: string[] = [];
    await page.route("https://blocked.telegram.test/**", route => { requests.push(route.request().url()); return route.abort(); });
    await page.route("https://cache.test/**", route => { requests.push(route.request().url()); return route.fulfill({ status: 404, body: "expired cache metadata" }); });
    await api(page, { photo }); await prepare(page); await page.goto(launch("/profile"));
    await expect(page.getByRole("heading", { name: "Verified" })).toBeVisible();
    const fallback = page.locator('[class*="photoWell"] > span');
    const header = page.locator('[class*="avatarFallback"]');
    await expect(fallback.first()).toHaveText("V");
    await expect(header).toHaveText("V");
    for (const target of [fallback.first(), header]) {
      await expect(target).toHaveCSS("color", "rgb(8, 16, 33)");
      await expect(target).toHaveCSS("background-image", /rgb\(141, 238, 255\).*rgb\(69, 221, 255\)/);
    }
    await expect(header).toHaveCSS("width", "38px");
    await expect(fallback.first()).toHaveCSS("border-radius", "0px"); // containing photo well retains approved circle
    const failedRequests = requests.length;
    await page.screenshot({ path: info.outputPath(`avatar-profile-${photo ? "failed-photo" : "no-photo"}.png`) });
    await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Base", exact: true }).click();
    await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
    await expect(header).toHaveText("V");
    await page.screenshot({ path: info.outputPath("avatar-base-header.png") });
    expect(failedRequests).toBe(photo ? 1 : 0);
    expect(requests.length).toBe(failedRequests);
  });
}

test("new incompatible client release prompts safely and never reloads over another account's pending Tap journal", async ({ page }) => {
  await api(page); await prepare(page);
  let compatibility = "b3-1";
  await page.route("**/client-release.json", route => route.fulfill({ json: { storage_compatibility: compatibility } }));
  await page.goto(launch("/base"));
  await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "An update is ready" })).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("dalexio-tap-v2:99", JSON.stringify({ version: 1, player: "99", events: ["preserve-original-input"], batches: [] })));
  compatibility = "b4-1";
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByRole("dialog", { name: "An update is ready" })).toBeVisible();
  await page.getByRole("button", { name: "Refresh Game" }).click();
  await expect(page.getByText("Your game is still saving. Please try again shortly, or continue playing.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("dalexio-tap-v2:99"))).toContain("preserve-original-input");
  expect(await page.evaluate(() => localStorage.getItem("dalexio-onboarding-v1:player:42"))).toContain("completed");
});
