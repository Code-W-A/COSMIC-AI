import { defineConfig, devices } from "@playwright/test"

import { E2E_ENV, loadE2EEnv } from "./e2e/env"

// Make the E2E env available to the Playwright runner process (used by the
// global setup that seeds the Firebase emulator).
loadE2EEnv()

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  // Tests share a single seeded emulator dataset, so run them serially and in a
  // deterministic order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: E2E_ENV,
  },
})
