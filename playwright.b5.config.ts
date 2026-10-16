import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: "b5*.spec.ts", workers: 2, retries: 0,
  snapshotPathTemplate: "{testDir}/../docs/evidence/b5/{arg}{ext}",
  outputDir: "work/test-results-b5", reporter: [["list"], ["json", { outputFile: "work/test-results-b5/results.json" }]],
  use: { baseURL: process.env.B5_BASELINE ? "http://127.0.0.1:4176" : "http://127.0.0.1:4175", isMobile: true, hasTouch: true, reducedMotion: "reduce", trace: "off", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: process.env.B5_BASELINE ? undefined : { command: "npx vite build --outDir work/b5-dist && npx vite preview --outDir work/b5-dist --host 127.0.0.1 --port 4175 --strictPort", env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" }, url: "http://127.0.0.1:4175", reuseExistingServer: false },
});
