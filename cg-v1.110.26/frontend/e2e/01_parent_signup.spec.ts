/**
 * Spec 01 — Parent account smoke: login via UI + dashboard renders
 *
 * The signup flow is a multi-step wizard (account → subscription → etc)
 * that belongs in manual QA. This spec instead seeds a parent via the real
 * /auth/register API (same path the UI uses internally), walks the login
 * form, and asserts the authenticated dashboard + family file pages render
 * without 5xx. That catches the broadest class of regression — missing
 * routes, broken auth cookies, SSR crashes — with minimal UI coupling.
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  API_BASE,
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

test("parent login + dashboard smoke", async ({ page }) => {
  const errors = watchForServerErrors(page, "parent-smoke");

  // Seed a parent + family + child via the API — same endpoints the
  // signup-wizard UI eventually calls.
  const api = await playwrightRequest.newContext();
  const parent = await registerViaApi(api, {
    email: uniqueEmail("signup"),
    firstName: "Parent",
    lastName: "Smoke",
  });

  const ff = await api.post(`${API_BASE}/api/v1/family-files/`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: { title: `UI Smoke Family ${Date.now()}`, state: "CA" },
  });
  expect(ff.status(), `family-file create: ${await ff.text()}`).toBeLessThan(300);
  const familyFileId = (await ff.json()).id;

  await api.post(`${API_BASE}/api/v1/family-files/${familyFileId}/children`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: {
      first_name: "Emma",
      last_name: "Smoke",
      date_of_birth: "2016-05-14",
    },
  });
  await api.dispose();

  // Login via the UI form — catches broken auth cookie / redirect logic.
  await loginViaUi(page, parent.email);

  // Dashboard must load cleanly. Use `domcontentloaded` so we don't wait
  // for late analytics pings.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
  await expect(
    page.getByText(/something went wrong|unexpected error|application error/i),
  ).toHaveCount(0);

  // Family file detail must load cleanly.
  await page.goto(`/family-files/${familyFileId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(new RegExp(familyFileId), { timeout: 15_000 });
  await expect(
    page.getByText(/something went wrong|unexpected error|application error/i),
  ).toHaveCount(0);

  expect(errors, errors.join("\n")).toEqual([]);
});
