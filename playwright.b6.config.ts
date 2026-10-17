import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: process.env.B6_BASELINE ? "b6-visual.spec.ts" : "b6*.spec.ts", workers: 2, retries: 0,
  snapshotPathTemplate: "{testDir}/../docs/evidence/b6/{arg}{ext}",
  outputDir: "work/test-results-b6", reporter: [["list"], ["json", { outputFile: "work/test-results-b6/results.json" }]],
  use: { baseURL: process.env.B6_BASELINE ? "http://127.0.0.1:4186" : "http://127.0.0.1:4185", isMobile: true, hasTouch: true, reducedMotion: "reduce", trace: "off", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: process.env.B6_BASELINE ? undefined : { command: "npx vite build --outDir work/b6-dist && npx vite preview --outDir work/b6-dist --host 127.0.0.1 --port 4185 --strictPort", env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false", VITE_TELEGRAM_BOT_URL: "https://t.me/DalexioTestBot?start=dexoairdrop" }, url: "http://127.0.0.1:4185", reuseExistingServer: false },
});
