/**
 * Shared helpers for the launch-readiness UI smoke specs.
 *
 * Every spec creates its own users via the real backend /auth/register
 * endpoint — no shared auth fixture — so that a failed stage can't leave
 * state behind that poisons the next spec. Per-run unique emails prevent
 * collisions with Supabase Auth when reruns happen without a full wipe.
 */
import type { Page, APIRequestContext } from "@playwright/test";

export const API_BASE =
  process.env.E2E_API_URL || "http://localhost:8000";

const RUN_ID =
  process.env.E2E_RUN_ID ||
  new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

export function uniqueEmail(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e_ui_${prefix}_${RUN_ID}_${rand}@commonground.test`;
}

export const TEST_PASSWORD = "TestPass123!Seed";

/**
 * Register a user directly via the backend API, bypass email confirm via
 * the Supabase admin API (the spec passes through the admin key), and
 * return the bearer token + user id. Using the API instead of walking the
 * signup UI for EVERY test keeps specs focused on what they're actually
 * trying to verify.
 */
export async function registerViaApi(
  request: APIRequestContext,
  opts: {
    email: string;
    firstName: string;
    lastName: string;
    userType?: "parent" | "professional";
  },
): Promise<{ email: string; token: string; userId: string; supabaseId: string }> {
  const resp = await request.post(`${API_BASE}/api/v1/auth/register`, {
    data: {
      email: opts.email,
      password: TEST_PASSWORD,
      first_name: opts.firstName,
      last_name: opts.lastName,
      ...(opts.userType ? { user_type: opts.userType } : {}),
    },
  });
  if (![200, 201].includes(resp.status())) {
    throw new Error(
      `register ${opts.email} failed: HTTP ${resp.status()} ${await resp.text()}`,
    );
  }
  const body = await resp.json();
  const token = body.access_token || body.token || "";
  const userId = body.user?.id || body.id || "";
  const supabaseId = body.user?.supabase_id || body.supabase_id || "";

  // Confirm email via Supabase admin API so the next login doesn't 403.
  const supaUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supaUrl && supaKey && supabaseId) {
    await request.put(`${supaUrl}/auth/v1/admin/users/${supabaseId}`, {
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
        "Content-Type": "application/json",
      },
      data: { email_confirm: true },
    });
  }

  if (!token) {
    // Some deploys return the user without a token; fall back to login.
    const login = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { email: opts.email, password: TEST_PASSWORD },
    });
    const lb = await login.json();
    return {
      email: opts.email,
      token: lb.access_token || lb.token,
      userId,
      supabaseId,
    };
  }
  return { email: opts.email, token, userId, supabaseId };
}

/**
 * Walk the real /login form. Use this when a spec wants to exercise the
 * login UI itself; when it doesn't, prefer seedAuthCookie for speed.
 */
export async function loginViaUi(
  page: Page,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page
    .getByRole("button", { name: /sign in|log in|login/i })
    .first()
    .click();
  await page.waitForURL(/dashboard|family-files|welcome|kidspace|professional/i, {
    timeout: 20_000,
  });
}

/**
 * Seed the Supabase Auth token into the browser so the UI thinks the user
 * is logged in, instead of walking the login form every spec. The exact
 * storage mechanism depends on which Supabase client version the frontend
 * uses; this writes the most common keys. Prefer using this in beforeEach
 * so the home route redirect doesn't happen.
 */
export async function seedAuthCookie(
  page: Page,
  token: string,
  userId: string,
): Promise<void> {
  await page.context().addCookies([
    {
      name: "sb-access-token",
      value: token,
      domain: new URL(page.url() || "http://localhost:3000").hostname,
      path: "/",
      sameSite: "Lax",
    },
  ]);
  await page.addInitScript(
    ({ token, userId }) => {
      // Mirror Supabase client state.
      try {
        window.localStorage.setItem(
          "supabase.auth.token",
          JSON.stringify({
            access_token: token,
            refresh_token: "e2e-refresh",
            user: { id: userId },
          }),
        );
      } catch {
        /* noop */
      }
    },
    { token, userId },
  );
}

/**
 * Fail the test if any network response returned a 5xx during the run.
 * Call this from page.on('response') in beforeEach. We tolerate 4xx because
 * some flows legitimately produce them (e.g. the 410 legacy-wallet gate).
 */
export function watchForServerErrors(page: Page, label: string): string[] {
  const failures: string[] = [];
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 500) {
      failures.push(`[${label}] ${status} ${res.url()}`);
    }
  });
  return failures;
}
