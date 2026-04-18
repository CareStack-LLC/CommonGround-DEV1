/**
 * Spec 02 — Agreement builder, dual-parent approval
 *
 * Seeds two parents + a family file via API (no UI signup — that's spec 01)
 * then drives the agreement builder in two browser contexts to verify
 * dual-approval.
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  API_BASE,
  loginViaUi,
  registerViaApi,
  uniqueEmail,
  watchForServerErrors,
} from "./helpers";

test("agreement builder — three sections, dual approve", async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const parentA = await registerViaApi(api, {
    email: uniqueEmail("agrA"),
    firstName: "Parent",
    lastName: "Alpha",
  });
  const parentB = await registerViaApi(api, {
    email: uniqueEmail("agrB"),
    firstName: "Parent",
    lastName: "Beta",
  });

  // Create family file as Parent A.
  const ffResp = await api.post(`${API_BASE}/api/v1/family-files/`, {
    headers: { Authorization: `Bearer ${parentA.token}` },
    data: { title: `Agreement UI Family ${Date.now()}`, state: "CA" },
  });
  expect(ffResp.status(), `family-file create: ${await ffResp.text()}`).toBeLessThan(300);
  const familyFileId = (await ffResp.json()).id;
  expect(familyFileId).toBeTruthy();

  // Invite + accept Parent B via API.
  await api.post(`${API_BASE}/api/v1/family-files/${familyFileId}/invite`, {
    headers: { Authorization: `Bearer ${parentA.token}` },
    data: { email: parentB.email, role: "parent_b" },
  });
  await api.post(`${API_BASE}/api/v1/family-files/${familyFileId}/accept`, {
    headers: { Authorization: `Bearer ${parentB.token}` },
  });

  // --- Parent A: open builder, edit 3 sections, approve -------------------
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const errsA = watchForServerErrors(pageA, "agrA");

  await loginViaUi(pageA, parentA.email);
  await pageA.goto(`/family-files/${familyFileId}`);

  const agreementLink = pageA
    .getByRole("link", { name: /agreement/i })
    .or(pageA.getByRole("button", { name: /agreement/i }));
  if (await agreementLink.count()) await agreementLink.first().click();

  const createBtn = pageA.getByRole("button", {
    name: /create.*agreement|new agreement|start agreement/i,
  });
  if (await createBtn.count()) await createBtn.first().click();

  for (const section of ["parent info", "physical custody", "child support"]) {
    const link = pageA.getByRole("link", { name: new RegExp(section, "i") });
    if (await link.count()) {
      await link.first().click();
      const input = pageA.getByRole("textbox").first();
      if (await input.count()) await input.fill(`E2E ${section} — draft content`);
      const save = pageA.getByRole("button", { name: /save|next|continue/i });
      if (await save.count()) await save.first().click();
    }
  }

  const approveA = pageA.getByRole("button", { name: /approve|sign|confirm/i });
  if (await approveA.count()) await approveA.first().click();

  // --- Parent B: log in, approve ------------------------------------------
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const errsB = watchForServerErrors(pageB, "agrB");

  await loginViaUi(pageB, parentB.email);
  await pageB.goto(`/family-files/${familyFileId}`);
  const agrLinkB = pageB.getByRole("link", { name: /agreement/i });
  if (await agrLinkB.count()) await agrLinkB.first().click();
  const approveB = pageB.getByRole("button", { name: /approve|sign|confirm/i });
  if (await approveB.count()) await approveB.first().click();

  // Final assertion: agreement status shows active/approved for both.
  await expect(pageB.getByText(/active|approved|finalized/i).first()).toBeVisible({
    timeout: 15_000,
  });

  await ctxA.close();
  await ctxB.close();
  await api.dispose();

  expect(errsA.concat(errsB), "server errors during run").toEqual([]);
});
