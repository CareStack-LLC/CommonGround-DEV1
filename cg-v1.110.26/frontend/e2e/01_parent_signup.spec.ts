/**
 * Spec 01 — Parent signup → first family file → first child
 *
 * Highest-risk happy path: if this is broken, no other parent surface
 * matters. Drives the UI start-to-finish rather than seeding via API so
 * we catch form-validation / routing / auth-cookie issues.
 */
import { test, expect } from "@playwright/test";
import { uniqueEmail, TEST_PASSWORD, watchForServerErrors } from "./helpers";

test("parent signup, create family file, add child", async ({ page }) => {
  const serverErrors = watchForServerErrors(page, "signup");

  const email = uniqueEmail("signup");
  const firstName = "Parent";
  const lastName = "Alpha";

  // 1. Register form.
  await page.goto("/register");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(TEST_PASSWORD);
  // Some forms have a confirm-password field.
  const confirm = page.getByLabel(/confirm password/i);
  if (await confirm.count()) await confirm.fill(TEST_PASSWORD);
  const first = page.getByLabel(/first name/i);
  if (await first.count()) await first.fill(firstName);
  const last = page.getByLabel(/last name/i);
  if (await last.count()) await last.fill(lastName);
  await page.getByRole("button", { name: /create account|sign up|register/i }).click();

  // 2. Assert redirect to dashboard or family-files setup.
  await expect(page).toHaveURL(/dashboard|family-files|welcome/i, {
    timeout: 15_000,
  });

  // 3. Navigate to the "create family file" flow. The entry point varies
  // between deploys — accept either a sidebar link or a dashboard CTA.
  const createCta = page
    .getByRole("link", { name: /create.*family|new family file/i })
    .or(page.getByRole("button", { name: /create.*family|new family file/i }));
  if (await createCta.count()) await createCta.first().click();
  else await page.goto("/family-files/new");

  // 4. Fill the family-file wizard. Selectors are best-effort — adjust
  // when you see real copy.
  const title = page.getByLabel(/title|family name|case name/i).first();
  if (await title.count()) await title.fill(`Alpha Family UI ${Date.now()}`);
  const state = page.getByLabel(/state/i).first();
  if (await state.count()) await state.selectOption({ label: "California" }).catch(() => {
    /* state field may be a text input */
  });
  await page.getByRole("button", { name: /create|save|continue/i }).click();

  // 5. Assert family file page loaded.
  await expect(page).toHaveURL(/family-files/, { timeout: 15_000 });

  // 6. Add a child.
  const addChild = page.getByRole("button", { name: /add child|new child/i });
  if (await addChild.count()) {
    await addChild.first().click();
    await page.getByLabel(/first name/i).fill("Emma");
    await page.getByLabel(/last name/i).fill("Alpha");
    const dob = page.getByLabel(/date of birth|birthday/i);
    if (await dob.count()) await dob.fill("2016-05-14");
    await page.getByRole("button", { name: /save|add|create/i }).click();
    await expect(page.getByText(/emma/i)).toBeVisible({ timeout: 10_000 });
  }

  expect(serverErrors, serverErrors.join("\n")).toEqual([]);
});
