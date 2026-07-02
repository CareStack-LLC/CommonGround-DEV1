"""Bounded load test for the CommonGround API — ramps concurrency to find the
break point of the live stack (Render web service + Supabase pool).

WHAT IT DOES
  Acquires a small pool of real parent auth tokens (from existing bug-campaign
  synthetic families — no new users created), then drives a weighted mix of
  NON-AI authenticated read endpoints at rising concurrency levels. It records
  p50/p95/p99 latency, error rate, and throughput per stage, and STOPS ramping
  the moment a stage breaches the back-off thresholds (so it finds the ceiling
  without flooding a clearly-broken server).

WHY NON-AI ONLY
  ARIA message analysis is deliberately excluded — it burns Anthropic tokens and
  its throughput is bounded by the provider, not by our server. This test
  measures OUR capacity: request routing, auth, and the Supabase connection pool.

RATE-LIMITER NOTE
  Each request sends a unique X-Forwarded-For so the per-IP limiter treats it as
  a distinct client — this mirrors how 500 real users (500 real IPs) would hit
  the deployed limiter, and lets us measure true server capacity rather than one
  client's 100/min cap. (That the limiter trusts a client-set XFF is itself a
  bug being fixed separately.)

USAGE
  cd backend && source .venv/bin/activate && source scripts/bug_campaign/state/campaign.env
  python -m scripts.load_test                     # default ramp to 500
  python -m scripts.load_test --max 500 --stage-seconds 20
"""
from __future__ import annotations

import argparse
import asyncio
import os
import random
import statistics
import time

import httpx

BASE = os.environ.get("CAMPAIGN_BASE_URL", "https://commonground-api-a0fr.onrender.com")
API = f"{BASE}/api/v1"
ADMIN_EMAIL = os.environ.get("CAMPAIGN_ADMIN_EMAIL", "")
ADMIN_PW = os.environ.get("CAMPAIGN_ADMIN_PASSWORD", "")

# Ramp stages (concurrent workers). Ends early if a stage breaks.
DEFAULT_STAGES = [50, 100, 200, 350, 500]
# Back-off: stop ramping if a stage breaches either threshold.
MAX_ERROR_RATE = 0.20      # >20% non-2xx (excluding expected 429s)
MAX_P95_MS = 8000.0        # p95 latency ceiling


def _xff() -> str:
    return f"10.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"


async def acquire_tokens(client: httpx.AsyncClient, want: int = 15) -> list[tuple[str, str]]:
    """Return [(token, family_file_id)] from existing synthetic families."""
    r = await client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    r.raise_for_status()
    atok = r.json()["access_token"]
    ah = {"Authorization": f"Bearer {atok}"}
    cohorts = (await client.get(f"{API}/admin/bug-hunts", headers=ah)).json()
    cohorts = cohorts.get("items", cohorts) if isinstance(cohorts, dict) else cohorts

    creds: list[dict] = []
    for c in cohorts:
        dash = (await client.get(f"{API}/admin/bug-hunts/{c['id']}", headers=ah)).json()
        for f in dash.get("families", []):
            if f.get("family_file_id") and f.get("parent_a_email") and f.get("parent_a_password"):
                creds.append(f)
        if len(creds) >= want:
            break

    tokens: list[tuple[str, str]] = []
    for f in creds[:want]:
        try:
            lr = await client.post(f"{API}/auth/login",
                                   json={"email": f["parent_a_email"], "password": f["parent_a_password"]})
            if lr.status_code == 200:
                tokens.append((lr.json()["access_token"], f["family_file_id"]))
        except Exception:
            pass
    return tokens


def endpoints_for(tok: str, ffid: str) -> list[tuple[str, dict]]:
    """Weighted read endpoints (all confirmed 200). Returned list is the weighting."""
    h = {"Authorization": f"Bearer {tok}"}
    mix = [
        (f"{API}/dashboard/summary/{ffid}", h),   # heaviest: aggregates across the family
        (f"{API}/dashboard/summary/{ffid}", h),
        (f"{API}/family-files/", h),
        (f"{API}/exchanges/case/{ffid}/upcoming", h),
        (f"{API}/users/me/notifications", h),
        (f"{API}/users/me/profile", h),
        (f"{BASE}/health", {}),                    # cheap baseline (root path)
    ]
    return mix


async def run_stage(client: httpx.AsyncClient, tokens: list[tuple[str, str]],
                    concurrency: int, seconds: float) -> dict:
    latencies: list[float] = []
    codes: dict[int, int] = {}
    errors = 0
    stop_at = time.monotonic() + seconds
    lock = asyncio.Lock()

    async def worker():
        nonlocal errors
        while time.monotonic() < stop_at:
            tok, ffid = random.choice(tokens)
            url, base_h = random.choice(endpoints_for(tok, ffid))
            headers = {**base_h, "X-Forwarded-For": _xff(), "User-Agent": "cg-loadtest/1.0"}
            t0 = time.monotonic()
            try:
                resp = await client.get(url, headers=headers, timeout=30.0)
                dt = (time.monotonic() - t0) * 1000
                async with lock:
                    latencies.append(dt)
                    codes[resp.status_code] = codes.get(resp.status_code, 0) + 1
            except Exception:
                async with lock:
                    errors += 1

    workers = [asyncio.create_task(worker()) for _ in range(concurrency)]
    await asyncio.gather(*workers)

    total = sum(codes.values()) + errors
    ok = sum(v for k, v in codes.items() if 200 <= k < 300)
    rl = codes.get(429, 0)
    redirects = sum(v for k, v in codes.items() if 300 <= k < 400)
    # error rate excludes expected 429s AND 3xx redirects (not failures)
    bad = total - ok - rl - redirects
    err_rate = (bad + errors) / total if total else 0.0
    lat = sorted(latencies)

    def pct(p):
        return lat[min(len(lat) - 1, int(len(lat) * p))] if lat else 0.0

    return {
        "concurrency": concurrency, "requests": total, "ok": ok, "rate_limited_429": rl,
        "errors_conn": errors, "other_non2xx": bad,
        "throughput_rps": round(total / seconds, 1),
        "err_rate": round(err_rate, 4),
        "p50_ms": round(pct(0.50), 1), "p95_ms": round(pct(0.95), 1), "p99_ms": round(pct(0.99), 1),
        "codes": dict(sorted(codes.items())),
    }


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=500)
    ap.add_argument("--stage-seconds", type=float, default=20.0)
    args = ap.parse_args()

    stages = [s for s in DEFAULT_STAGES if s <= args.max]
    if args.max not in stages:
        stages.append(args.max)

    limits = httpx.Limits(max_connections=args.max + 50, max_keepalive_connections=args.max + 50)
    async with httpx.AsyncClient(limits=limits, timeout=30.0, follow_redirects=True) as client:
        print(f"Load test → {BASE}")
        tokens = await acquire_tokens(client)
        if not tokens:
            print("ABORT: could not acquire any auth tokens")
            return
        print(f"Acquired {len(tokens)} auth token(s). Ramping {stages}, {args.stage_seconds}s/stage.\n")
        print(f"{'VUs':>5} {'req':>7} {'rps':>7} {'ok%':>6} {'err%':>6} {'429':>6} {'p50':>7} {'p95':>8} {'p99':>8}")

        broke_at = None
        for c in stages:
            r = await run_stage(client, tokens, c, args.stage_seconds)
            okpct = round(100 * r["ok"] / r["requests"], 1) if r["requests"] else 0
            print(f"{c:>5} {r['requests']:>7} {r['throughput_rps']:>7} {okpct:>6} "
                  f"{round(r['err_rate']*100,1):>6} {r['rate_limited_429']:>6} "
                  f"{r['p50_ms']:>7} {r['p95_ms']:>8} {r['p99_ms']:>8}")
            if r["err_rate"] > MAX_ERROR_RATE or r["p95_ms"] > MAX_P95_MS:
                broke_at = c
                print(f"\n⚠ BREAK POINT at {c} VUs — err_rate={r['err_rate']:.1%}, "
                      f"p95={r['p95_ms']}ms (codes: {r['codes']}). Stopping ramp.")
                break

        if broke_at is None:
            print(f"\n✅ Held to {stages[-1]} concurrent VUs with no back-off breach.")
        print("\nNote: reads only; writes and ARIA excluded. Synthetic tokens, no new users created.")


if __name__ == "__main__":
    asyncio.run(main())
