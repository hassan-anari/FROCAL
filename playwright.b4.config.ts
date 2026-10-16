import { defineConfig } from "@playwright/test";
export default defineConfig({
  snapshotPathTemplate: "{testDir}/../docs/evidence/b4/{arg}{ext}",
  testDir: "./e2e", testMatch: "b4*.spec.ts", workers: 2, retries: 0,
  outputDir: "test-results-b4", reporter: [["list"], ["json", { outputFile: "test-results-b4/results.json" }]],
  use: { baseURL: process.env.B4_BASELINE ? "http://127.0.0.1:4176" : "http://127.0.0.1:4174", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce", trace: "off", screenshot: "only-on-failure", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: process.env.B4_BASELINE ? undefined : { command: "npx vite build --outDir dist-contract && npx vite preview --outDir dist-contract --host 127.0.0.1 --port 4174 --strictPort", env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" }, url: "http://127.0.0.1:4174", reuseExistingServer: true },
});
