import { expect, test } from "@playwright/test";
import { prepareB4, launch } from "./b4-fixture";
test("Network History uses server-filtered pages and retries a failed continuation without losing rows", async ({ page }) => {
  await prepareB4(page);
  let fail = true;
  const row = (id: number, source_type: string) => ({ id, source_type, context: "NETWORK_GROUP", player_amount: id, occurred_at: "2026-10-16T10:10:00Z" });
  await page.route("**/api/v1/rewards/history?*", route => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("category")).toBe("network");
    if (!params.get("cursor")) return route.fulfill({ json: { items: [row(97, "CREATOR")], next_cursor: 97 } });
    expect(params.get("cursor")).toBe("97");
    if (fail) return route.fulfill({ status: 503, json: { detail: "private diagnostic" } });
    return route.fulfill({ json: { items: [row(96, "NETWORK_SPEAKER")], next_cursor: null } });
  });
  await page.goto(launch("/earn")); await page.getByRole("button", { name: "History", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Earn history" });
  await expect(sheet).toContainText("More earnings couldn't load."); await expect(sheet.locator("article")).toHaveCount(1);
  fail = false; await sheet.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(sheet.locator("article")).toHaveCount(2); await expect(sheet).toContainText("CREATOR"); await expect(sheet).toContainText("NETWORK SPEAKER");
});
