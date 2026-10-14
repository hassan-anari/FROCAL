import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
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
  // Separate bundles ensure demo and authenticated production paths both get exercised.
  // These previews never proxy to production; B1 requests are intercepted by fixtures.
  webServer: [
    {
      command: "npx vite build --outDir dist-demo && npx vite preview --outDir dist-demo --host 127.0.0.1 --port 4173",
      env: { VITE_DATA_SOURCE: "local" },
      url: "http://127.0.0.1:4173", reuseExistingServer: false, timeout: 120_000,
    },
    {
      command: "npx vite build --outDir dist-contract && npx vite preview --outDir dist-contract --host 127.0.0.1 --port 4174",
      env: { VITE_DATA_SOURCE: "remote" },
      url: "http://127.0.0.1:4174", reuseExistingServer: false, timeout: 120_000,
    },
  ],
  projects: [
    { name: "mobile-chrome", testIgnore: "**/b1.spec.ts", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chrome", testIgnore: "**/b1.spec.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "b1-mobile", testMatch: "**/b1.spec.ts", use: { ...devices["Pixel 7"], baseURL: "http://127.0.0.1:4174" } },
    { name: "b1-desktop", testMatch: "**/b1.spec.ts", use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4174" } },
  ],
});
