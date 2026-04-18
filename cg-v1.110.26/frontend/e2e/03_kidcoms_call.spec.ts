/**
 * Spec 03 — KidComs UI smoke
 *
 * Full KidComs session creation + Daily.co room assignment is validated by
 * the backend stage 08. This UI spec verifies the /kidcoms route loads for
 * a logged-in parent with a seeded circle contact, which catches client-
 * side crashes in the KidComs container and its room-list widgets.
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  API_BASE,
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

test("kidcoms UI — parent dashboard renders after circle contact seeded", async ({
  page,
}) => {
  const errors = watchForServerErrors(page, "kc");

  const api = await playwrightRequest.newContext();
  const parent = await registerViaApi(api, {
    email: uniqueEmail("kcP"),
    firstName: "Parent",
    lastName: "Kc",
  });

  const ff = await api.post(`${API_BASE}/api/v1/family-files/`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: { title: "KidComs UI Family", state: "CA" },
  });
  const familyFileId = (await ff.json()).id;
  const child = await api.post(`${API_BASE}/api/v1/family-files/${familyFileId}/children`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: { first_name: "Milo", last_name: "Kc", date_of_birth: "2015-08-02" },
  });
  expect(child.status()).toBeLessThan(300);

  // Provision the KidComs rooms so the UI doesn't 400 on first load.
  await api.get(`${API_BASE}/api/v1/my-circle/rooms/${familyFileId}`, {
    headers: { Authorization: `Bearer ${parent.token}` },
  });

  // Invite a circle contact so the UI has a row to render.
  await api.post(`${API_BASE}/api/v1/my-circle/circle-users/create-and-invite`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: {
      family_file_id: familyFileId,
      email: uniqueEmail("kcC"),
      contact_name: "Aunt Mae",
      relationship_type: "aunt",
    },
  });
  await api.dispose();

  await loginViaUi(page, parent.email);
  await page.goto("/kidcoms", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/kidcoms/, { timeout: 20_000 });
  await expect(
    page.getByText(/something went wrong|unexpected error|application error/i),
  ).toHaveCount(0);

  expect(errors, errors.join("\n")).toEqual([]);
});
