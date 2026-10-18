import { defineConfig } from "@playwright/test";
const before = Boolean(process.env.POST_B6_BASELINE);
export default defineConfig({
  testDir: "./e2e", testMatch: before ? "post-b6-visual.spec.ts" : "post-b6*.spec.ts", workers: 2, retries: 0,
  snapshotPathTemplate: "{testDir}/../docs/evidence/post-b6/{arg}{ext}", outputDir: "work/test-results-post-b6",
  reporter: [["list"], ["json", { outputFile: `work/post-b6-${before ? "before" : "after"}-results.json` }]],
  use: { baseURL: "http://127.0.0.1:4188", isMobile: true, hasTouch: true, reducedMotion: "reduce", trace: "off", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: {
    command: before ? "node node_modules/vite/bin/vite.js build work/post-b6-main --outDir ../post-b6-before-dist && node node_modules/vite/bin/vite.js preview --outDir work/post-b6-before-dist --host 127.0.0.1 --port 4188 --strictPort" : "npx vite build --outDir work/post-b6-dist && npx vite preview --outDir work/post-b6-dist --host 127.0.0.1 --port 4188 --strictPort",
    env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false", VITE_TELEGRAM_BOT_URL: "https://t.me/DalexioTestBot?start=dexoairdrop" }, url: "http://127.0.0.1:4188", reuseExistingServer: false, timeout: 120_000,
  },
});
