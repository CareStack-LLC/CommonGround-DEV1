/**
 * Playwright config for the launch-readiness UI smoke suite.
 *
 * Scope: 5 specs covering the highest-risk parent / circle / professional
 * flows. Backend must already be running and Phase-0 preflight must have
 * wiped the DB. Individual specs create their own test users via the real
 * /auth/register flow; there's no shared login state.
 *
 * Install (one-time, on the test operator's machine):
 *   cd frontend
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   cd frontend
 *   E2E_BASE_URL=http://localhost:3000 \
 *   E2E_API_URL=http://localhost:8000 \
 *   npx playwright test --reporter=html
 */
import { defineConfig, devices } from "@playwright/test";

const E2E_BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // orchestrated specs share DB state; keep serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Don't ignore HTTPS errors — real prod has proper certs.
    ignoreHTTPSErrors: false,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Optional: bring up the Next dev server automatically if E2E_MANAGED_SERVER
  // is set. Default expects the operator to have `npm run dev` running so
  // specs don't wait for a cold start.
  webServer: process.env.E2E_MANAGED_SERVER
    ? {
        command: "npm run dev",
        url: E2E_BASE_URL,
        timeout: 120_000,
        reuseExistingServer: true,
      }
    : undefined,
});
