# Platform Readiness Assessment — 2026-07-02

**Question asked:** can we put this in people's hands without it breaking, and does it reliably do everything we claim?

**Verdict: READY FOR A CONTROLLED BETA after 3 blockers are cleared (1–2 days of work). NOT ready for a public/paid launch yet.**
~85 marketing claims were inventoried and mapped to app features; the core product is real, deployed, and verified — but email is currently dead (which kills onboarding), payments are in test mode, and several trust claims in the marketing copy are stronger than the implementation.

---

## 1. What is verifiably solid (evidence-backed)

| Area | Evidence | When |
|---|---|---|
| Every API route alive (449 GET routes, 0 5xx) | endpoint sweep vs prod, ×3 + twice-daily cron | today |
| Core parent journey (register → family file → child → agreement dual-approval → messages+ARIA → schedule → exchange check-in → ClearFund → export) | 12-stage backend E2E + 27-scenario AI bug campaign, run against prod | Jul 1 (suite green 06:30) |
| GPS custody-exchange accuracy (geofence math within 1 m, custody flips, silent handoff incl. edge cases) | independent oracle (`geo_oracle.py`) recomputing every check-in; 8 GEO scenarios green | Jul 1 |
| ARIA 3-tier analysis (regex → Claude → OpenAI) | scenarios S-ARIA-01/02/03 + integration tests + 52k-assertion corpus stress test | Jul 1 |
| Frontend builds & renders (272 pages), 6 Playwright flows | prod build today; Playwright Jan 23 | today / Jan |
| Deploy pipeline & builds | fixed today (was silently broken June 16–Jul 1); deps fully pinned (requirements.lock) | today |
| All 8 services live (api + aria-worker + 6 crons) with shared env group | created & verified today; ARIA worker polling | today |
| Monitoring loop | Sentry (release-tagged, AI triage 3×/wk with auto-mute + regression reopen, alert rule) + twice-daily synthetic sweep; **0 unresolved issues right now** | today |
| Security posture (baseline) | unauth sweep: everything 401/403/422 correctly; webhook signature checks verified; per-IP rate limiting confirmed live; durable Ed25519 signing key installed | today |
| Failed-email resilience | critical emails spill to a DB outbox with scheduled redispatch (Redis-locked) | code-verified today |

## 2. BLOCKERS — will break the moment real users arrive

1. **Email is completely down (SendGrid 401).** Registration works, but co-parent invitations (the core onboarding loop), professional invitations, password resets, and every notification email fail. Critical ones queue in the outbox and will flush once fixed — but a new user inviting their co-parent TODAY sees nothing happen. **Fix:** new SendGrid key (5 min) or migrate to Resend (~half day; templates are in-repo so appearance is unchanged).
2. **Stripe is in TEST mode.** Nobody can actually subscribe ($17.99 Plus / $34.99 Complete / professional tiers) or make ClearFund payments with real cards. **Decision needed:** launch free-tier-only beta (claims support this — "forever free" tier is real) or switch to live keys + live products + live webhook secret before invites go out.
3. **`DAILY_WEBHOOK_SECRET` unset in prod** (Sentry J4 flags it on every boot). KidComs call recording/transcription webhooks — the "ARIA monitors kids' calls" safety claim — are silently disabled. Set the secret from the Daily dashboard.

## 3. HIGH RISK — fix before or during early beta

4. **Marketing copy overclaims security.** The security/professionals pages promise "end-to-end encryption" and "SOC 2 controls." Messages are TLS + encrypted at rest, but ARIA reads them server-side — that is **not** E2EE by definition, and no SOC 2 audit exists. For a product marketed to DV survivors and courts this is a legal/trust exposure. Reword to "encrypted in transit and at rest" / "bank-level encryption" and drop SOC 2 until audited.
5. **The 3-day custody soak never ran.** launchd is blocked (`Operation not permitted` — script under ~/Desktop needs Full Disk Access, or move it). The July 1 full-matrix run WAS green, but today's deploy shipped 2 weeks of code at once — rerun the campaign once (`--mode fast --confirm-production`) and fix the soak scheduling.
6. **Bug-campaign findings from the July 1 iteration to re-verify post-deploy:** geocode accuracy labels ("exact" on city-centroid results — affects handoff safety), child-wallet ledger races, one export-hash mismatch. Fixes were committed the same morning (suite went green), but nothing has re-verified them against today's build.
7. **Capacity:** 1× standard instance (render.yaml intends 2), no load test ever run. Fine for ≤~50 concurrent beta families; not validated beyond that. Bump `numInstances` to 2 + load-test before any public push.
8. **Deferred security items:** MFA modeled but not enforced (admins/court roles), the committed dev secrets in git history are still unrotated (Supabase/Anthropic/Stripe-test/old SendGrid/old Sentry token), court-portal professional auth is prod-gated by a 501 rather than real auth, no CI. Acceptable for a closed beta; must close before GA.
9. **AI provider resilience:** Anthropic key ran out of quota June 30 (took ARIA down; circuit breaker contained it). No billing alert exists. OpenAI fallback key present in prod but was also quota'd. Set billing alerts on both, or the "ARIA always works" experience degrades under load.

## 4. Claims with NO automated verification (watch manually during beta)

Push notifications (FCM/APNs delivery), QR-code check-in (camera flow), message attachments (type/size validation), password reset end-to-end, recurring-schedule generation edge cases (DST, holidays), Google/Outlook calendar sync (not built — don't imply it), international addresses / multi-currency, GAL portal UI, professional ARIA sensitivity settings, Stripe Issuing child cards (inert pending Stripe approval), mobile apps ("coming soon" — correctly labeled).

## 5. Recommended sequence to "in people's hands"

1. **Today:** fix email (new SendGrid key or start Resend migration); set `DAILY_WEBHOOK_SECRET`; decide payments mode; correct E2EE/SOC-2 copy.
2. **Then:** rerun the bug campaign against the current build; fix anything red; restart the soak (fix launchd perms or run via cron on Render).
3. **Beta (10–50 invited families):** free tier only if Stripe stays test; watch Sentry + triage emails daily — the monitoring loop will surface breakage within hours (it already caught and helped fix the email-monitor bug on that worker's first day).
4. **Before public/paid launch:** rotate git-history secrets, enforce MFA, live Stripe, 2× instances + load test, CI on main.
