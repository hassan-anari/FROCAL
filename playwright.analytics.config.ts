import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: "posthog-demo.browser.ts", workers: 2, retries: 0,
  outputDir: "work/test-results-analytics", reporter: [["list"], ["json", { outputFile: "work/analytics-browser-results.json" }]],
  use: { ...devices["Pixel 7"], deviceScaleFactor: 1, baseURL: "http://127.0.0.1:4190", reducedMotion: "reduce", trace: "off", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: {
    command: "npx vite build --outDir work/analytics-dist && npx vite preview --outDir work/analytics-dist --host 127.0.0.1 --port 4190 --strictPort",
    // Reserved test host/token only. Requests are intercepted, never sent to PostHog.
    env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_POSTHOG_ENABLED: "true", VITE_POSTHOG_REPLAY_ENABLED: "true", VITE_POSTHOG_KEY: "synthetic-browser-test", VITE_POSTHOG_HOST: "https://posthog.test" },
    url: "http://127.0.0.1:4190", reuseExistingServer: false, timeout: 120_000,
  },
});
