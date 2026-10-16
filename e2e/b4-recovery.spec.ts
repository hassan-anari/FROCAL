import { readFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { launch, prepareB4 } from "./b4-fixture";
const session = JSON.parse(readFileSync("src/integrations/api/fixtures/b3/session-switch.json", "utf8"));
for (const width of [320, 390, 460]) {
  test(`Session Recovery preserves existing fencing and only separates the two actions at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await prepareB4(page); state.bootstrap.features.base_tap = true;
    const tapState = { ...session.another_device, player_id: "9001", config_version: state.bootstrap.config.version, server_time: state.canonical.server_time, progression: state.canonical.progression, season_points: state.canonical.season_points, receipt_cursor: state.canonical.receipt_cursor, ownership: { ...session.another_device.ownership, active_until: "2026-10-15T08:14:22Z" } };
    let reads = 0; let takeovers = 0;
    await page.route("**/api/v1/base/v2/tap-state*", route => { reads++; return route.fulfill({ json: tapState }); });
    await page.route("**/api/v1/base/v2/tap-leases", route => { takeovers++; return route.fulfill({ status: 409, json: { code: "ACTIVE_SESSION", detail: "isolated device conflict", retryable: true } }); });
    await page.goto(launch("/base"));
    await expect(page.getByRole("heading", { name: "You're already playing on another device" })).toBeVisible();
    const retry = page.getByRole("button", { name: "Try Again", exact: true });
    const change = page.getByRole("button", { name: "Switch to This Device", exact: true });
    await expect(change).toBeVisible();
    const a = await retry.boundingBox(), b = await change.boundingBox();
    expect(a).not.toBeNull(); expect(b).not.toBeNull();
    const gap = b!.x - (a!.x + a!.width);
    expect(b!.y).toBe(a!.y);
    if (!process.env.B4_BASELINE) expect(gap).toBeGreaterThanOrEqual(12);
    mkdirSync(`docs/evidence/b4/${width}`, { recursive: true });
    await page.screenshot({ path: `docs/evidence/b4/${width}/${process.env.B4_BASELINE ? "before" : "after"}-session-recovery.png`, animations: "disabled" });
    expect(takeovers).toBe(0);
    const previous = reads;
    await retry.click();
    await expect.poll(() => reads).toBeGreaterThan(previous);
    expect(takeovers).toBe(0);
    await change.click();
    await expect(page.getByRole("dialog", { name: "Continue on this device?" })).toBeVisible();
    expect(takeovers).toBe(0);
  });
}
