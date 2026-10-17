import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./scripts/contracts/browser", testMatch: ["clan-b5.spec.ts", "clan-b6.spec.ts"], workers: 1, retries: 0,
  timeout: 60_000, expect: { timeout: 12_000 }, outputDir: "work/b6-paired/browser-artifacts",
  reporter: [["list"], ["json", { outputFile: "work/b6-paired/browser.json" }]],
  use: { ...devices["Pixel 7"], actionTimeout: 15_000, deviceScaleFactor: 1, baseURL: "http://127.0.0.1:4175", reducedMotion: "reduce", trace: "off", screenshot: "off", video: "off", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: { command: "npx vite build --outDir dist-paired && node scripts/contracts/paired-preview.mjs", env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" }, url: "http://127.0.0.1:4175/base", reuseExistingServer: false },
});
