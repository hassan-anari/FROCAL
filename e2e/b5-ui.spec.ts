import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, prepareB4 } from "./b4-fixture";
const phase = process.env.B5_BASELINE ? "before" : "after";
for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 460, height: 900 }]) {
  test(`approved corrections ${phase} ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const state = await prepareB4(page);
    const origin = new URL(test.info().project.use.baseURL!).origin;
    // Existing B3/B4 network contract, with a local photographic asset; no B5 wire fixture.
    const original = state.groups.items[0];
    state.groups.items = [
      { ...original, title: "Photo Community", photo_url: `${origin}/api/v1/profile/group-avatar/00000000-0000-4000-8000-000000000081?token=photo` },
      { ...original, public_id: "00000000-0000-4000-8000-000000000082", title: "Fallback Community", photo_url: "" },
      { ...original, public_id: "00000000-0000-4000-8000-000000000083", title: "Failed Community", photo_url: `${origin}/api/v1/profile/group-avatar/00000000-0000-4000-8000-000000000083?token=failed` },
    ];
    await page.route("**/profile/group-avatar/*", route => route.request().url().includes("token=photo") ? route.fulfill({ contentType: "image/png", path: "e2e/fixtures/b5/community-photo.png" }) : route.fulfill({ status: 404 }));
    const dir = `docs/evidence/b5/${viewport.width}`; mkdirSync(dir, { recursive: true });
    const shot = async (name: string, preserved = false) => {
      await page.waitForTimeout(1000);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).filter(img => img.complete).map(img => img.decode().catch(() => undefined))); });
      // Phase 4 changes only these Season labels; preserve the surrounding pixel gate.
      const mask = name === "profile" ? [page.locator('[class*="identityCopy"] > span')] : name === "arena-warfront" ? [page.locator("main > header > p")] : [];
      await page.screenshot({ mask, path: `${dir}/${phase}-${name}.png`, animations: "disabled" });
      if (phase === "after" && preserved) await expect(page).toHaveScreenshot([String(viewport.width), `before-${name}.png`], { mask, animations: "disabled", maxDiffPixelRatio: .002 });
    };
    await page.goto(launch("/earn"));
    await page.getByRole("button", { name: "Network", exact: true }).click();
    const cta = page.getByRole("button", { name: "Add bot to a group", exact: true });
    await cta.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await shot("group-expansion");
    const ctaHeight = (await cta.boundingBox())!.height;
    if (phase === "after") expect(ctaHeight).toBe(46);
    const row = page.getByRole("article", { name: "Photo Community", exact: true });
    await row.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(row.locator("img")).toBeVisible();
    await expect(page.getByRole("article", { name: "Fallback Community", exact: true }).locator("span").first()).toHaveText("FC");
    await expect(page.getByRole("article", { name: "Failed Community", exact: true }).locator("span").first()).toHaveText("FC");
    const computed = await row.locator("img").evaluate(img => {
      const read = (el: Element) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return { width: b.width, height: b.height, border: s.border, borderRadius: s.borderRadius, padding: s.padding, background: s.background, boxShadow: s.boxShadow, outline: s.outline, objectFit: s.objectFit, display: s.display }; };
      return { container: read(img.parentElement!), image: read(img) };
    });
    writeFileSync(`${dir}/${phase}-computed.json`, JSON.stringify({ ctaHeight, avatar: computed }, null, 2) + "\n");
    await shot("communities");
    await page.goto(launch("/base"));
    if (phase === "after") {
      // This fixture has no titled actionable objectives; the owner correction removes the whole section.
      await expect(page.getByRole("heading", { name: "Next Objective", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "All missions", exact: true })).toHaveCount(0);
      await page.getByRole("region", { name: "Base status", exact: true }).scrollIntoViewIfNeeded();
    } else await page.getByRole("heading", { name: "Next Objective", exact: true }).evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await shot("base-objectives-rewards");
    await page.goto(launch("/earn"));
    if (phase === "after") {
      await page.getByRole("button", { name: "History", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Earn history", exact: true })).toBeVisible();
      await shot("earn-history-error");
      await page.getByRole("dialog", { name: "Earn history" }).evaluate(el => el.parentElement!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    }
    await page.goto(launch("/profile"));
    await expect(page.getByRole("button", { name: "Customize", exact: true })).toBeEnabled();
    await shot("profile", true);
    await page.goto(launch("/arena"));
    await expect(page.getByRole("button", { name: "Unlocks in Season 2" })).toBeDisabled();
    await page.locator("[data-game-scroll]").evaluate(el => el.scrollTop = 0);
    await shot("arena-warfront", true);
    await page.getByRole("button", { name: "Open notifications", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
    await shot("notifications");
    if (phase === "after") await expect(page.locator("[data-notification-list] > button > span:first-child")).toHaveText(["01"]);
  });
}
