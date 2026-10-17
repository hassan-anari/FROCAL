import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { prepareClan } from "./b6-fixture";
import { launch } from "./b4-fixture";

// Actual authenticated HTTP response from the pinned backend; not a modified contract fixture.
const feed = JSON.parse(readFileSync("docs/evidence/b6-zero-net/zero-net-activity-http.json", "utf8"));
const event = feed.items.find((row: any) => row.event_type === "CLAN_REWARD_SETTLED" && row.amount === 0);
const before = Boolean(process.env.B6_ACTIVITY_REVIEW_BASELINE);
for (const width of [320, 390, 460]) test(`real zero-net feed preserves Recent activity card at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const f = await prepareClan(page); Object.assign(f.data.activity, feed);
  await page.goto(launch("/clan"));
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Recent activity", exact: true }) }).last();
  const row = card.locator(`[data-activity-id="${event.id}"]`);
  await expect(row.locator("strong")).toHaveText(before ? `${event.actor_name} earned 0 points` : `${event.actor_name} contributed to the Clan Treasury`);
  await expect(row.locator("p")).toHaveText("1 Treasury credits · 1 contribution");
  await expect(row.locator("time")).toHaveAttribute("datetime", event.occurred_at);
  await expect(row).toHaveCount(1);
  const positive = feed.items.find((item: any) => item.event_type === "CLAN_REWARD_SETTLED" && item.amount > 0);
  await expect(card.locator(`[data-activity-id="${positive.id}"] strong`)).toHaveText(`${positive.actor_name} earned ${positive.amount} points`);
  if (!before) await expect(card.getByText(/earned 0 points/)).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await card.scrollIntoViewIfNeeded();
  const geometry = await card.evaluate(node => {
    const article = node.querySelector("article")!, title = article.querySelector("strong")!, description = article.querySelector("p")!;
    const style = (element: Element) => { const s = getComputedStyle(element); return { font: s.font, color: s.color, padding: s.padding, gap: s.gap, gridTemplateColumns: s.gridTemplateColumns }; };
    return { cardWidth: node.getBoundingClientRect().width, card: style(node), article: style(article), title: style(title), description: style(description) };
  });
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const path = `docs/evidence/b6-zero-net/${width}`; mkdirSync(path, { recursive: true });
  if (before) writeFileSync(`${path}/before-geometry.json`, JSON.stringify(geometry, null, 2) + "\n");
  else expect(geometry).toEqual(JSON.parse(readFileSync(`${path}/before-geometry.json`, "utf8")));
  await card.screenshot({ path: `${path}/${before ? "before" : "after"}-recent-activity.png`, animations: "disabled" });
});
