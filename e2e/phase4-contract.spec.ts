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
