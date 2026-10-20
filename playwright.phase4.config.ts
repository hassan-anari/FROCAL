import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: "phase4-contract.spec.ts", workers: 2, retries: 0, timeout: 60_000,
  outputDir: "work/test-results-phase4", reporter: [["list"], ["json", { outputFile: "work/phase4-browser-results.json" }]],
  use: { baseURL: "http://127.0.0.1:4194", reducedMotion: "reduce", screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: { command: "npx vite build --outDir work/phase4-dist && npx vite preview --outDir work/phase4-dist --host 127.0.0.1 --port 4194 --strictPort", env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" }, url: "http://127.0.0.1:4194", reuseExistingServer: false, timeout: 120_000 },
});
