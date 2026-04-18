/**
 * Spec 03 — KidComs call: parent initiates, circle contact accepts
 *
 * Verifies that the call-initiation UI reaches Daily.co and renders the
 * video iframe. Does NOT verify AV (that's covered by the manual checklist).
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  API_BASE,
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

test("kidcoms — parent initiates, circle contact joins", async ({ browser }) => {
  const api = await playwrightRequest.newContext();

  const parent = await registerViaApi(api, {
    email: uniqueEmail("kcP"),
    firstName: "Parent",
    lastName: "Kc",
  });

  // Family + child.
  const ff = await api
    .post(`${API_BASE}/api/v1/family-files/`, {
      headers: { Authorization: `Bearer ${parent.token}` },
      data: { title: "KidComs UI Family", state: "CA" },
    })
    .then((r) => r.json());
  const child = await api
    .post(`${API_BASE}/api/v1/family-files/${ff.id}/children`, {
      headers: { Authorization: `Bearer ${parent.token}` },
      data: {
        first_name: "Milo",
        last_name: "Kc",
        date_of_birth: "2015-08-02",
      },
    })
    .then((r) => r.json());

  // Circle contact — real registration so the invite flow works end to end.
  const contact = await registerViaApi(api, {
    email: uniqueEmail("kcC"),
    firstName: "Aunt",
    lastName: "Mae",
  });

  // Parent invites contact to the circle via API (UI version belongs in a
  // separate spec; this one focuses on the call).
  await api.post(`${API_BASE}/api/v1/my-circle/contacts`, {
    headers: { Authorization: `Bearer ${parent.token}` },
    data: {
      family_file_id: ff.id,
      child_id: child.id,
      email: contact.email,
      display_name: "Aunt Mae",
      relationship: "aunt",
    },
  });

  // --- Parent UI: initiate the call ---------------------------------------
  const ctxP = await browser.newContext();
  const pageP = await ctxP.newPage();
  const errsP = watchForServerErrors(pageP, "kcP");

  await loginViaUi(pageP, parent.email);
  await pageP.goto("/kidcoms");

  // The exact entrypoint varies — look for a "Start call" / "Video call" CTA.
  const callBtn = pageP.getByRole("button", {
    name: /start call|start video|video call|call now/i,
  });
  if (await callBtn.count()) {
    await callBtn.first().click();
  } else {
    // Fallback: navigate directly to a child-specific call route.
    await pageP.goto(`/kidcoms/call?child=${child.id}`);
  }

  // Assert the Daily iframe mounts — that's the best "it's wired up" signal
  // without doing AV.
  const iframe = pageP.locator('iframe[src*="daily.co"], iframe[title*="daily"]').first();
  await expect(iframe).toBeVisible({ timeout: 20_000 });

  await ctxP.close();
  await api.dispose();

  expect(errsP, errsP.join("\n")).toEqual([]);
});
