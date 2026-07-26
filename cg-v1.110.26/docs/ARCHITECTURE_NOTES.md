# Architecture & Security Notes

The "read this before you change auth, errors, rate limiting, or deploys" doc.
Captures the non-obvious parts of the system and the invariants that keep it
secure. Each section points at the code that owns the behaviour.

> Deploy targets are **`api.find-commonground.com`** (backend → Render, us-east)
> and **`www.find-commonground.com`** (frontend → Vercel). Both auto-deploy on
> push to `main`. The old `commonground-api-a0fr.onrender.com` host is retired
> (returns 503) — do not point anything at it.

---

## Authentication & sessions

Tokens are our own HS256 JWTs (minted after Supabase auth). Two rules keep them
out of XSS reach:

- **Access token → in memory only.** Held in a module variable in
  `frontend/lib/api.ts` (`getAccessToken()` / `setAuthTokens()`). Never in
  `localStorage` (which any XSS can read and which survives reloads).
- **Refresh token → HttpOnly cookie** `cg_refresh`, set by the backend
  (`backend/app/core/auth_cookies.py`). JS can never read it.

Flow:
1. `login` / `register` / `oauth-sync` return the access token in the body
   (→ memory) and set the `cg_refresh` cookie.
2. On a full reload the in-memory token is gone, so `AuthProvider`
   (`frontend/lib/auth-context.tsx`) **bootstraps**: if a cached `user` exists it
   calls `/auth/refresh` (which reads the cookie) to mint a fresh access token
   before hitting authenticated endpoints. The 401 interceptor in `api.ts` also
   refreshes on demand.
3. `logout` clears the in-memory token, the cached user, and the cookie.

Cookie attributes (`auth_cookies.py`): `HttpOnly; Secure; SameSite=Lax;
Path=/api/v1/auth`, host-only. **Why Lax works cross-subdomain:** `www` and `api`
are the *same registrable site* (`find-commonground.com`), so a Lax cookie is
sent on the frontend's fetches to the API — which also keeps CSRF tight (no
`SameSite=None`). The API itself is Bearer-header auth, so it stays CSRF-immune;
only `/auth/refresh` consumes the cookie and its response isn't cross-origin
readable. `COOKIE_DOMAIN` exists in config if a true cross-*site* setup is ever
needed.

Backend auth: `get_current_user` (`backend/app/core/security.py`) validates the
Bearer JWT (PyJWT, HS256, verifies `exp`/`type`). JWTs are signed with PyJWT, not
python-jose (dropped to remove the no-fix `ecdsa` Minerva CVE).

**Not yet migrated:** the kids' `child_token` / `circle_token` device-login flow
still uses `localStorage` — separate, more complex flow, tracked as follow-up.

**Superadmin impersonation** (`superadmin/users` + `components/impersonation-banner.tsx`)
swaps the in-memory token; only the admin's *original* token + a session id sit
in `localStorage` while an impersonation is active.

---

## Error handling — every error is traceable

Unified envelope so no error is a mystery (`backend/app/core/error_responses.py`
+ the handlers in `main.py`): every error response carries
`error.reference` — the **same id** on the `X-Request-ID` header, the Sentry
event tag, and the canonical request log line. So a user-facing failure is always
joinable to full server-side detail.

- Uncaught 500s hide internals in prod but always return a quotable `reference`.
- `RequestValidationError` → clean per-field list + readable summary.
- `HTTPException` → author message preserved.
- All set CORS headers themselves (uncaught exceptions bypass the CORS middleware).

Frontend: `APIError.reference/.errorType/.fields` (`lib/api.ts`); the 5xx toast
shows the reference (`lib/api-error-notify.ts`).

---

## Rate limiting (`backend/app/core/rate_limit.py`)

- Defaults to the **in-memory** limiter (`RATE_LIMIT_USE_REDIS=false`). On a
  single instance it's equivalent to the Redis limiter but burns **zero** Redis
  commands (the Redis path is ~4 commands/request — the main driver that
  exhausted the Upstash quota). Flip the flag on ONLY when running multiple
  instances.
- Fail policy on a Redis error: **fail CLOSED** for `auth`/`payment` categories
  (brute-force protection beats availability there), fail open for general
  traffic.

---

## Redis (Upstash free tier) — degrades, never crashes

`backend/app/core/redis_client.py`. Everything that uses Redis **fails open**:
if Redis is down, `get_redis()` returns `None` and callers must handle it
(JWT-blacklist check, rate limiter, distributed locks, AI-usage tracking,
websocket pub/sub all degrade gracefully — no outage).

Gotchas:
- `get_redis()` **latches** `_initialized=True` on first failure and won't retry
  until process restart. But `/health` does a fresh live ping, so health reflects
  real-time status.
- Upstash free tier has a **500K-command cap**. When exhausted it rejects *every*
  command (incl. PING) → `/health` shows `degraded` and the security fail-opens
  (token revocation, child-PIN lockout) silently disable. `/health` alerts this
  to Sentry (throttled) and caches its result 15s so monitor polls don't burn the
  quota.

---

## Multi-tenant authorization — the invariant

Users may only see data for family files they are a parent of. Endpoints that
take a `family_file_id` MUST verify membership (`current_user.id in
(parent_a_id, parent_b_id)`), never trust an optional client-supplied id.

- Reference helper: `analytics.py::_authorized_family_file_ids()` — scopes to the
  caller's families, 403 on a non-owned id. Use it for any new analytics endpoint.
  (This closed a CRITICAL IDOR where `/analytics/aria-interventions` returned
  every family's raw flagged-message content.)
- Debug/test routes must be gated: `@router.get(..., dependencies=[Depends(block_in_production)])`
  (`security.block_in_production`) — returns 404 in prod.
- Webhooks fail CLOSED on missing/invalid signature in prod (Stripe, SendGrid,
  Daily, Mux).

---

## Design tokens & dark mode (`frontend/app/globals.css`)

Colors go through semantic tokens (Tailwind v4 `@theme` → `--color-*` → `:root`
light / `.dark` dark). **Never hardcode a brand hex** — use the token class
(`text-cg-sage`, `bg-cg-error`, `text-foreground`, …) or `var(--token)` in inline
styles, so the color flips correctly in dark mode. ~91% of hex is tokenized; the
remainder are legit one-offs (chart/data-viz palettes). Public marketing/auth/
`/brand` pages are intentionally **light-locked**; dark mode is the authenticated
app only.

---

## Known gotchas (will bite you)

- **Naive-UTC convention** backend-wide: store/compare `datetime.utcnow()`
  (naive). Don't mix tz-aware datetimes into comparisons.
- **Stripe SDK blocks the event loop** — never call `stripe.*` directly in an
  `async def`; use `stripe_service` / wrap in `asyncio.to_thread`. Same for the
  sync Anthropic/OpenAI SDKs.
- **Module-docstring-swallowed imports**: an `import` placed right after a
  triple-quoted string that isn't the module docstring becomes part of the string
  → `NameError`/500 at runtime, not at import. Keep the docstring first.
- **Alembic vs actual schema drift**: some prod revisions are stamped applied
  without their DDL landing. When a model column 500s, add an idempotent
  `ADD COLUMN IF NOT EXISTS` heal migration at head rather than trusting the
  version stamp.
- **Anthropic model IDs**: use current IDs (`claude-sonnet-4-5`,
  `claude-haiku-4-5`) — retired IDs 404 in prod.
- **Render env change ≠ live**: updating an env var + `/restart` reuses the old
  deploy's env. POST a new `/deploys` to actually load it.
- **Local `next dev` Turbopack-panics** and **`next start` crashes** on this
  machine (pre-existing/environmental) — verify the frontend via `next build`
  and the deployed site, not a local server.
- **Frontend CI** runs on pnpm (not npm). Deploys are owned by Vercel's Git
  integration; the GitHub Actions workflow only validates the build.
