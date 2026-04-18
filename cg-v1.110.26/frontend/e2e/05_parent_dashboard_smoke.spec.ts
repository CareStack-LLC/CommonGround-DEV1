/**
 * Spec 05 — Parent dashboard navigation smoke test
 *
 * Walks every top-level nav item on the parent dashboard and asserts:
 *   - the page responds (no 5xx from the backend on load)
 *   - the URL changes
 *   - the page isn't the generic error boundary
 *
 * This catches regressions where a route silently breaks after a schema
 * change or an env-var mismatch.
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

const NAV_PATHS = [
  "/dashboard",
  "/family-files",
  "/agreements",
  "/messages",
  "/kidcoms",
  "/my-circle",
  "/kids",
  "/cases",
  "/intake",
  "/payments",
  "/activities",
];

test("parent dashboard — all top-level nav routes load without 5xx", async ({
  browser,
}) => {
  const api = await playwrightRequest.newContext();
  const parent = await registerViaApi(api, {
    email: uniqueEmail("navParent"),
    firstName: "Nav",
    lastName: "Smoke",
  });

  // Seed one family so pages that require a family don't redirect to setup.
  await api.post(`${process.env.E2E_API_URL || "http://localhost:8000"}/api/v1/family-files/`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: { title: "Nav-smoke Family", state: "CA" },
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = watchForServerErrors(page, "navSmoke");

  await loginViaUi(page, parent.email);

  for (const path of NAV_PATHS) {
    await page.goto(path);
    // Accept any 2xx/3xx — we just want to catch 500s.
    await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "($|[?#])"), {
      timeout: 15_000,
    });
    // Rule out the global error boundary.
    await expect(
      page.getByText(/something went wrong|unexpected error|application error/i),
    ).toHaveCount(0);
  }

  await ctx.close();
  await api.dispose();

  expect(errs, `5xx responses during nav walk:\n${errs.join("\n")}`).toEqual([]);
});
