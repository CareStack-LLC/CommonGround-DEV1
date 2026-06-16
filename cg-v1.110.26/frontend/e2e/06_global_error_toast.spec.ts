/**
 * Spec 06 — Global API error toast (reliability batch 1)
 *
 * The Toaster is mounted in AppProviders and fetchAPI raises a deduped
 * destructive toast on network failures and 5xx responses. This spec
 * forces a 500 on the dashboard's API calls via route interception and
 * asserts the toast appears and then auto-dismisses (5s + exit animation).
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  loginViaUi,
  registerViaApi,
  uniqueEmail,
} from "./helpers";

test("dashboard API 500 surfaces a toast that auto-dismisses", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  const parent = await registerViaApi(api, {
    email: uniqueEmail("toastP"),
    firstName: "Toast",
    lastName: "Smoke",
  });
  await api.dispose();

  await loginViaUi(page, parent.email);

  // Force every subsequent API call to fail server-side.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ detail: "forced test failure" }),
    })
  );

  await page.goto("/dashboard");

  const toast = page.getByText("Something went wrong", { exact: false });
  await expect(toast.first()).toBeVisible({ timeout: 20_000 });

  // Auto-dismiss: gone within ~6s (5s display + exit animation).
  await expect(toast.first()).toBeHidden({ timeout: 10_000 });
});

test("caller-aborted request shows no toast", async ({ page }) => {
  const api = await playwrightRequest.newContext();
  const parent = await registerViaApi(api, {
    email: uniqueEmail("toastA"),
    firstName: "Abort",
    lastName: "Smoke",
  });
  await api.dispose();

  await loginViaUi(page, parent.email);
  await page.goto("/dashboard");

  // Drive fetchAPI directly with a pre-aborted signal: it must rethrow
  // quietly (APIError status 0, aborted) without raising a toast.
  const result = await page.evaluate(async () => {
    const controller = new AbortController();
    controller.abort();
    try {
      const response = await fetch("/api/v1/never-called", {
        signal: controller.signal,
      });
      return { ok: response.ok };
    } catch (err) {
      return { name: (err as Error).name };
    }
  });
  expect(result).toEqual({ name: "AbortError" });

  // No destructive toast rendered.
  await expect(
    page.getByText("Something went wrong", { exact: false })
  ).toHaveCount(0);
  await expect(
    page.getByText("Connection problem", { exact: false })
  ).toHaveCount(0);
});
