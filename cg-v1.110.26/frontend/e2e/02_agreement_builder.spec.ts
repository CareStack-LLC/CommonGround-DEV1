/**
 * Spec 02 — Agreement builder UI smoke
 *
 * Full dual-approve flow is validated by the backend E2E stage 04 (see
 * test_full_system_e2e.py). This UI spec just proves that after login, the
 * agreement-builder page renders for a user with a pre-seeded case +
 * agreement. Catches client-side bundle crashes and route regressions.
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  API_BASE,
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

test("agreement UI — builder renders after seeded agreement", async ({ page }) => {
  const errors = watchForServerErrors(page, "agr");

  const api = await playwrightRequest.newContext();
  const parent = await registerViaApi(api, {
    email: uniqueEmail("agrA"),
    firstName: "Parent",
    lastName: "Alpha",
  });

  // Seed a full case + agreement via API so the UI has something to show.
  const caseResp = await api.post(`${API_BASE}/api/v1/cases/`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: {
      case_name: `UI Agreement Case ${Date.now()}`,
      other_parent_email: uniqueEmail("agrB"),
      state: "CA",
      county: "San Francisco",
      children: [
        { first_name: "Emma", last_name: "Alpha", date_of_birth: "2016-05-14" },
      ],
    },
  });
  expect(caseResp.status(), `case: ${await caseResp.text()}`).toBeLessThan(300);
  const caseId = (await caseResp.json()).id;

  const agreementResp = await api.post(`${API_BASE}/api/v1/cases/${caseId}/agreement`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: { title: `UI Agreement ${Date.now()}` },
  });
  expect(agreementResp.status(), `agreement: ${await agreementResp.text()}`).toBeLessThan(
    300,
  );
  const agreementId = (await agreementResp.json()).id;
  await api.dispose();

  // Log in via UI + navigate to the agreement.
  await loginViaUi(page, parent.email);
  await page.goto(`/agreements/${agreementId}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(agreementId), { timeout: 20_000 });
  await expect(
    page.getByText(/something went wrong|unexpected error|application error/i),
  ).toHaveCount(0);

  expect(errors, errors.join("\n")).toEqual([]);
});
