import { expect, test } from "@playwright/test";
import { prepareB4, launch } from "./b4-fixture";
test("Network History skips unrelated rewards, continues all-filtered pages and retries a failed continuation", async ({ page }) => {
  await prepareB4(page);
  let fail = true;
  const row = (id: number, source_type: string) => ({ id, source_type, context: "NETWORK_GROUP", player_amount: id, occurred_at: "2026-10-16T10:10:00Z" });
  await page.route("**/api/v1/rewards/history?*", route => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    if (!cursor) return route.fulfill({ json: { items: [row(100, "DAILY"), row(99, "CLAN_MISSION"), row(98, "TYPING")], next_cursor: 98 } });
    if (fail) return route.fulfill({ status: 503, json: { detail: "private diagnostic" } });
    return route.fulfill({ json: { items: [row(97, "CREATOR"), row(96, "NETWORK_SPEAKER"), row(95, "MISSION")], next_cursor: null } });
  });
  await page.goto(launch("/earn")); await page.getByRole("button", { name: "History", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Earn history" });
  await expect(sheet).toContainText("No Network earnings in these records"); await expect(sheet.locator("article")).toHaveCount(0);
  await sheet.getByRole("button", { name: "Load more", exact: true }).click(); await expect(sheet).toContainText("Earnings couldn't load.");
  fail = false; await sheet.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(sheet.locator("article")).toHaveCount(2); await expect(sheet).toContainText("CREATOR"); await expect(sheet).toContainText("NETWORK SPEAKER");
  for (const source of ["DAILY", "TYPING", "MISSION", "CLAN MISSION"]) await expect(sheet.getByText(source, { exact: true })).toHaveCount(0);
});
