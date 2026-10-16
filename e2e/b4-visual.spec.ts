import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fixture, launch, prepareB4 } from "./b4-fixture";
const phase = process.env.B4_BASELINE ? "before" : "after";
for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 460, height: 900 }]) {
  test(`preservation evidence ${phase} ${viewport.width}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const state = await prepareB4(page);
    const dir = `docs/evidence/b4/${viewport.width}`; mkdirSync(dir, { recursive: true });
    const shot = async (name: string) => {
      // Wait for the existing DeferredMount and image decoding, so a loading frame
      // cannot be mistaken for a design change in the preservation evidence.
      await page.waitForTimeout(1000);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.race([Promise.all(Array.from(document.images).filter(img => { const box = img.getBoundingClientRect(); return img.complete || (box.top < innerHeight && box.bottom > 0); }).map(img => img.decode().catch(() => undefined))), new Promise(done => setTimeout(done, 2000))]); });
      await page.screenshot({ path: `${dir}/${phase}-${name}.png`, animations: "disabled" });
      // These full screens have identical data and no authorized visual changes.
      // Compare against the saved pre-edit release, never an auto-approved after image.
      if (phase === "after" && ["base-header", "profile-overview", "network", "arena-warfront"].includes(name)) {
        await expect(page).toHaveScreenshot([String(viewport.width), `before-${name}.png`], { animations: "disabled", maxDiffPixelRatio: 0.002 });
      }
    };
    await page.goto(launch("/base"));
    await expect(page.getByRole("button", { name: "Interact with Dexo" })).toBeVisible();
    await shot("base-header");
    await page.goto(launch("/earn"));
    await expect(page.getByRole("button", { name: "Claim daily core" })).toBeVisible();
    await shot("earn-daily");
    await page.getByRole("heading", { name: "Completed Missions", exact: true }).scrollIntoViewIfNeeded();
    await shot("earn-missions");
    const availableMissions = state.missions;
    state.missions = state.missions.map((mission: any) => mission.key === fixture.mission_claim.response.key ? { ...mission, state: "CLAIMED", claimed_at: fixture.mission_claim.response.claimed_at } : mission);
    await page.reload();
    await page.waitForTimeout(1000);
    await page.locator('section[aria-label="Completed missions"] article').first().evaluate(card => card.scrollIntoView({ block: "center", behavior: "instant" }));
    await shot("mission-completed");
    state.missions = availableMissions;
    await page.reload();
    await page.getByRole("button", { name: "Network", exact: true }).click();
    await page.getByRole("heading", { name: "Grow with people and groups." }).scrollIntoViewIfNeeded();
    await shot("network");
    await page.getByRole("heading", { name: "Latest explorers" }).scrollIntoViewIfNeeded();
    await shot("referrals");
    if (phase === "after") {
      const origin = new URL(page.url()).origin;
      state.invitees.items[0].photo_url = `${origin}/api/v1/profile/avatar/00000000-0000-4000-8000-000000000002?token=visual`;
      state.groups.items[0].photo_url = `${origin}/api/v1/profile/group-avatar/00000000-0000-4000-8000-000000000003?token=visual`;
      await page.route("**/profile/*avatar/*?token=visual", route => route.fulfill({ contentType: "image/webp", path: "public/assets/profile/seasonal-medal-top-10-percent.webp" }));
      await page.reload();
      await page.getByRole("heading", { name: "Latest explorers" }).scrollIntoViewIfNeeded();
      await shot("referral-private-image");
      await page.waitForTimeout(1000);
      await page.getByRole("article", { name: state.groups.items[0].title }).evaluate(row => row.scrollIntoView({ block: "center", behavior: "instant" }));
      await shot("group-private-image");
      state.invitees.items[0].photo_url = "";
      state.groups.items[0].photo_url = "";
      await page.reload();
    }
    await page.waitForTimeout(1000);
    await page.getByRole("article", { name: state.groups.items[0].title }).evaluate(row => row.scrollIntoView({ block: "center", behavior: "instant" }));
    await shot("communities");
    await page.getByRole("button", { name: "Typing", exact: true }).click();
    await page.getByRole("heading", { name: "Typing Arena", exact: true }).scrollIntoViewIfNeeded();
    await shot("typing-dashboard");
    await page.getByRole("heading", { name: "Typing History" }).scrollIntoViewIfNeeded();
    await shot("typing-history");
    await page.goto(launch("/earn/typing"));
    await expect(page.getByRole("heading", { name: "Type with intent." })).toBeVisible();
    await shot("typing-challenge");
    await page.goto(launch("/profile"));
    await expect(page.getByRole("button", { name: "Customize", exact: true })).toBeEnabled();
    await shot("profile-overview");
    const customize = page.getByRole("button", { name: "Customize", exact: true });
    expect((await customize.boundingBox())?.height).toBe(36);
    await customize.click();
    await expect(page.getByRole("dialog", { name: "Customize profile" })).toBeVisible();
    await shot("profile-customize");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Share profile", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Share profile" })).toBeVisible();
    await shot("profile-share");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Achievements", exact: true }).click();
    await expect(page.getByText("First Verified Activity", { exact: true })).toBeVisible();
    await shot("profile-achievements");
    await page.getByText("First Verified Activity", { exact: true }).click();
    await expect(page.getByRole("dialog", { name: "First Verified Activity" })).toBeVisible();
    await shot("profile-detail");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Collection", exact: true }).click();
    await expect(page.getByRole("button", { name: "Frames", exact: true })).toBeVisible();
    await shot("profile-collection");
    await page.goto(launch("/arena"));
    await expect(page.getByRole("button", { name: "Unlocks in Season 2" })).toBeDisabled();
    await page.locator("[data-game-scroll]").evaluate(e => e.scrollTop = 0);
    await shot("arena-warfront");
    await page.getByRole("button", { name: "Rankings", exact: true }).click();
    await expect(page.getByRole("button", { name: "Players", exact: true })).toBeVisible();
    await page.locator("[data-game-scroll]").evaluate(e => e.scrollTop = 0);
    await shot("arena-players");
    await page.getByRole("button", { name: "Clans", exact: true }).click();
    await shot("arena-clans");
    await page.getByRole("button", { name: "Open notifications", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
    await shot("notifications");
    await page.getByRole("button", { name: "Close notifications", exact: true }).click();
    await page.goto(launch("/earn"));
    await page.getByRole("navigation", { name: "Earn sections" }).getByRole("button", { name: "Earn", exact: true }).click();
    await page.getByRole("button", { name: "Claim daily core", exact: true }).click();
    if (!process.env.B4_BASELINE) await expect(page.getByRole("dialog", { name: "XP reward" })).toBeVisible();
    await shot("reward-settlement");
    if (!process.env.B4_BASELINE) {
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Dexo level up" })).toBeVisible();
      await shot("level-reveal");
      await page.getByRole("button", { name: "Return to Earn", exact: true }).click();
      await page.locator("[data-game-scroll]").evaluate(e => e.scrollTop = 0);
      await shot("daily-completed");
      await page.goto(launch("/profile"));
      state.saveError = true;
      await page.getByRole("button", { name: "Overview", exact: true }).click();
      await page.getByRole("button", { name: "Customize", exact: true }).click();
      await page.getByRole("button", { name: "Save profile", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Your profile couldn't be saved.");
      await shot("transient-error");
    }
  });
}
