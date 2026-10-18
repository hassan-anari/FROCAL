import { expect, test, type Page } from "@playwright/test";

async function openEarn(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dalexio-onboarding-v1", JSON.stringify({
      state: { status: "completed", step: "ready", guideIndex: 3, completedAt: new Date().toISOString() },
      version: 1,
    }));
  });
  await page.goto("/earn");
}

test.describe("Phase 3.1 Earn Center", () => {
  test("claims the Daily Core and opens the reward reveal", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /Claim daily core/i }).click();
    await expect(page.getByText("REWARD ACQUIRED")).toBeVisible();
    await expect(page.getByRole("heading", { name: "+40 XP" })).toBeVisible();
  });

  test("separates active and completed missions", async ({ page }) => {
    await openEarn(page);
    await expect(page.getByRole("heading", { name: /Active Missions/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Completed Missions/i })).toBeVisible();
  });

  test("opens Network and Typing tabs", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: "Network" }).click();
    await expect(page.getByRole("heading", { name: /Grow with people and groups/i })).toBeVisible();
    await page.getByRole("navigation", { name: "Earn sections" }).getByRole("button", { name: "Typing", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Typing Arena", exact: true })).toBeVisible();
  });

  test("opens the permanent Typing Arena", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("navigation", { name: "Earn sections" }).getByRole("button", { name: "Typing", exact: true }).click();
    await page.getByRole("button", { name: /Enter Typing Arena/i }).click();
    await expect(page.getByRole("heading", { name: /Type with intent/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Typing challenge input/i })).toBeVisible();
  });

  test("opens the shared activity history", async ({ page }) => {
    await openEarn(page);
    await page.getByRole("button", { name: /History/i }).click();
    await expect(page.getByRole("heading", { name: /Your recent progress/i })).toBeVisible();
  });
  test("demo History retains every existing history type while the Network preview stays scoped", async ({ page }) => {
    await openEarn(page);
    const history = ["daily", "mission", "typing", "referral", "group", "system"].map((type, i) => ({ id: `demo-${i}`, type, title: `Existing ${type} reward`, description: "Local history", xp: i === 1 ? -3 : 7, createdAt: "2026-10-18T10:00:00Z" }));
    await page.evaluate(items => localStorage.setItem("dalexio-earn-state-v2", JSON.stringify({ version: 0, state: { history: items } })), history);
    await page.reload(); await page.getByRole("button", { name: "History", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Earn history" });
    await expect(sheet.locator("article strong")).toHaveText(history.map(item => item.title));
    await expect(sheet).toContainText("-3 XP"); await sheet.evaluate(el => el.parentElement!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await page.getByRole("button", { name: "Network", exact: true }).click();
    const preview = page.locator("section").filter({ has: page.getByRole("heading", { name: "Network History", exact: true }) });
    await expect(preview.locator("article strong")).toHaveText(["Existing group reward"]);
  });
});
