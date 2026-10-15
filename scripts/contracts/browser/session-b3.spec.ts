import { devices, expect, test, type Page } from "@playwright/test";
const api = "http://127.0.0.1:8792";
async function control(data: object): Promise<any> {
  const response = await fetch(`${api}/__b2_test__`, { method: "POST", body: JSON.stringify(data) });
  if (!response.ok) throw new Error("Isolated control failed");
  return response.json();
}
async function enter(page: Page, identity: { player: string; initData: string }, platform: string) {
  await page.addInitScript(player => localStorage.setItem(`dalexio-onboarding-v1:player:${player}`, JSON.stringify({ version: 1, state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-01-01T00:00:00Z" } })), identity.player);
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await page.goto(`http://127.0.0.1:4175/base#tgWebAppData=${encodeURIComponent(identity.initData)}&tgWebAppPlatform=${platform}&tgWebAppVersion=8.0`);
}

test("actual Mobile/Desktop switching, repeated Retry, moved-session fencing, close-both and reopen preserve progress/onboarding", async ({ browser }) => {
  test.setTimeout(60_000); // Full two-device lifecycle; each recovery below remains bounded separately.
  await control({ action: "flags" });
  const identity = await control({ action: "player", points: 150 });
  const phoneContext = await browser.newContext({ ...devices["Pixel 7"] });
  const desktopContext = await browser.newContext({ ...devices["Desktop Chrome"] });
  const phone = await phoneContext.newPage(); const desktop = await desktopContext.newPage();
  const takeovers: unknown[] = [];
  for (const page of [phone, desktop]) page.on("request", request => {
    if (new URL(request.url()).pathname.endsWith("/tap-leases") && request.postDataJSON()?.takeover) takeovers.push(request.postDataJSON());
  });
  await enter(phone, identity, "android");
  await expect.poll(() => phone.evaluate(id => JSON.parse(localStorage.getItem(`dalexio-tap-v2:${id}`) ?? "null")?.leases.length ?? 0, identity.player)).toBe(1);
  await enter(desktop, identity, "tdesktop");
  await expect(desktop.getByRole("heading", { name: "You're already playing on another device" })).toBeVisible();
  await desktop.getByRole("button", { name: "Switch to This Device", exact: true }).click();
  const confirmation = desktop.getByRole("dialog", { name: "Continue on this device?" });
  await expect(confirmation).toBeVisible();
  expect(takeovers).toHaveLength(0);
  const switching = Date.now();
  await confirmation.getByRole("button", { name: "Switch to This Device" }).click();
  await expect(desktop.getByLabel("150 lifetime XP", { exact: true })).toBeVisible();
  expect(Date.now() - switching).toBeLessThan(15_000);
  expect(takeovers).toHaveLength(1);
  await phone.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(phone.getByRole("heading", { name: "Your game is open on another device" })).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let reads = 0;
  await phone.route("**/api/v1/base/v2/tap-state?*", async route => { reads++; await gate; await route.fallback(); });
  await phone.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find(button => button.textContent?.trim() === "Try Again")!;
    for (let index = 0; index < 20; index++) button.click();
  });
  await expect(phone.getByRole("status")).toHaveText("Trying to reconnect…");
  await expect(phone.getByRole("button", { name: "Try Again", exact: true })).toBeDisabled();
  expect(reads).toBeLessThanOrEqual(1);
  release();
  await expect(phone.getByRole("button", { name: "Try Again", exact: true })).toBeEnabled();
  expect(reads).toBe(1); expect(takeovers).toHaveLength(1);
  await expect(phone.locator("details, summary")).toHaveCount(0);
  const stored = await desktopContext.storageState();
  await desktop.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await expect.poll(async () => {
    const response = await fetch(`${api}/api/v1/base/v2/tap-state`, { headers: { Authorization: `tma ${identity.initData}` } });
    return (await response.json()).ownership.status;
  }).toBe("AVAILABLE");
  await phoneContext.close(); await desktopContext.close();
  const reopened = await browser.newContext({ ...devices["Desktop Chrome"], storageState: stored });
  const page = await reopened.newPage();
  const reopening = Date.now();
  await enter(page, identity, "tdesktop");
  await expect(page.getByLabel("150 lifetime XP", { exact: true })).toBeVisible();
  expect(Date.now() - reopening).toBeLessThan(20_000);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`dalexio-onboarding-v1:player:${id}`)!).state.status, identity.player)).toBe("completed");
  await reopened.close();
});
