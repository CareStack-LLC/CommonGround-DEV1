"""
CLI entrypoint for the CommonGround AI-agent bug campaign.

  python -m scripts.bug_campaign.run --check                 # offline: list scenarios, no network
  python -m scripts.bug_campaign.run --mode smoke            # 1 family, S-GEO-01, real ingestion
  python -m scripts.bug_campaign.run --mode fast             # full matrix, all families
  python -m scripts.bug_campaign.run --mode soak [--day N]   # one campaign day (cron/launchd)
  python -m scripts.bug_campaign.run --teardown              # delete cohort + seeded users

Production requires: CAMPAIGN_ENV=production, CAMPAIGN_ALLOW_PRODUCTION=true, and --confirm-production.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone


def _derive_day(default: int | None) -> int:
    if default is not None:
        return default
    from .ledger import load_state

    start = (load_state() or {}).get("start_date")
    if not start:
        return 1
    try:
        start_dt = datetime.fromisoformat(start)
        delta = (datetime.now(timezone.utc) - start_dt).days
        return max(1, min(14, delta + 1))
    except Exception:
        return 1


async def _run(args) -> None:
    from .config import load_config

    cfg = load_config(confirm_production=args.confirm_production, dry_run=args.dry_run)
    cfg.validate()
    print(f"CommonGround bug campaign — {cfg.summary()}  api_base={cfg.api_base}")

    from .admin_client import AdminClient
    from .orchestrator import CampaignOrchestrator

    orch = CampaignOrchestrator(cfg)

    if args.teardown:
        from .ledger import load_state

        cohort_id = (load_state() or {}).get("cohort_id")
        if not cohort_id:
            print("No cohort in state to tear down.")
            return
        async with AdminClient(cfg) as admin:
            await admin.delete_cohort(cohort_id)
        print(f"Deleted cohort {cohort_id} (and its seeded Supabase users).")
        return

    async with AdminClient(cfg) as admin:
        if args.mode == "smoke":
            await orch.smoke(admin)
        elif args.mode == "fast":
            await orch.fast(admin)
        elif args.mode == "soak":
            await orch.soak(admin, _derive_day(args.day))
        else:
            raise SystemExit(f"unknown mode {args.mode!r}")


def _check() -> None:
    """Offline sanity: import everything and list the scenario matrix."""
    from .scenarios import ALL_SCENARIOS

    print(f"Loaded {len(ALL_SCENARIOS)} scenarios:")
    for s in ALL_SCENARIOS:
        print(f"  {s.id:<10} [{s.feature:<8}] {s.title}")
    print("\nImports OK. Configure env + CAMPAIGN_* then run --mode smoke.")


def main() -> None:
    p = argparse.ArgumentParser(description="CommonGround AI-agent bug campaign")
    p.add_argument("--mode", choices=["smoke", "fast", "soak"])
    p.add_argument("--day", type=int, default=None, help="soak day override (else derived from start_date)")
    p.add_argument("--confirm-production", action="store_true", help="required prod opt-in gate")
    p.add_argument("--dry-run", action="store_true", help="run scenarios+oracle, post nothing to the dashboard")
    p.add_argument("--teardown", action="store_true", help="delete the cohort + seeded users")
    p.add_argument("--check", action="store_true", help="offline: import + list scenarios, no network")
    args = p.parse_args()

    if args.check:
        _check()
        return
    if not args.mode and not args.teardown:
        p.error("one of --mode, --teardown, or --check is required")
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
