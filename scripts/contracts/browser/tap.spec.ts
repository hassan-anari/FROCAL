import { expect, test, type Page } from "@playwright/test";
const api = "http://127.0.0.1:8792";
const xp = (page: Page, value: number) => page.getByLabel(`${value.toLocaleString("en-US")} lifetime XP`, { exact: true });
async function control(data: object): Promise<any> {
  const response = await fetch(api + "/__b2_test__", { method: "POST", body: JSON.stringify(data) });
  if (!response.ok) throw new Error("Isolated fixture control failed");
  return response.json();
}
async function launch(page: Page, points = 150, cached = false) {
  await control({ action: "flags" });
  const identity = await control({ action: "player", points, cached_avatar: cached });
  await page.addInitScript((player) => {
    localStorage.setItem(`dalexio-onboarding-v1:player:${player}`, JSON.stringify({ version: 1, state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-01-01T00:00:00Z" } }));
  }, identity.player);
  // A second Mini App launch must create a new document, not a fragment-only
  // navigation that would skip the device's stored-onboarding setup script.
  if (page.url() !== "about:blank") await page.goto("about:blank");
  // Block every unexpected external origin, including the original Telegram host.
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    if (!["127.0.0.1", "cached-avatar.test"].includes(host)) return route.abort("internetdisconnected");
    return route.fallback();
  });
  await page.goto(`/base#tgWebAppData=${encodeURIComponent(identity.initData)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
  await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
  // Lease response completion is a real authorization boundary, not a sleep.
  await expect.poll(() => page.evaluate((id) => {
    const journal = JSON.parse(localStorage.getItem(`dalexio-tap-v2:${id}`) ?? "null");
    return journal?.leases.length ?? 0;
  }, identity.player)).toBe(1);
  return identity;
}
async function fingers(page: Page, count: number) {
  const box = await page.getByRole("button", { name: "Interact with Dexo" }).boundingBox();
  expect(box).not.toBeNull();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: Array.from({ length: count }, (_, i) => ({ x: box!.x + box!.width / 2 + i * 12, y: box!.y + box!.height / 2, id: i + 1 })) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}
test("real production Base accepts simultaneous touches before HTTP, commits and shares progression with Profile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("dalexio-client-storage-release", "b1");
    localStorage.setItem("dalexio-earn-state-v2", JSON.stringify({ state: { lifetimeXp: 1_000_000 } }));
  });
  const identity = await launch(page);
  await expect(xp(page, 150)).toBeVisible();
  expect(await page.evaluate((id) => JSON.parse(localStorage.getItem(`dalexio-onboarding-v1:player:${id}`)!).state.status, identity.player)).toBe("completed");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/v1/base/v2/tap-batches", async (route) => { requests++; await gate; await route.continue(); });
  await fingers(page, 2);
  await expect(xp(page, 152)).toBeVisible();
  expect((await control({ action: "inspect", player: identity.player })).lifetime).toBe(150);
  await page.getByRole("navigation", { name: "Primary game navigation" }).getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByText("152", { exact: true })).toBeVisible();
  release();
  await expect.poll(async () => (await control({ action: "inspect", player: identity.player })).lifetime).toBe(152);
  expect(requests).toBe(1);
  await expect(page.getByText("152", { exact: true })).toBeVisible();
  expect(await page.evaluate((raw) => Object.values(localStorage).join(" ").includes(raw), identity.initData)).toBe(false);
});

test("uncertain local durability stops XP and reuses the approved recovery screen", async ({ page }) => {
  const identity = await launch(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restorePairedStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("dalexio-tap-v2:")) throw new DOMException("Isolated quota failure", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await fingers(page, 1);
  await expect(page.getByRole("heading", { name: "We couldn't save your game session" })).toBeVisible();
  expect((await control({ action: "inspect", player: identity.player })).lifetime).toBe(150);
  await page.evaluate(() => (window as any).restorePairedStorage());
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
  await expect(xp(page, 150)).toBeVisible();
});

test("two authenticated identities on one device keep separate balances, journals and onboarding", async ({ page }) => {
  const first = await launch(page, 150);
  await fingers(page, 1); await expect(xp(page, 151)).toBeVisible();
  await expect.poll(async () => (await control({ action: "inspect", player: first.player })).lifetime).toBe(151);
  const second = await launch(page, 700);
  await expect(xp(page, 700)).toBeVisible();
  await expect(page.getByText("151", { exact: true })).toHaveCount(0);
  await fingers(page, 1); await expect(xp(page, 701)).toBeVisible();
  const scopes = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("dalexio-tap-v2:")).length);
  expect(scopes).toBe(2);
  expect((await control({ action: "inspect", player: first.player })).lifetime).toBe(151);
  expect(first.player === second.player).toBe(false);
});

test("real production Base shows immediate Level/Dexo transition with a delayed commit", async ({ page }) => {
  const identity = await launch(page, 2499);
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/base/v2/tap-batches", async (route) => { await gate; await route.continue(); });
  await fingers(page, 1);
  await expect(page.getByRole("heading", { name: "Explorer Evolution" })).toBeVisible();
  await expect(page.getByText("LV. 5", { exact: true })).toBeVisible();
  await expect(page.getByText("EXPLORER", { exact: true }).first()).toBeVisible();
  expect((await control({ action: "inspect", player: identity.player })).lifetime).toBe(2499);
  release();
  await expect.poll(async () => (await control({ action: "inspect", player: identity.player })).lifetime).toBe(2500);
});

test("physical 49th/50th/51st, refresh and server cooldown preserve the float animation and exact allowance", async ({ page }) => {
  const identity = await launch(page);
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/base/v2/tap-batches", async (route) => { await gate; await route.continue(); });
  for (let i = 0; i < 24; i++) await fingers(page, 2);
  await fingers(page, 1); await expect(xp(page, 199)).toBeVisible();
  await fingers(page, 1); await expect(xp(page, 200)).toBeVisible();
  await expect(page.getByLabel("Base Tap cooling down")).toBeVisible();
  await fingers(page, 1); await expect(xp(page, 200)).toBeVisible();
  const target = page.getByRole("button", { name: "Interact with Dexo" });
  expect(await target.evaluate((button) => getComputedStyle(button.parentElement!).animationPlayState)).toBe("running");
  release();
  await expect.poll(async () => (await control({ action: "inspect", player: identity.player })).lifetime).toBe(200);
  await page.reload(); await expect(page.getByLabel("Base Tap cooling down")).toBeVisible();
  await fingers(page, 1); await expect(xp(page, 200)).toBeVisible();
  await control({ action: "advance", seconds: 10.1 });
  await page.reload(); await expect(page.getByLabel("Base Tap ready")).toBeVisible();
  await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem(`dalexio-tap-v2:${id}`)!).leases[0]?.scope.generation, identity.player)).toBe(2);
  await fingers(page, 1); await expect(xp(page, 201)).toBeVisible();
});

test("actual Bootstrap cached URL renders with Telegram blocked and unavailable private storage falls back", async ({ page }) => {
  let telegramRequests = 0;
  await page.route("https://telegram-photo-blocked.test/**", (route) => { telegramRequests++; return route.abort(); });
  await page.route("https://cached-avatar.test/**", async (route) => {
    // Exact backend delivery bytes, controlled origin is only rewritten for isolation.
    const response = await fetch(api + new URL(route.request().url()).pathname);
    await route.fulfill({ status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "image/jpeg" }, body: Buffer.from(await response.arrayBuffer()) });
  });
  await launch(page, 150, true);
  const image = page.locator('img[src^="https://cached-avatar.test/"]').first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(32);
  expect(telegramRequests).toBe(0);
  await control({ action: "flags", storage_unavailable: true });
  await page.reload();
  await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
  await expect(page.locator('img[src^="https://cached-avatar.test/"]')).toHaveCount(0);
  expect(telegramRequests).toBe(0);
});
