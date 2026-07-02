# Cutover Runbook — move prod API to us-east (Virginia)

**Why:** the us-east service is 6-10× faster (co-located with Supabase us-east-1).
Both services share the same database, so this is a routing cutover, not a data
migration — fully reversible by pointing back at Oregon.

- **New (fast):** `https://commonground-api-east.onrender.com` — `srv-d93c49btqb8s73blgtf0`, Virginia
- **Old (current prod):** `https://commonground-api-a0fr.onrender.com` — `srv-d6kithtm5p6s73ds40l0`, Oregon

## Custom domain (done on Render — needs your Cloudflare DNS record)
`api.find-commonground.com` has been added to the `commonground-api-east` service
(Render domain id `cdm-d93caa9o3t8c73fbd8ig`, status: unverified until DNS is set).

**Add this record in Cloudflare** (dash.cloudflare.com → find-commonground.com → DNS):
| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `api` |
| Target | `commonground-api-east.onrender.com` |
| Proxy status | **DNS only (grey cloud)** — NOT proxied |
| TTL | Auto |

⚠️ **Must be DNS-only (grey cloud).** Render already fronts the service with its
own CDN/Cloudflare + SSL. If you proxy it (orange cloud) you add a THIRD proxy
hop, which (a) can break Render's SSL and (b) shifts the real client IP position
in X-Forwarded-For — the rate limiter's `TRUSTED_PROXY_HOPS=2` would then need to
become `3`. Keep it grey.

Once the record is live, Render auto-verifies and issues SSL (a few minutes).
Then use `https://api.find-commonground.com` everywhere below.

## Everything pointing at the OLD Oregon URL — repoint each
1. **Frontend (Vercel)** — set `NEXT_PUBLIC_API_URL` (and `NEXT_PUBLIC_WS_URL` if
   present) to the new URL, then redeploy. *Needs your Vercel access.*
2. **Daily.co recording webhook** — currently `…-a0fr…/api/v1/webhooks/daily/recording`.
   Re-register at the new URL (or the custom domain). *(Claude can do this via the
   Daily API once you confirm the target URL.)*
3. **Stripe webhook** *(test mode)* — Stripe dashboard → Developers → Webhooks →
   open your existing CommonGround endpoint → **Update details** → set URL to:
   `https://api.find-commonground.com/api/v1/webhooks/stripe`
   Updating the URL on the SAME endpoint keeps the signing secret, so no env
   change. (If you create a NEW endpoint instead, copy its `whsec_…` into
   `STRIPE_WEBHOOK_SECRET` on both Render services.) Events the handler processes
   (ensure these are selected):
   `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
   `invoice.paid`, `invoice.payment_failed`, `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `payout.paid`, `payout.failed`,
   `transfer.created`, `transfer.paid`, `account.updated`.
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
