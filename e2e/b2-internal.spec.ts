import { expect, test, type Page } from "@playwright/test";

// Infrastructure/real-component proof only. Not a substitute for the pinned backend B2 E2E.
async function mount(page: Page) {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/");
  await page.evaluate(async () => {
    // Vite dev import; this module is absent from production bundles.
    const harness = await import(/* @vite-ignore */ "/src/tests/b2BrowserHarness.tsx");
    await harness.mountB2Harness();
  });
  await expect(page.getByRole("button", { name: "Physical Dexo fixture" })).toBeVisible();
}
const state = (page: Page) => page.evaluate(() => (window as any).b2Harness.state());
async function fingers(page: Page, count: number) {
  const box = await page.getByRole("button", { name: "Physical Dexo fixture" }).boundingBox();
  expect(box).not.toBeNull();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: Array.from({ length: count }, (_, i) => ({ x: box!.x + box!.width / 2 + i * 12, y: box!.y + box!.height / 2, id: i + 1 })) });
  return { release: async () => { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await cdp.detach(); }, cdp };
}

test("two genuine simultaneous fingers update XP, level, stage and shared subscribers before the delayed response", async ({ page }) => {
  await mount(page);
  const input = await fingers(page, 2);
  expect(await state(page)).toMatchObject({ lifetime: 152, authorizedUnsent: 2, committed: { lifetime: 150 }, progression: { level: 5, stage: "explorer" } });
  for (const name of ["Base", "Header", "Profile"]) await expect(page.getByLabel(`${name} progression fixture`)).toHaveText("152 / 5 / explorer");
  await expect(page.locator("[data-b2-harness]").getByText("+1", { exact: true })).toHaveCount(2);
  await input.release();
  await expect.poll(() => page.evaluate(() => (window as any).b2Harness.requests().length)).toBe(1);
  await page.evaluate(() => (window as any).b2Harness.settle());
  await expect.poll(async () => (await state(page)).authorizedUnsent).toBe(0);
  expect((await state(page)).lifetime).toBe(152);
});

test("hold, move, compatibility click and synthetic repeats cannot add rewarded events", async ({ page }) => {
  await mount(page);
  const input = await fingers(page, 1);
  const box = await page.getByRole("button", { name: "Physical Dexo fixture" }).boundingBox();
  await input.cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box!.x + box!.width / 2 + 20, y: box!.y + box!.height / 2, id: 1 }] });
  await page.getByRole("button", { name: "Physical Dexo fixture" }).evaluate((button) => {
    button.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 9, pointerType: "touch", bubbles: true }));
    button.dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
    for (let i = 0; i < 10; i++) (button as HTMLButtonElement).click();
  });
  await input.release();
  expect((await state(page)).lifetime).toBe(151);
});

test("50 physical pointerdowns exhaust the authorization and preserve the approved float animation", async ({ page }) => {
  await mount(page);
  const target = page.getByRole("button", { name: "Physical Dexo fixture" });
  const animation = await target.evaluate((button) => button.parentElement!.getAnimations()[0]?.id ?? null);
  for (let i = 0; i < 25; i++) { const input = await fingers(page, 2); await input.release(); }
  expect(await state(page)).toMatchObject({ lifetime: 200, remaining: 0 });
  const extra = await fingers(page, 1); await extra.release();
  expect((await state(page)).lifetime).toBe(200);
  expect(await target.evaluate((button) => getComputedStyle(button.parentElement!).animationPlayState)).toBe("running");
  expect(await target.evaluate((button) => button.parentElement!.getAnimations()[0]?.id ?? null)).toBe(animation);
});

test("server-cached avatar renders while external Telegram photo origin is blocked", async ({ page }) => {
  let blockedRequests = 0; let cacheRequests = 0;
  await page.route("https://telegram-photo-blocked.test/**", (route) => { blockedRequests++; return route.abort("internetdisconnected"); });
  await page.route("**/isolated-avatar-cache.png", (route) => {
    cacheRequests++;
    return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1cAAAAASUVORK5CYII=", "base64") });
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/src/tests/b2BrowserHarness.tsx");
    harness.mountAvatarHarness({ owner: "avatar-browser-player", version: "v2", delivery: { kind: "url", url: "/isolated-avatar-cache.png" } });
  });
  const image = page.locator('img[src$="/isolated-avatar-cache.png"]');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(cacheRequests).toBe(1); expect(blockedRequests).toBe(0);
  expect(await image.evaluate((element) => getComputedStyle(element).objectFit)).toBe("cover");
});

test("two tabs cannot concurrently own the same player's durable Tap journal", async ({ page }) => {
  await mount(page);
  const second = await page.context().newPage();
  await mount(second);
  expect((await state(second)).status).toBe("session-busy");
  const input = await fingers(second, 1); await input.release();
  expect((await state(second)).lifetime).toBeNull();
  await second.close();
});
