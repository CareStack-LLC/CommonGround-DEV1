/**
 * Spec 04 — Professional portal UI smoke
 *
 * Full intake-session creation flow is validated by the backend stage 11.
 * This UI spec confirms a logged-in professional lands on the portal
 * dashboard without a client-side crash.
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

test("professional portal UI — dashboard renders", async ({ page }) => {
  const errors = watchForServerErrors(page, "pro");

  const api = await playwrightRequest.newContext();
  const pro = await registerViaApi(api, {
    email: uniqueEmail("proUi"),
    firstName: "Pat",
    lastName: "Pro",
    userType: "professional",
  });
  await api.dispose();

  await loginViaUi(page, pro.email);

  // Professional users get routed to /professional/dashboard after login.
  await page.goto("/professional/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/professional/, { timeout: 20_000 });
  await expect(
    page.getByText(/something went wrong|unexpected error|application error/i),
  ).toHaveCount(0);

  // Navigate to intake — one of the headline features.
  await page.goto("/professional/intake", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/professional\/intake/, { timeout: 20_000 });
  await expect(
    page.getByText(/something went wrong|unexpected error|application error/i),
  ).toHaveCount(0);

  expect(errors, errors.join("\n")).toEqual([]);
});
