import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { prepareClan } from "./b6-fixture";
import { launch } from "./b4-fixture";
const before = Boolean(process.env.POST_B6_BASELINE);
for (const width of [320, 390, 460]) test(`post-B6 mobile visual comparison ${width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 740 });
  const f = await prepareClan(page);
  const dir = `docs/evidence/post-b6/${width}`; mkdirSync(dir, { recursive: true });
  // Only the Phase 4 Season eyebrow/intro text is excluded from pixel equality.
  const masks = (name: string) => name === "preserved-profile" ? [page.locator('[class*="identityCopy"] > span')] : name === "preserved-arena" ? [page.locator("main > header > p")] : [];
  const shot = async (name: string) => {
    await page.waitForTimeout(700); await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ mask: masks(name), path: `${dir}/${before ? "before" : "after"}-${name}.png`, animations: "disabled" });
  };
  await page.goto(launch("/clan"));
  await expect(page.getByRole("navigation", { name: "Clan headquarters sections" })).toBeVisible();
  await shot("clan-header");
  const header = page.locator("main > header");
  const dimensions = await header.evaluate(el => {
    const box = el.getBoundingClientRect(), title = el.querySelector("h1")!, button = el.querySelector("button")!;
    const subtitle = el.querySelector("p")!, copy = el.querySelector("h1")!.parentElement!;
    const titleBox = title.getBoundingClientRect(), subtitleBox = subtitle.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect(), copyBox = copy.getBoundingClientRect();
    const nextBox = el.nextElementSibling!.getBoundingClientRect();
    return { height: box.height, titleWidth: titleBox.width, titleScrollWidth: title.scrollWidth, buttonHeight: buttonBox.height, subtitleGap: subtitleBox.top - titleBox.bottom, cardGap: nextBox.top - box.bottom, buttonBottomGap: box.bottom - buttonBox.bottom, buttonRightGap: box.right - buttonBox.right, textButtonOverlap: copyBox.right > buttonBox.left + 1, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  writeFileSync(`${dir}/${before ? "before" : "after"}-header.json`, JSON.stringify(dimensions, null, 2));
  if (!before) {
    expect(dimensions.buttonHeight).toBe(38);
    expect(dimensions.overflow).toBe(false);
    expect(dimensions.subtitleGap).toBeGreaterThanOrEqual(0);
    expect(dimensions.subtitleGap).toBeLessThanOrEqual(10);
    expect(dimensions.cardGap).toBeGreaterThanOrEqual(0);
    expect(dimensions.cardGap).toBeLessThanOrEqual(25);
    expect(Math.abs(dimensions.buttonBottomGap)).toBeLessThanOrEqual(2);
    expect(dimensions.buttonRightGap).toBeLessThanOrEqual(4);
    expect(dimensions.textButtonOverlap).toBe(false);
  }
  await page.getByText("FACILITIES", { exact: true }).scrollIntoViewIfNeeded();
  await shot("clan-equipment");
  f.identity.name = "Intercontinental Clan Headquarters and Expedition Command";
  await page.reload(); await expect(header.locator("h1")).toHaveText(f.identity.name); await header.scrollIntoViewIfNeeded();
  if (!before) { expect(await header.locator("h1").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await shot("clan-long-title");
  // Keep full pixel coverage of a real objective; the authorized empty-section removal has dedicated regressions.
  f.app.missions = [{ ...f.app.missions[0], title: "Server objective", available: true, state: "AVAILABLE" }];
  for (const path of ["/base", "/profile", "/arena"]) {
    await page.goto(launch(path)); await expect(page.locator("main")).toBeVisible();
    if (path === "/base") await expect(page.getByRole("region", { name: "Next objectives" }).locator("article h3")).toHaveText(["Server objective"]);
    if (path === "/profile") await expect(page.getByRole("button", { name: "Customize", exact: true })).toBeEnabled();
    if (path === "/arena") await expect(page.getByRole("button", { name: "Unlocks in Season 2" })).toBeDisabled();
    await shot(`preserved-${path.slice(1)}`);
    if (!before) await expect(page).toHaveScreenshot([String(width), `before-preserved-${path.slice(1)}.png`], { mask: masks(`preserved-${path.slice(1)}`), animations: "disabled", maxDiffPixelRatio: .002 });
  }
});
