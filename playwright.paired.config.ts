import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./scripts/contracts/browser",
  testIgnore: process.env.B3_BACKEND_ROOT ? undefined : "**/*-b3.spec.ts", workers: 1, fullyParallel: false, retries: 0,
  outputDir: "test-results-paired/artifacts",
  reporter: [["list"], ["json", { outputFile: "test-results-paired/results.json" }]],
  use: {
    ...devices["Pixel 7"], baseURL: "http://127.0.0.1:4175",
    // Authenticated Telegram URLs must never enter uploaded traces or screenshots.
    trace: "off", screenshot: "off", video: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  webServer: {
    command: "npx vite build --outDir dist-paired && node scripts/contracts/paired-preview.mjs",
    env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" },
    url: "http://127.0.0.1:4175/base", reuseExistingServer: false,
  },
});
