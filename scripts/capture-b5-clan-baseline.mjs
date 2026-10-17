// Capture the approved local diagnostic Clan design, never a fabricated backend reply.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createServer } from "vite";
const baseline = "ef6f1fca4de541e6eb45c9b8bf3e114bbd163cfb";
const checkout = "work/b5-approved-ui";
if (!existsSync(checkout) && spawnSync("git", ["worktree", "add", "--detach", checkout, baseline]).status !== 0) throw new Error("Approved baseline checkout unavailable");
if (spawnSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim() !== baseline || spawnSync("git", ["-C", checkout, "diff", "--quiet"]).status !== 0) throw new Error("Approved Clan baseline checkout drift");
// Vite dev is intentional: diagnostic setters are dev-only. The filesystem allow
// path only permits the shared installed font/dependencies outside the worktree.
process.env.VITE_DATA_SOURCE = "local";
process.env.VITE_ENABLE_DEV_PANEL = "false";
process.env.VITE_ENABLE_ARENA_DEBUG = "false";
const server = await createServer({ root: resolve(checkout), configFile: resolve(checkout, "vite.config.ts"), mode: "test-fixtures", server: { host: "127.0.0.1", port: 4177, strictPort: true, fs: { allow: [process.cwd()] } } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  for (const width of [320, 390, 460]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
    await page.goto("http://127.0.0.1:4177/clan");
    await page.evaluate(async () => {
      const { useScenarioStore } = await import("/src/game/scenarios/scenarioStore.ts");
      const { useClanStore } = await import("/src/game/clan/clanStore.ts");
      const { useEarnStore } = await import("/src/game/earn/earnStore.ts");
      useClanStore.getState().resetClan(); useEarnStore.setState({ level: 5 }); useScenarioStore.getState().setScenario("active-player");
    });
    const folder = `docs/evidence/b5/clan/${width}`; mkdirSync(folder, { recursive: true });
    await page.getByRole("button", { name: /Lead a clan/ }).waitFor();
    await page.screenshot({ path: `${folder}/before-approved-role-choice.png`, animations: "disabled" });
    await page.getByRole("button", { name: /Lead a clan/ }).click();
    await page.getByRole("dialog", { name: "Become a Captain" }).waitFor();
    await page.screenshot({ path: `${folder}/before-approved-role-confirmation.png`, animations: "disabled" });
    await page.keyboard.press("Escape");
    await page.evaluate(async () => { const { useClanStore } = await import("/src/game/clan/clanStore.ts"); useClanStore.getState().setCaptainHeadquartersForDiagnostics(); });
    await page.getByRole("navigation", { name: "Clan headquarters sections" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${folder}/before-approved-captain-headquarters.png`, animations: "disabled" });
    await page.getByRole("button", { name: "Inventory", exact: true }).click();
    await page.getByRole("button", { name: "Shop", exact: true }).click();
    await page.getByRole("button").filter({ hasText: "Clan XP Booster" }).first().click();
    await page.getByRole("dialog", { name: "Clan XP Booster", exact: true }).waitFor();
    await page.screenshot({ path: `${folder}/before-approved-item-sheet.png`, animations: "disabled" });
    await context.close();
  }
  writeFileSync("docs/evidence/b5/clan/baseline-provenance.json", JSON.stringify({ source_commit: baseline, source: "approved local dev diagnostic UI; values are historical samples, not backend fixtures", viewports: [320,390,460], height: 844, device_scale_factor: 1, browser: await browser.version() }, null, 2) + "\n");
} finally { await browser.close(); await server.close(); }
