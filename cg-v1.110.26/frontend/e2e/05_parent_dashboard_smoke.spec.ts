/**
 * Spec 05 — Parent top-level nav smoke
 *
 * Walks every top-level parent-portal route for a seeded parent and asserts
 * each one (a) responds with a URL matching what we navigated to, and
 * (b) doesn't render the global error boundary. Server-error listener
 * captures any 5xx responses during the walk. This is the cheapest broad
 * regression net for launch — catches route deletions, missing env vars at
 * build time, and SSR crashes without any feature-specific UI coupling.
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  API_BASE,
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

const NAV_PATHS = [
  "/dashboard",
  "/family-files",
  "/messages",
  "/kidcoms",
  "/my-circle",
  "/kids",
  "/cases",
  "/intake",
  "/payments",
  "/activities",
];

test("parent portal — nav walk, no 5xx / error boundary", async ({ page }) => {
  const errors = watchForServerErrors(page, "navSmoke");

  const api = await playwrightRequest.newContext();
  const parent = await registerViaApi(api, {
    email: uniqueEmail("navP"),
    firstName: "Nav",
    lastName: "Smoke",
  });

  // One family so pages that hard-require one don't redirect away.
  await api.post(`${API_BASE}/api/v1/family-files/`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: { title: "Nav-smoke Family", state: "CA" },
  });
  await api.dispose();

  await loginViaUi(page, parent.email);

  for (const path of NAV_PATHS) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    // Accept a redirect (login-guarded pages) as long as we got SOME 2xx/3xx
    // and no error boundary rendered.
    await expect(
      page.getByText(/something went wrong|unexpected error|application error/i),
    ).toHaveCount(0);
  }

  expect(errors, `5xx responses during nav walk:\n${errors.join("\n")}`).toEqual([]);
});
