import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/post-b6*.spec.ts", "**/b4*.spec.ts", "**/b5*.spec.ts", "**/b6*.spec.ts"],
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  // Developer fixtures use Vite dev; authenticated tests use an actual release build.
  // Neither server proxies test traffic to the shared API.
  webServer: [
    {
      command: "npx vite --mode test-fixtures --host 127.0.0.1 --port 4173 --strictPort",
      env: { VITE_DATA_SOURCE: "local", VITE_ENABLE_DEV_PANEL: "false" },
      url: "http://127.0.0.1:4173", reuseExistingServer: false, timeout: 120_000,
    },
    {
      command: "npx vite build --outDir dist-contract && npx vite preview --outDir dist-contract --host 127.0.0.1 --port 4174",
      env: { VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" },
      url: "http://127.0.0.1:4174", reuseExistingServer: false, timeout: 120_000,
    },
  ],
  projects: [
    { name: "mobile-chrome", testIgnore: ["**/post-b6*.spec.ts", "**/b1.spec.ts", "**/b3-client.spec.ts", "**/b4*.spec.ts", "**/b5*.spec.ts", "**/b6*.spec.ts"], use: { ...devices["Pixel 7"] } },
    { name: "desktop-chrome", testIgnore: ["**/post-b6*.spec.ts", "**/b1.spec.ts", "**/b3-client.spec.ts", "**/b4*.spec.ts", "**/b5*.spec.ts", "**/b6*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "b1-mobile", testMatch: ["**/b1.spec.ts", "**/b3-client.spec.ts"], use: { ...devices["Pixel 7"], baseURL: "http://127.0.0.1:4174" } },
    { name: "b1-desktop", testMatch: ["**/b1.spec.ts", "**/b3-client.spec.ts"], use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4174" } },
  ],
});
