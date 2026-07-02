"""Perf-regression gate — cheap, schedulable latency check on the hot paths.

Unlike load_test.py (heavy ramp, run on demand), this makes ONE low-load pass:
it times each key endpoint a few times, takes the best (min) latency to remove
jitter, and FAILS (exit 1) if any endpoint exceeds its threshold. Safe to run on
a schedule — it catches perf regressions (a new slow query, a worse region split,
a cold pool) without flooding prod. Alerts to Sentry on regression.

Thresholds are intentionally set with headroom over the 2026-07-02 cross-region
baseline (app us-west ↔ DB us-east). **Tighten them after the app and DB are
co-located** so the gate catches regressions from the faster baseline.

USAGE
  cd backend && source .venv/bin/activate && source scripts/bug_campaign/state/campaign.env
  python -m scripts.perf_gate            # human output, exit 1 on regression
  python -m scripts.perf_gate --sentry   # also alert regressions to Sentry
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import httpx

BASE = os.environ.get("CAMPAIGN_BASE_URL", "https://commonground-api-a0fr.onrender.com")
API = f"{BASE}/api/v1"
ADMIN_EMAIL = os.environ.get("CAMPAIGN_ADMIN_EMAIL", "")
ADMIN_PW = os.environ.get("CAMPAIGN_ADMIN_PASSWORD", "")

# (label, path-template, needs_auth, threshold_ms). Threshold = best-of-N ceiling.
# Headroom over the 2026-07-02 cross-region baseline; tighten post co-location.
CHECKS = [
    ("health",              "{base}/health",                          False, 2000),
    ("root",                "{base}/",                                False,  600),
    ("profile",             "{api}/users/me/profile",                 True,  2500),
    ("family_files",        "{api}/family-files/",                     True,  3500),
    ("notifications",       "{api}/users/me/notifications",           True,  2500),
    ("dashboard_summary",   "{api}/dashboard/summary/{ffid}",         True,  4500),
    ("exchanges_upcoming",  "{api}/exchanges/case/{ffid}/upcoming",   True,  5500),
]
SAMPLES = 3


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sentry", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    with httpx.Client(timeout=30.0, follow_redirects=True) as c:
        atok = c.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}).json()["access_token"]
        ah = {"Authorization": f"Bearer {atok}"}
        cohorts = c.get(f"{API}/admin/bug-hunts", headers=ah).json()
        cohorts = cohorts.get("items", cohorts) if isinstance(cohorts, dict) else cohorts
        ffid, ptok = None, None
        for co in cohorts:
            dash = c.get(f"{API}/admin/bug-hunts/{co['id']}", headers=ah).json()
            for f in dash.get("families", []):
                if f.get("family_file_id") and f.get("parent_a_email"):
                    lr = c.post(f"{API}/auth/login", json={"email": f["parent_a_email"], "password": f["parent_a_password"]})
                    if lr.status_code == 200:
                        ptok, ffid = lr.json()["access_token"], f["family_file_id"]
                        break
            if ptok:
                break
        if not ptok:
            print("ABORT: no usable synthetic family")
            return 2
        ph = {"Authorization": f"Bearer {ptok}"}

        rows, regressions = [], []
        for label, tmpl, auth, thresh in CHECKS:
            url = tmpl.format(base=BASE, api=API, ffid=ffid)
            # Best latency among SUCCESSFUL (2xx) samples. A transient non-2xx
            # (e.g. the intermittent auth 401 under cross-region latency) is
            # tolerated as long as at least one sample succeeds — the gate is
            # for latency regressions, not for flapping on a single blip.
            best_ok, any_2xx, last_code = 1e9, False, None
            for _ in range(SAMPLES):
                t = time.monotonic()
                try:
                    r = c.get(url, headers=ph if auth else {})
                    last_code = r.status_code
                    dt = (time.monotonic() - t) * 1000
                    if r.status_code < 400:
                        any_2xx = True
                        best_ok = min(best_ok, dt)
                except Exception as e:
                    last_code = f"ERR:{type(e).__name__}"
            best = round(best_ok) if any_2xx else -1
            ok = any_2xx and best <= thresh
            rows.append((label, best, thresh, last_code, ok))
            if not ok:
                kind = "latency" if any_2xx else "error"
                regressions.append((label, best, thresh, last_code, kind))

    if args.json:
        print(json.dumps({"rows": [dict(zip(("label", "best_ms", "threshold_ms", "code", "ok"), r)) for r in rows],
                          "regressions": len(regressions)}, indent=2))
    else:
        print(f"Perf gate → {BASE}   (best-of-{SAMPLES} per endpoint)")
        print(f"  {'endpoint':22} {'best_ms':>8} {'limit':>7} {'code':>6}  status")
        for label, best, thresh, code, ok in rows:
            print(f"  {label:22} {best:>8} {thresh:>7} {str(code):>6}  {'OK' if ok else 'REGRESSION'}")

    if regressions and args.sentry:
        dsn = os.environ.get("SENTRY_DSN")
        if dsn:
            import sentry_sdk
            sentry_sdk.init(dsn=dsn, environment=os.environ.get("ENVIRONMENT", "development"))
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("source", "perf_gate")
                for label, best, thresh, code, kind in regressions:
                    msg = (f"Perf regression: {label} {best}ms > {thresh}ms" if kind=="latency"
                           else f"Perf gate error: {label} HTTP {code}")
                    sentry_sdk.capture_message(msg + f" (HTTP {code})", level="warning")
            sentry_sdk.flush(timeout=10)

    if regressions:
        print(f"\n❌ {len(regressions)} endpoint(s) over threshold.")
        return 1
    print("\n✅ all endpoints within threshold.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
