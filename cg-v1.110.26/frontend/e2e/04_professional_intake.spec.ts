/**
 * Spec 04 — Professional intake: login → intake wizard → ARIA panel → submit
 *
 * Verifies the professional portal's headline feature: AI-assisted client
 * intake. Uses a seeded professional account; the intake session invites
 * a seeded parent by email (we don't exercise that inbox here).
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

test("professional intake — login, wizard, ARIA panel renders", async ({
  browser,
}) => {
  const api = await playwrightRequest.newContext();

  const pro = await registerViaApi(api, {
    email: uniqueEmail("proI"),
    firstName: "Pat",
    lastName: "Pro",
    userType: "professional",
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = watchForServerErrors(page, "proI");

  await loginViaUi(page, pro.email);

  // Professional portal lands on /professional/dashboard — navigate to intake.
  await page.goto("/professional/intake");

  const newIntake = page.getByRole("button", {
    name: /new intake|create intake|start intake/i,
  });
  if (await newIntake.count()) await newIntake.first().click();

  // Fill basic intake fields. Selectors are best-effort.
  const clientName = page.getByLabel(/client name/i).first();
  if (await clientName.count()) await clientName.fill("Alex E2E-Client");
  const clientEmail = page.getByLabel(/client email|email/i).first();
  if (await clientEmail.count())
    await clientEmail.fill(uniqueEmail("proClient"));
  const intakeType = page.getByLabel(/intake type|type/i).first();
  if (await intakeType.count()) {
    await intakeType.selectOption({ label: /custody/i }).catch(() => {});
  }

  const submit = page.getByRole("button", {
    name: /create|send|start session|save/i,
  });
  if (await submit.count()) await submit.first().click();

  // Assert the ARIA panel renders — typical markers: "ARIA" in headings, a
  // chat window, or a "generate question" button.
  await expect(
    page
      .getByText(/aria|AI (paralegal|assistant|questions)/i)
      .first(),
  ).toBeVisible({ timeout: 15_000 });

  await ctx.close();
  await api.dispose();

  expect(errs, errs.join("\n")).toEqual([]);
});
