# Cutover Runbook — move prod API to us-east (Virginia)

**Why:** the us-east service is 6-10× faster (co-located with Supabase us-east-1).
Both services share the same database, so this is a routing cutover, not a data
migration — fully reversible by pointing back at Oregon.

- **New (fast):** `https://commonground-api-east.onrender.com` — `srv-d93c49btqb8s73blgtf0`, Virginia
- **Old (current prod):** `https://commonground-api-a0fr.onrender.com` — `srv-d6kithtm5p6s73ds40l0`, Oregon

## Recommended: add a custom domain first (one-time, future-proof)
Point everything at a stable domain you control so future moves need no external
changes:
1. Render → `commonground-api-east` → Settings → Custom Domains → add
   `api.find-commonground.com`.
2. Add the CNAME it gives you at your DNS provider for `find-commonground.com`.
3. Use `https://api.find-commonground.com` everywhere in the steps below instead
   of the raw east URL. (If you skip this, use the east URL — but you'll repeat
   this dance on the next move.)

## Everything pointing at the OLD Oregon URL — repoint each
1. **Frontend (Vercel)** — set `NEXT_PUBLIC_API_URL` (and `NEXT_PUBLIC_WS_URL` if
   present) to the new URL, then redeploy. *Needs your Vercel access.*
2. **Daily.co recording webhook** — currently `…-a0fr…/api/v1/webhooks/daily/recording`.
   Re-register at the new URL (or the custom domain). *(Claude can do this via the
   Daily API once you confirm the target URL.)*
3. **Stripe webhook** — Stripe dashboard → Developers → Webhooks → update the
   endpoint URL to the new host; copy the new signing secret into
   `STRIPE_WEBHOOK_SECRET` if it changes. *Needs your Stripe dashboard.*
4. **Monitoring crons** (`endpoint-sweep`, `perf-gate`, `custody-soak`) — their
   `--base-url` / `CAMPAIGN_BASE_URL` point at Oregon. *(Claude can flip these.)*
5. **Any other webhooks** (Mux, SendGrid event webhook) if configured against the
   API host.

## Verify, then retire Oregon
1. After the frontend cutover, run: `scripts/perf_gate.py` and
   `scripts/endpoint_sweep.py --base-url <new>` against the new host — expect
   ~150-300 ms and 0 5xx.
2. Smoke-test the live site: login, dashboard, send a message (ARIA), an exchange
   view — confirm no CORS errors (ALLOWED_ORIGINS already covers the frontend
   origin; the API host change doesn't affect CORS).
3. Watch Sentry for a few hours (release-tagged; the perf-gate + sweep crons will
   alert on regressions).
4. **Retire Oregon** (`srv-d6kithtm5p6s73ds40l0`) — suspend first (instant
   rollback if needed), then delete once confident. You're paying for two
   standard instances until then.

## Rollback
Point `NEXT_PUBLIC_API_URL` (and webhooks) back at the Oregon URL and redeploy —
Oregon keeps running until explicitly retired. No data implications (shared DB).

## Also consider moving the workers/crons to us-east
The background services (aria-worker, rolling-generator, etc.) run in Oregon and
hit the DB cross-region too. They're latency-tolerant so it's lower priority, but
recreating them in Virginia (same pattern) would speed up ARIA processing and the
nightly custody projection.
