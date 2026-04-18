"""Pre-launch end-to-end system preflight check.

Runs BEFORE `test_full_system_e2e.py` to guarantee the target environment is
safe to wipe, wired up correctly, and all external services are reachable.
Exits non-zero on any failure so the calling harness can abort early.

Hard-fails if any of the following look production-ish:
  - STRIPE_SECRET_KEY does not start with "sk_test_"
  - DATABASE_URL hostname contains "prod"
  - SUPABASE_URL matches a known production project ref (set below)
  - ALLOW_DESTRUCTIVE_PREFLIGHT != "true"  (explicit opt-in)

Usage:
    cd backend
    ALLOW_DESTRUCTIVE_PREFLIGHT=true \
        python scripts/preflight_launch_check.py

Environment variables required:
    SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL, STRIPE_SECRET_KEY, SENDGRID_API_KEY, ANTHROPIC_API_KEY,
    DAILY_API_KEY, REDIS_URL, MAPBOX_API_KEY
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from typing import Callable, Optional
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Safety constants — edit these if the production project ref changes.
# ---------------------------------------------------------------------------

# Hardcode the production Supabase project ref here so a misconfigured
# SUPABASE_URL on a dev machine can never wipe production. Update if the
# prod project is rotated.
FORBIDDEN_SUPABASE_PROJECT_REFS = {
    # Example production ref: "abcd1234efgh5678". Leave empty — set when known.
}

FORBIDDEN_DATABASE_HOSTS_SUBSTRINGS = [
    "prod",           # any hostname with "prod" in it
    ".render.com",    # protect Render-hosted prod
]

REQUIRED_ENV_VARS = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "STRIPE_SECRET_KEY",
    "SENDGRID_API_KEY",
    "ANTHROPIC_API_KEY",
]

# Either of these keys is accepted for the Supabase service role. Some
# deploys use the newer SERVICE_ROLE_KEY name; older ones use SERVICE_KEY.
# Treat presence of EITHER as satisfying the requirement.
SUPABASE_SERVICE_KEY_ALIASES = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"]

# Optional — absence is a warning, not a failure.
OPTIONAL_ENV_VARS = [
    "DAILY_API_KEY",
    "MAPBOX_API_KEY",
    "OPENAI_API_KEY",
    "REDIS_URL",
]


# ---------------------------------------------------------------------------
# Result tracking
# ---------------------------------------------------------------------------

@dataclass
class CheckResult:
    name: str
    ok: bool
    message: str = ""


@dataclass
class Report:
    checks: list[CheckResult] = field(default_factory=list)

    def add(self, name: str, ok: bool, message: str = "") -> None:
        self.checks.append(CheckResult(name, ok, message))
        marker = "✓" if ok else "✗"
        print(f"  {marker} {name}" + (f" — {message}" if message else ""))

    @property
    def all_ok(self) -> bool:
        return all(c.ok for c in self.checks)

    def summary(self) -> str:
        passed = sum(1 for c in self.checks if c.ok)
        total = len(self.checks)
        return f"{passed}/{total} checks passed"


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _redact(value: Optional[str], keep_last: int = 4) -> str:
    if not value:
        return "(unset)"
    if len(value) <= keep_last + 3:
        return "***"
    return f"***{value[-keep_last:]}"


def _supabase_project_ref(url: str) -> str:
    """Extract the project-ref from https://<ref>.supabase.co."""
    try:
        host = urlparse(url).hostname or ""
        return host.split(".")[0]
    except Exception:
        return ""


def _section(title: str) -> None:
    print("\n" + "─" * 64)
    print(f"  {title}")
    print("─" * 64)


# ---------------------------------------------------------------------------
# Check: environment safety
# ---------------------------------------------------------------------------

def check_safety(report: Report) -> None:
    _section("1/6  Environment safety")

    if os.getenv("ALLOW_DESTRUCTIVE_PREFLIGHT") != "true":
        report.add(
            "destructive-opt-in",
            False,
            "ALLOW_DESTRUCTIVE_PREFLIGHT must be exactly 'true' — preflight wipes the DB",
        )
        return

    report.add("destructive-opt-in", True, "ALLOW_DESTRUCTIVE_PREFLIGHT=true")

    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
    if stripe_key and not stripe_key.startswith("sk_test_"):
        report.add(
            "stripe-test-mode",
            False,
            "STRIPE_SECRET_KEY is not a sk_test_ key — refusing to run",
        )
    else:
        report.add("stripe-test-mode", True, "STRIPE_SECRET_KEY starts with sk_test_")

    db_url = os.getenv("DATABASE_URL", "")
    host = urlparse(db_url.replace("postgresql+asyncpg", "postgresql")).hostname or ""
    if any(s in host for s in FORBIDDEN_DATABASE_HOSTS_SUBSTRINGS):
        report.add(
            "db-host-not-prod",
            False,
            f"DATABASE_URL host '{host}' matches a forbidden substring",
        )
    else:
        report.add("db-host-not-prod", True, f"DATABASE_URL host is '{host}'")

    supa_url = os.getenv("SUPABASE_URL", "")
    ref = _supabase_project_ref(supa_url)
    if ref and ref in FORBIDDEN_SUPABASE_PROJECT_REFS:
        report.add(
            "supabase-project-not-prod",
            False,
            f"SUPABASE_URL project ref '{ref}' is on the forbidden list",
        )
    else:
        report.add(
            "supabase-project-not-prod",
            True,
            f"SUPABASE_URL project ref is '{ref or 'unknown'}'",
        )


# ---------------------------------------------------------------------------
# Check: required env vars
# ---------------------------------------------------------------------------

def _normalize_database_url() -> None:
    """Ensure DATABASE_URL has the asyncpg driver prefix before any child
    process (cleanup_all_test_data.py, alembic) inherits it.

    Alembic uses sync psycopg2 — it handles `postgresql://` fine.
    cleanup_all_test_data.py passes DATABASE_URL straight into
    `create_async_engine()` which needs `postgresql+asyncpg://`. Rather
    than patch the cleanup script, do the rewrite once here and propagate.
    """
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    os.environ["DATABASE_URL"] = url
    # Keep a sync-driver copy for alembic.
    os.environ.setdefault(
        "DATABASE_URL_SYNC",
        url.replace("postgresql+asyncpg://", "postgresql://"),
    )


_PLACEHOLDER_MARKERS = {
    "placeholder",
    "changeme",
    "change-me",
    "your-key-here",
    "todo",
    "xxx",
    "secret",
    "test-key",
}


def _looks_like_placeholder(val: str) -> bool:
    v = (val or "").strip().lower()
    if not v:
        return True
    if len(v) < 12:
        return True
    return any(marker == v or marker in v.split("-") for marker in _PLACEHOLDER_MARKERS)


def check_env_vars(report: Report) -> None:
    _section("2/6  Environment variables")

    _normalize_database_url()

    for var in REQUIRED_ENV_VARS:
        val = os.getenv(var)
        if not val:
            report.add(var, False, "missing")
        elif _looks_like_placeholder(val):
            report.add(var, False, f"looks like a placeholder value ({_redact(val)})")
        else:
            report.add(var, True, _redact(val))

    # Supabase service role — either alias is fine.
    service_key = next(
        (v for v in (os.getenv(a) for a in SUPABASE_SERVICE_KEY_ALIASES) if v),
        None,
    )
    if service_key:
        report.add("SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY", True, _redact(service_key))
        # Propagate the canonical name so downstream scripts that expect the
        # longer alias pick it up even when only the short name was set.
        if not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
            os.environ["SUPABASE_SERVICE_ROLE_KEY"] = service_key
        if not os.getenv("SUPABASE_SERVICE_KEY"):
            os.environ["SUPABASE_SERVICE_KEY"] = service_key
    else:
        report.add(
            "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY",
            False,
            "neither alias set",
        )

    for var in OPTIONAL_ENV_VARS:
        val = os.getenv(var)
        if not val:
            # warning only — not counted against all_ok via a synthetic ok=True + message
            print(f"  ⚠ {var} unset (optional) — some features will be unavailable")
        else:
            print(f"  ○ {var} — {_redact(val)}")


# ---------------------------------------------------------------------------
# Check: migrations
# ---------------------------------------------------------------------------

def _alembic_cmd() -> list[str]:
    """Resolve `alembic` via the same interpreter so we don't depend on PATH.

    `sys.executable -m alembic` reliably hits the alembic that was installed
    alongside the venv we're running under, which matters when this script
    is invoked from outside the venv with its interpreter specified.
    """
    return [sys.executable, "-m", "alembic"]


def apply_migrations(report: Report) -> None:
    _section("3/6  Apply migrations")

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    try:
        proc = subprocess.run(
            _alembic_cmd() + ["upgrade", "head"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except FileNotFoundError:
        report.add("alembic", False, "alembic not installed in the active venv")
        return
    except subprocess.TimeoutExpired:
        report.add("alembic", False, "alembic upgrade timed out after 120s")
        return

    if proc.returncode != 0:
        report.add(
            "alembic-upgrade-head",
            False,
            f"exit={proc.returncode}: {(proc.stderr or proc.stdout).strip()[:200]}",
        )
        return

    # Grab the new head revision for visibility.
    try:
        heads = subprocess.run(
            _alembic_cmd() + ["current"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=30,
        )
        rev_line = heads.stdout.strip().splitlines()[-1] if heads.stdout.strip() else "?"
    except Exception:
        rev_line = "?"

    report.add("alembic-upgrade-head", True, f"current: {rev_line[:80]}")


# ---------------------------------------------------------------------------
# Check: wipe DB + Stripe + Supabase Auth + Redis
# ---------------------------------------------------------------------------

async def wipe_all(report: Report) -> None:
    _section("4/6  Wipe previous test data")

    # Run cleanup_all_test_data as a subprocess so its prints stay scoped.
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cleanup_all_test_data.py")
    try:
        proc = subprocess.run(
            [sys.executable, script],
            capture_output=True,
            text=True,
            timeout=300,
        )
    except subprocess.TimeoutExpired:
        report.add("cleanup-all-test-data", False, "cleanup timed out after 5 min")
        return

    if proc.returncode != 0:
        report.add(
            "cleanup-all-test-data",
            False,
            f"exit={proc.returncode}: {(proc.stderr or proc.stdout).strip()[:160]}",
        )
    else:
        # Echo a short excerpt so the operator sees what got wiped.
        excerpt = "\n".join(proc.stdout.strip().splitlines()[-6:])
        report.add("cleanup-all-test-data", True, "wiped db + stripe + supabase-auth")
        print("  ── last lines ──")
        for line in excerpt.splitlines():
            print(f"    {line}")

    # Redis flush — best-effort, warn only.
    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        report.add("redis-flush", True, "REDIS_URL unset — skipped")
        return

    try:
        import redis.asyncio as aioredis
    except ImportError:
        report.add("redis-flush", True, "redis package not installed — skipped")
        return

    try:
        client = aioredis.from_url(redis_url)
        await client.flushdb()
        await client.aclose()
        report.add("redis-flush", True, "FLUSHDB ok")
    except Exception as e:
        report.add("redis-flush", False, str(e)[:120])


# ---------------------------------------------------------------------------
# Check: content-only seeds (kidspace media + partner landings)
# ---------------------------------------------------------------------------

def seed_content(report: Report) -> None:
    _section("5/6  Seed content (no users)")

    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    for script_name in ("seed_kidspace_media.py", "seed_partner_landings.py"):
        path = os.path.join(scripts_dir, script_name)
        if not os.path.exists(path):
            report.add(script_name, True, "not present — skipped")
            continue
        try:
            proc = subprocess.run(
                [sys.executable, path],
                capture_output=True,
                text=True,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            report.add(script_name, False, "timed out")
            continue

        if proc.returncode != 0:
            report.add(
                script_name,
                False,
                f"exit={proc.returncode}: {(proc.stderr or proc.stdout).strip()[:140]}",
            )
        else:
            report.add(script_name, True, "seed complete")


# ---------------------------------------------------------------------------
# Check: external services reachable
# ---------------------------------------------------------------------------

async def ping_externals(report: Report) -> None:
    _section("6/6  External service pings")

    import httpx

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Stripe
        stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
        if stripe_key:
            try:
                r = await client.get(
                    "https://api.stripe.com/v1/account",
                    auth=(stripe_key, ""),
                )
                report.add("stripe", r.status_code == 200, f"HTTP {r.status_code}")
            except Exception as e:
                report.add("stripe", False, str(e)[:120])
        else:
            report.add("stripe", False, "STRIPE_SECRET_KEY missing")

        # SendGrid
        sg_key = os.getenv("SENDGRID_API_KEY", "")
        if sg_key:
            try:
                r = await client.get(
                    "https://api.sendgrid.com/v3/user/profile",
                    headers={"Authorization": f"Bearer {sg_key}"},
                )
                report.add("sendgrid", r.status_code == 200, f"HTTP {r.status_code}")
            except Exception as e:
                report.add("sendgrid", False, str(e)[:120])
        else:
            report.add("sendgrid", False, "SENDGRID_API_KEY missing")

        # Daily.co — optional. Skip quietly if no key.
        daily_key = os.getenv("DAILY_API_KEY", "")
        if daily_key:
            try:
                r = await client.get(
                    "https://api.daily.co/v1/rooms?limit=1",
                    headers={"Authorization": f"Bearer {daily_key}"},
                )
                report.add("daily.co", r.status_code == 200, f"HTTP {r.status_code}")
            except Exception as e:
                report.add("daily.co", False, str(e)[:120])
        else:
            print("  ⚠ daily.co skipped — DAILY_API_KEY unset (KidComs call UI won't work)")

        # Anthropic — 1-token ping via messages API
        anthro_key = os.getenv("ANTHROPIC_API_KEY", "")
        if anthro_key:
            try:
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthro_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-5-haiku-latest",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "."}],
                    },
                )
                report.add(
                    "anthropic",
                    r.status_code in (200, 400),
                    f"HTTP {r.status_code}",
                )
            except Exception as e:
                report.add("anthropic", False, str(e)[:120])
        else:
            report.add("anthropic", False, "ANTHROPIC_API_KEY missing")

        # Supabase auth settings
        supa_url = os.getenv("SUPABASE_URL", "")
        anon_key = os.getenv("SUPABASE_ANON_KEY", "")
        if supa_url and anon_key:
            try:
                r = await client.get(
                    f"{supa_url}/auth/v1/settings",
                    headers={"apikey": anon_key},
                )
                report.add("supabase-auth", r.status_code == 200, f"HTTP {r.status_code}")
            except Exception as e:
                report.add("supabase-auth", False, str(e)[:120])
        else:
            report.add("supabase-auth", False, "SUPABASE_URL or SUPABASE_ANON_KEY missing")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

async def main() -> int:
    print("=" * 64)
    print("  CommonGround pre-launch preflight check")
    print(f"  Started at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 64)

    report = Report()

    # 1. Safety — must pass before we touch anything.
    check_safety(report)
    if not report.all_ok:
        print("\n✗ SAFETY CHECKS FAILED — refusing to proceed.")
        print(f"   {report.summary()}")
        return 2

    # 2. Env vars.
    check_env_vars(report)
    if not report.all_ok:
        print("\n✗ REQUIRED ENV VARS MISSING — aborting before migrations.")
        print(f"   {report.summary()}")
        return 3

    # 3. Migrations.
    apply_migrations(report)

    # 4. Wipe.
    await wipe_all(report)

    # 5. Content seeds.
    seed_content(report)

    # 6. External pings.
    await ping_externals(report)

    # Summary.
    print("\n" + "=" * 64)
    if report.all_ok:
        print(f"  GO — {report.summary()}")
        print()
        print("  Before running Phase 1, start the Stripe webhook listener in")
        print("  a second terminal so payment-intent.succeeded events are")
        print("  forwarded to your local API:")
        print()
        print("    stripe listen \\")
        print("        --forward-to localhost:8000/api/v1/webhooks/stripe")
        print()
        print("  Then run:")
        print("    pytest backend/tests/e2e/test_full_system_e2e.py -v \\")
        print("        --html=reports/be.html")
        print("=" * 64)
        return 0
    else:
        print(f"  NO-GO — {report.summary()}")
        failed = [c for c in report.checks if not c.ok]
        for c in failed:
            print(f"    ✗ {c.name} — {c.message}")
        print("=" * 64)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
