"""Automated endpoint health sweep — synthetic monitoring for every API route.

Enumerates every route registered on the FastAPI app and exercises each one,
verifying that no endpoint 5xxes. Unauthenticated requests are EXPECTED to get
401/403/404/422 on protected routes — the sweep asserts the route is alive and
failing safely, not that it returns data. Catches broken imports, dependency
failures, missing tables/columns, and routes that crash before auth.

Modes:
  in-process (default)  — drives the app through httpx.ASGITransport; no server
                          needed. Full-stack: routing, DI, DB session wiring.
  --base-url URL        — sweeps a deployed instance over HTTP instead
                          (e.g. https://commonground-api-a0fr.onrender.com).

Safety:
  GET/HEAD only by default. --all-methods also sends POST/PUT/PATCH/DELETE with
  an empty JSON body — protected routes 401 and public routes 422 on validation
  before side effects, but review public no-body POSTs before using it on prod.

Reporting:
  Human summary to stdout, failures listed individually. --json for machine
  output. --sentry captures a tagged message per failing route (uses SENTRY_DSN)
  so scheduled sweeps alert like any other prod error. Exit code 1 if any route
  returned 5xx (or connection error), else 0.

Usage:
  cd backend && source .venv/bin/activate
  python -m scripts.endpoint_sweep                      # in-process, GET only
  python -m scripts.endpoint_sweep --base-url https://commonground-api-a0fr.onrender.com
  python -m scripts.endpoint_sweep --sentry             # alert failures to Sentry

Render cron: schedule `python -m scripts.endpoint_sweep --base-url $PUBLIC_API_URL --sentry`
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from dataclasses import dataclass, field

import httpx

# A well-formed UUID that will never exist — exercises the full handler path
# for /{id} routes and should produce 401/404, never 500.
DUMMY_UUID = "00000000-0000-4000-8000-000000000000"

SAFE_METHODS = {"GET", "HEAD"}
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Routes that must not be swept even with --all-methods (side effects even
# without auth/body, or intentionally slow).
SKIP_PATTERNS = [
    r"/webhook",           # signature-verified external callbacks
    r"/auth/register",     # would create accounts if given a valid body
    r"/demo/",             # public demo endpoints invoke paid AI providers
    r"/chatbot",           # public AI endpoint
]


@dataclass
class SweepResult:
    method: str
    path: str
    status: int | None = None
    ok: bool = False
    error: str | None = None
    elapsed_ms: float = 0.0


@dataclass
class SweepReport:
    results: list[SweepResult] = field(default_factory=list)

    @property
    def failures(self) -> list[SweepResult]:
        return [r for r in self.results if not r.ok]

    def summary(self) -> dict:
        by_status: dict[str, int] = {}
        for r in self.results:
            key = str(r.status) if r.status else "ERR"
            by_status[key] = by_status.get(key, 0) + 1
        return {
            "total": len(self.results),
            "passed": len(self.results) - len(self.failures),
            "failed": len(self.failures),
            "by_status": dict(sorted(by_status.items())),
        }


def fill_path_params(path: str) -> str:
    """Substitute path params with dummy values ({id}-> uuid, ints -> 1)."""
    def sub(match: re.Match) -> str:
        name = match.group(1).split(":")[0]
        lowered = name.lower()
        if "int" in match.group(0) or lowered in ("page", "index", "n", "year", "month", "day"):
            return "1"
        if lowered.endswith("_id") or lowered == "id" or "uuid" in lowered:
            return DUMMY_UUID
        if "token" in lowered:
            return "sweep-dummy-token"
        if "slug" in lowered or "name" in lowered:
            return "sweep-dummy"
        return DUMMY_UUID
    return re.sub(r"\{([^}]+)\}", sub, path)


def collect_routes(app) -> list[tuple[str, str]]:
    """(method, path) for every route on the app.

    Primary source is the OpenAPI schema — it survives FastAPI internals
    changing (0.139+ registers included routers as lazy `_IncludedRouter`
    objects, so iterating `app.routes` for APIRoute instances only finds
    app-level routes). The direct traversal is kept as a union so routes
    with include_in_schema=False are still swept.
    """
    from fastapi.routing import APIRoute

    out: set[tuple[str, str]] = set()

    try:
        schema = app.openapi()
        for path, ops in schema.get("paths", {}).items():
            for method in ops:
                m = method.upper()
                if m in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"}:
                    out.add((m, path))
    except Exception as exc:  # never let schema generation kill the sweep
        print(f"warning: openapi() route enumeration failed: {exc}", file=sys.stderr)

    for route in app.routes:
        if isinstance(route, APIRoute):
            for method in route.methods - {"OPTIONS"}:
                out.add((method, route.path))

    return sorted(out)


def is_skipped(path: str) -> bool:
    return any(re.search(p, path) for p in SKIP_PATTERNS)


async def sweep(
    base_url: str | None,
    all_methods: bool = False,
    timeout: float = 20.0,
    auth_token: str | None = None,
    rps: float | None = None,
) -> SweepReport:
    # Importing the app also gives us the route table when sweeping remotely,
    # so remote mode still covers every registered route.
    from app.main import app

    routes = collect_routes(app)
    methods_allowed = SAFE_METHODS | (MUTATING_METHODS if all_methods else set())

    if base_url:
        client = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout)
    else:
        client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://sweep.local",
            timeout=timeout,
        )

    headers = {"User-Agent": "cg-endpoint-sweep/1.0"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    report = SweepReport()
    sem = asyncio.Semaphore(8)
    counter = {"n": 0}
    # Remote sweeps must stay under the API's per-IP rate limit (100/min);
    # default to ~85/min unless the caller overrides.
    delay = (1.0 / rps) if rps else (0.7 if base_url else 0.0)

    async def hit(method: str, path: str) -> None:
        url = fill_path_params(path)
        result = SweepResult(method=method, path=path)
        import time

        start = time.monotonic()
        try:
            async with sem:
                req_headers = dict(headers)
                if not base_url:
                    # In-process only: rotate the client IP the rate limiter
                    # keys on, so a full sweep isn't self-throttled to 429s.
                    counter["n"] += 1
                    req_headers["X-Forwarded-For"] = (
                        f"10.99.{counter['n'] // 250}.{counter['n'] % 250 + 1}"
                    )
                resp = await client.request(
                    method, url, headers=req_headers,
                    json={} if method in MUTATING_METHODS else None,
                )
            result.status = resp.status_code
            # Alive = anything that isn't a server error. 401/403/404/405/422
            # from an unauthenticated sweep mean the route is wired correctly.
            result.ok = resp.status_code < 500
        except Exception as exc:
            result.error = f"{type(exc).__name__}: {exc}"
            result.ok = False
        result.elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        report.results.append(result)

    targets = [
        (method, path)
        for method, path in routes
        if method in methods_allowed and not is_skipped(path)
    ]
    try:
        if delay:
            # Paced sequential sweep (remote mode) — stays under per-IP limits.
            for method, path in targets:
                await hit(method, path)
                await asyncio.sleep(delay)
        else:
            await asyncio.gather(*(hit(m, p) for m, p in targets))
    finally:
        await client.aclose()

    report.results.sort(key=lambda r: (r.ok, r.path))
    return report


def alert_to_sentry(report: SweepReport, base_url: str | None) -> None:
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        print("(--sentry requested but SENTRY_DSN not set — skipping)", file=sys.stderr)
        return
    import sentry_sdk

    sentry_sdk.init(dsn=dsn, environment=os.environ.get("ENVIRONMENT", "development"))
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("source", "endpoint_sweep")
        scope.set_tag("target", base_url or "in-process")
        for f in report.failures[:25]:
            sentry_sdk.capture_message(
                f"Endpoint sweep failure: {f.method} {f.path} -> "
                f"{f.status or f.error}",
                level="error",
            )
    sentry_sdk.flush(timeout=10)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", help="Sweep a deployed instance instead of in-process")
    parser.add_argument("--all-methods", action="store_true", help="Also send POST/PUT/PATCH/DELETE with empty bodies")
    parser.add_argument("--auth-token", help="Bearer token to sweep authenticated (optional)")
    parser.add_argument("--json", action="store_true", help="Machine-readable output")
    parser.add_argument("--sentry", action="store_true", help="Capture failures to Sentry")
    parser.add_argument("--rps", type=float, help="Requests/second pacing (remote default ~1.4 to stay under the per-IP rate limit)")
    args = parser.parse_args()

    report = asyncio.run(
        sweep(args.base_url, all_methods=args.all_methods, auth_token=args.auth_token, rps=args.rps)
    )
    summary = report.summary()

    if args.json:
        print(json.dumps({
            "summary": summary,
            "failures": [vars(f) for f in report.failures],
        }, indent=2))
    else:
        print(f"\nEndpoint sweep — {summary['total']} routes "
              f"({'remote: ' + args.base_url if args.base_url else 'in-process'})")
        print(f"  passed: {summary['passed']}   failed: {summary['failed']}")
        print(f"  status mix: {summary['by_status']}")
        if report.failures:
            print("\nFAILURES (5xx / connection errors):")
            for f in report.failures:
                print(f"  {f.method:6} {f.path}  ->  {f.status or f.error}  ({f.elapsed_ms}ms)")

    if args.sentry and report.failures:
        alert_to_sentry(report, args.base_url)

    return 1 if report.failures else 0


if __name__ == "__main__":
    sys.exit(main())
