import { devices, expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { prepareClan } from "./b6-fixture";
import { auth, launch } from "./b4-fixture";
const evidence = "docs/evidence/posthog-demo";

type Event = { event: string; properties: Record<string, any> };
function decode(body: Buffer, url: URL): any {
  if (body[0] === 31 && body[1] === 139) return JSON.parse(gunzipSync(body).toString());
  if (url.searchParams.get("compression") === "base64") return JSON.parse(Buffer.from(new URLSearchParams(body.toString()).get("data")!, "base64").toString());
  return JSON.parse(body.toString());
}
function unpackSnapshots(events: Event[]) {
  const unpack = (value: any): any => typeof value === "string" && value.charCodeAt(0) === 31 && value.charCodeAt(1) === 139
    ? JSON.parse(gunzipSync(Buffer.from(value, "latin1")).toString()) : value;
  return events.filter(e => e.event === "$snapshot").flatMap(e => e.properties.$snapshot_data).map(item => {
    // Official rrweb partial compression uses a binary gzip string, not base64.
    const data = unpack(item.data);
    if (item.type === 3 && typeof data === "object") {
      for (const key of ["texts", "attributes", "removes", "adds"]) if (key in data) data[key] = unpack(data[key]);
    }
    return { ...item, data };
  });
}
async function prepare(page: Page) {
  // Model a real Telegram WebView. Keep production bot filtering enabled; the
  // SDK otherwise intentionally drops Playwright's webdriver/headless signals.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  const f = await prepareClan(page);
  // The inherited visual fixture freezes only Date.now(). rrweb also timestamps
  // with new Date(), so keep the two clocks consistent for real session rotation.
  await page.addInitScript(() => { Date.now = () => new Date().getTime(); });
  const events: Event[] = []; const requests: string[] = [];
  let failTransport = false;
  await page.route("https://posthog.test/**", async route => {
    const request = route.request(); const url = new URL(request.url()); requests.push(url.pathname);
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
    if (url.pathname.includes("/config") || url.pathname.includes("/flags")) return route.fulfill({ json: { hasFeatureFlags: false, sessionRecording: { endpoint: "/s/", sampleRate: 1, minimumDurationMilliseconds: 0, consoleLogRecordingEnabled: true, canvasRecording: { enabled: true }, networkPayloadCapture: { recordBody: true, recordHeaders: true, capturePerformance: true } } } });
    const body = request.postDataBuffer();
    if (body) { const value = decode(body, url); events.push(...(Array.isArray(value) ? value : value.batch ?? [value])); }
    if (failTransport) return route.fulfill({ status: 503, json: { status: 0 } });
    return route.fulfill({ json: { status: 1 } });
  });
  return { ...f, events, requests, failTransport: () => { failTransport = true; } };
}
async function allow(page: Page, replay = true) {
  await page.getByRole("button", { name: replay ? "Allow analytics + replay" : "Allow analytics only", exact: true }).click();
  await expect(page.getByRole("button", { name: "Demo privacy", exact: true })).toBeVisible();
}

test("release build: consent, SDK, masked replay, safe URLs, attribution and withdrawal", async ({ page }) => {
  test.setTimeout(90_000);
  const f = await prepare(page);
  await page.goto(launch("/clan") + "&private_token=URL_SECRET");
  await expect(page.getByRole("button", { name: "Clan status", exact: true })).toBeVisible();
  mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/consent-prompt.png`, animations: "disabled" });
  await page.waitForTimeout(1500);
  expect(f.requests).toHaveLength(0);
  await allow(page);
  await expect.poll(() => f.events.filter(e => e.event === "$identify").length).toBe(1);
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Clan status", exact: true })).toHaveAttribute("data-ph-sensitive", "");
  await page.getByRole("dialog").getByRole("button", { name: /close/i }).click();
  await page.evaluate(() => {
    const panel = document.createElement("div"); panel.id = "privacy-probe";
    panel.innerHTML = '<p>PRIVATE_PERSON_SENTINEL</p><input value="PRIVATE_INPUT_SENTINEL"><a href="https://t.me/+PRIVATE_INVITE_SENTINEL">Invitation</a><img src="https://private.test/PRIVATE_IMAGE_SENTINEL"><div data-ph-sensitive>PRIVATE_BLOCK_SENTINEL</div><input type="hidden" value="PRIVATE_HIDDEN_SENTINEL">';
    document.querySelector("main")!.append(panel);
    console.log("PRIVATE_CONSOLE_SENTINEL");
  });
  await page.locator("#privacy-probe input").first().fill("PRIVATE_TYPED_SENTINEL");
  await page.waitForTimeout(7000);
  await expect.poll(() => f.events.filter(e => e.event === "$snapshot").length).toBeGreaterThan(0);
  const snapshots = unpackSnapshots(f.events);
  expect(snapshots.some(e => e.type === 2)).toBe(true);
  expect(snapshots.filter(e => e.type === 2).every(e => typeof e.data === "object")).toBe(true);
  const wire = JSON.stringify({ events: f.events.filter(e => e.event !== "$snapshot"), snapshots });
  for (const forbidden of [auth, "tgWebAppData", "URL_SECRET", "PRIVATE_PERSON_SENTINEL", "PRIVATE_INPUT_SENTINEL", "PRIVATE_INVITE_SENTINEL", "PRIVATE_IMAGE_SENTINEL", "PRIVATE_BLOCK_SENTINEL", "PRIVATE_HIDDEN_SENTINEL", "PRIVATE_TYPED_SENTINEL", "PRIVATE_CONSOLE_SENTINEL"]) expect(wire).not.toContain(forbidden);
  const identified = f.events.find(e => e.event === "$identify")!.properties.distinct_id;
  expect(identified).toMatch(/^frocal:player:v1:[a-f0-9]{64}$/);
  for (const event of f.events) expect(event.properties.distinct_id).toBe(identified);
  expect(f.events.filter(e => e.event === "$pageview")).toHaveLength(1);
  expect(f.events.filter(e => e.event === "clan_status_opened")).toHaveLength(1);
  f.failTransport();
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /close/i }).click();
  await expect.poll(() => f.events.filter(e => e.event === "clan_status_opened").length).toBe(2);
  await page.getByRole("button", { name: "Demo privacy", exact: true }).click();
  await page.screenshot({ path: `${evidence}/consent-preferences.png`, animations: "disabled" });
  await page.getByRole("button", { name: "Withdraw and stop tracking", exact: true }).click();
  await page.waitForTimeout(1000); const count = f.events.length;
  await page.getByRole("button", { name: "Clan status", exact: true }).click();
  await page.waitForTimeout(8000); expect(f.events).toHaveLength(count); // Includes queued network retry windows.
  await page.reload(); await expect(page.getByRole("button", { name: "Demo privacy", exact: true })).toBeVisible();
  await page.waitForTimeout(2000); expect(f.events).toHaveLength(count);
  mkdirSync(evidence, { recursive: true });
  writeFileSync(`${evidence}/safe-capture-summary.json`, JSON.stringify({ events: f.events.map(e => ({ event: e.event, section: e.properties.section })), snapshotTypes: [...new Set(snapshots.map(e => e.type))], allAttributed: true, sentinelsAbsent: true, stoppedOnWithdrawal: true }, null, 2));
  // Reconstruct the actual masked snapshots using the same official rrweb fork.
  // This test-only viewer never ships in the production application.
  const playback = await page.context().newPage();
  await playback.route("**/__replay.html", route => route.fulfill({ contentType: "text/html", body: '<html><body style="margin:0"><div id="replay"></div></body></html>' }));
  await playback.route("**/__rrweb.js", route => route.fulfill({ contentType: "text/javascript", path: "node_modules/posthog-js/dist/rrweb.js" }));
  await playback.goto("/__replay.html");
  await playback.evaluate(async events => {
    const { Replayer } = await import(/* @vite-ignore */ "/__rrweb.js");
    const player = new Replayer(events, { root: document.getElementById("replay"), showWarning: false, showDebug: false });
    player.pause(events.find(event => event.type === 2).timestamp - events[0].timestamp + 1);
  }, snapshots);
  const dimensions = snapshots.find(event => event.type === 4)?.data ?? { width: 412, height: 839 };
  await playback.setViewportSize({ width: dimensions.width, height: dimensions.height });
  await playback.locator("iframe").evaluate((element, size) => {
    const frame = element as HTMLIFrameElement;
    frame.style.cssText = `width:${size.width}px;height:${size.height}px;border:0;position:relative;transform:none;display:block`;
  }, dimensions);
  const frame = playback.frameLocator("iframe");
  await expect(frame.locator("main > header")).toBeVisible();
  expect(await frame.locator("body").innerText()).not.toContain("PRIVATE_");
  await playback.locator("iframe").screenshot({ path: `${evidence}/masked-replay.png`, animations: "disabled" });
  await playback.close();
});

test("verified account changes reset identity and the same player matches on a second device", async ({ page, browser }) => {
  test.setTimeout(60_000);
  const f = await prepare(page); await page.goto(launch("/earn")); await allow(page, false);
  await expect.poll(() => f.events.filter(e => e.event === "$identify").length).toBe(1);
  const id = f.events.find(e => e.event === "$identify")!.properties.distinct_id;
  const other = await browser.newContext({ ...devices["Pixel 7"], deviceScaleFactor: 1 });
  const otherPage = await other.newPage(); const g = await prepare(otherPage);
  await otherPage.goto(launch("/earn")); await allow(otherPage, false);
  await expect.poll(() => g.events.filter(e => e.event === "$identify").length).toBe(1);
  expect(g.events.find(e => e.event === "$identify")!.properties.distinct_id).toBe(id);
  await other.close();
  f.app.bootstrap.player.id = "9002"; f.app.bootstrap.player.telegram_user_id = 9002;
  const nextAuth = `user=${encodeURIComponent(JSON.stringify({ id: 9002, first_name: "Other tester" }))}&auth_date=123&hash=isolated-other-browser`;
  const mark = f.events.length;
  await page.evaluate(hash => {
    localStorage.setItem("dalexio-onboarding-v1:player:9002", localStorage.getItem("dalexio-onboarding-v1:player:9001")!);
    location.hash = hash;
  }, `tgWebAppData=${encodeURIComponent(nextAuth)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
  await expect.poll(() => f.events.filter(e => e.event === "$identify").length).toBe(2);
  const next = f.events.filter(e => e.event === "$identify")[1].properties.distinct_id;
  expect(next).not.toBe(id);
  expect(f.events.slice(mark).every(e => e.properties.distinct_id === next)).toBe(true);
});

test("analytics-only consent: SPA pages, returning identity and confirmed reward events", async ({ page }) => {
  test.setTimeout(90_000);
  const f = await prepare(page);
  await page.goto(launch("/earn")); await allow(page, false);
  await expect.poll(() => f.events.some(e => e.event === "$identify")).toBe(true);
  const id = f.events.find(e => e.event === "$identify")!.properties.distinct_id;
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.locator('[role="presentation"]').click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Network", exact: true }).click();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await page.getByRole("navigation", { name: "Earn sections" }).getByRole("button", { name: "Earn", exact: true }).click();
  await page.getByRole("button", { name: "Claim daily core", exact: true }).click();
  await expect.poll(() => f.events.filter(e => e.event === "daily_reward_claimed").length).toBe(1);
  await page.reload();
  await expect.poll(() => f.events.filter(e => e.event === "$identify").length).toBe(2);
  await expect.poll(() => f.events.filter(e => e.event === "$pageview").length).toBe(5);
  expect(f.events.filter(e => e.event === "$identify").every(e => e.properties.distinct_id === id)).toBe(true);
  expect(f.events.some(e => e.event === "$snapshot")).toBe(false);
  expect(f.events.filter(e => e.event === "$pageview").map(e => e.properties.section)).toEqual(["earn", "network", "typing", "earn", "earn"]);
  expect(f.events.filter(e => e.event === "earn_history_opened")).toHaveLength(1);
});

test("unverified launch never offers consent or sends requests", async ({ page }) => {
  const f = await prepare(page); await page.goto("/clan"); await page.waitForTimeout(2500);
  expect(f.requests).toHaveLength(0);
  await expect(page.getByRole("button", { name: /Allow analytics/ })).toHaveCount(0);
});

for (const width of [320, 390, 460]) test(`Clan header matches Earn History at ${width}px, including long names and Soldier`, async ({ page }) => {
  test.setTimeout(60_000); await page.setViewportSize({ width, height: 640 });
  const f = await prepare(page); const dir = `${evidence}/${width}`; mkdirSync(dir, { recursive: true });
  await page.goto(launch("/earn")); await page.getByRole("button", { name: "No thanks", exact: true }).click();
  const buttonStyle = (el: Element) => {
    const s = getComputedStyle(el); return { height: s.height, padding: s.padding, border: s.border, background: s.backgroundColor, radius: s.borderRadius, fontSize: s.fontSize, fontWeight: s.fontWeight, gap: s.gap };
  };
  const reference = await page.getByRole("button", { name: "History", exact: true }).evaluate(buttonStyle);
  await page.screenshot({ path: `${dir}/earn-reference.png`, animations: "disabled" });
  for (const state of ["captain", "long-name", "soldier", "captain-registration", "soldier-discovery"] as const) {
    if (state === "long-name") f.identity.name = "Intercontinental Clan Headquarters and Expedition Command";
    if (state === "soldier") { f.data.state.role = "SOLDIER"; f.member.role = "SOLDIER"; }
    if (state === "captain-registration") { f.data.state.role = "CAPTAIN"; f.setMembership(null); }
    if (state === "soldier-discovery") f.data.state.role = "SOLDIER";
    if (state === "captain") await page.goto(launch("/clan")); else await page.reload();
    const button = page.getByRole("button", { name: "Clan status", exact: true });
    const member = ["captain", "long-name", "soldier"].includes(state);
    if (member) await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
    const header = page.locator("main > header");
    if (state !== "captain") await expect(header.locator("h1")).toHaveText(member ? f.identity.name : state === "captain-registration" ? "Register your headquarters." : "Find your seasonal home.");
    await header.scrollIntoViewIfNeeded();
    expect(await button.evaluate(buttonStyle)).toEqual(reference);
    const geometry = await header.evaluate(el => {
      const button = el.querySelector("button")!, title = el.querySelector("h1")!, subtitle = el.querySelector("p")!;
      const b = button.getBoundingClientRect(), t = title.getBoundingClientRect(), p = subtitle.getBoundingClientRect(), h = el.getBoundingClientRect();
      const icon = button.querySelector("svg")!.getBoundingClientRect();
      const copy = title.parentElement!.getBoundingClientRect();
      const next = el.nextElementSibling?.getBoundingClientRect();
      return {
        header: h.toJSON(), button: b.toJSON(), title: t.toJSON(), subtitle: p.toJSON(),
        copy: copy.toJSON(), iconLeft: icon.left,
        titleFits: title.scrollWidth <= title.clientWidth + 1,
        nextCardGap: next ? next.top - h.bottom : null,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry.overflow).toBe(false); expect(geometry.titleFits).toBe(true);
    // The copy and action now occupy independent columns. Do not require the
    // button to start below the title: it must sit bottom-right, not under it.
    expect(geometry.copy.right).toBeLessThanOrEqual(geometry.button.left - 1);
    expect(geometry.subtitle.top - geometry.title.bottom).toBeGreaterThanOrEqual(0);
    expect(geometry.subtitle.top - geometry.title.bottom).toBeLessThanOrEqual(10);
    expect(Math.abs(geometry.button.bottom - geometry.header.bottom)).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.button.right - geometry.header.right)).toBeLessThanOrEqual(4);
    expect(geometry.nextCardGap).not.toBeNull();
    expect(geometry.nextCardGap!).toBeGreaterThanOrEqual(0);
    expect(geometry.nextCardGap!).toBeLessThanOrEqual(25);
    expect(geometry.iconLeft).toBeLessThan(geometry.button.right - 40);
    await page.screenshot({ path: `${dir}/clan-${state}.png`, animations: "disabled" });
    writeFileSync(`${dir}/${state}-geometry.json`, JSON.stringify(geometry, null, 2));
    await button.click(); await expect(page.getByRole("dialog", { name: "Clan status", exact: true })).toBeVisible();
  }
});
