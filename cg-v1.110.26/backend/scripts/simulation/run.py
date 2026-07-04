"""
CLI entrypoint for the 14-day family simulation.

  python -m scripts.simulation.run --mode seed                 # day 1: seed cohort + day-1 script
  python -m scripts.simulation.run --mode day [--day N]        # run one sim day + daily report
  python -m scripts.simulation.run --mode report [--day N]     # regenerate a day's report only
  python -m scripts.simulation.selftest                        # offline determinism check

Production requires the campaign gates verbatim: CAMPAIGN_ENV=production,
CAMPAIGN_ALLOW_PRODUCTION=true, and --confirm-production.
mode=day auto-derives the day from SIM_START_DATE (state / cohort-recoverable),
so a missed or re-run cron day is harmless and idempotent.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import date


async def _run(args: argparse.Namespace) -> None:
    from scripts.bug_campaign.admin_client import AdminClient

    from .config import derive_day, load_sim_config
    from .report import generate_daily_report
    from .runner import SimulationRunner

    sim = load_sim_config(confirm_production=args.confirm_production, dry_run=args.dry_run)
    sim.campaign.validate()  # campaign production gates, reused verbatim
    print(f"CommonGround family simulation — {sim.summary()}  "
          f"api_base={sim.campaign.api_base}")

    runner = SimulationRunner(sim)

    async with AdminClient(sim.campaign) as admin:
        if args.mode == "seed":
            # Day 1 = seed: cohort + families, then the day-1 script
            # (agreements, recurring exchange templates, initial events,
            # obligations, intro messages).
            await runner.ensure_cohort(admin)
            start = runner.resolve_start_date()
            await runner.run_day(admin, 1)
            await generate_daily_report(sim, 1, start, admin=admin)
            return

        if args.mode == "day":
            await runner.ensure_cohort(admin)  # also recovers sim_start_date
            start = runner.resolve_start_date()
            day = args.day if args.day is not None else derive_day(start, date.today())
            await runner.run_day(admin, day)
            await generate_daily_report(sim, day, start, admin=admin)
            return

        if args.mode == "report":
            await runner.ensure_cohort(admin)
            start = runner.resolve_start_date()
            day = args.day if args.day is not None else derive_day(start, date.today())
            await generate_daily_report(sim, day, start,
                                        admin=None if args.offline else admin)
            return

    raise SystemExit(f"unknown mode {args.mode!r}")


def main() -> None:
    p = argparse.ArgumentParser(description="CommonGround 14-day family simulation")
    p.add_argument("--mode", choices=["seed", "day", "report"], required=True)
    p.add_argument("--day", type=int, default=None,
                   help="sim day override 1..14 (else derived from SIM_START_DATE)")
    p.add_argument("--confirm-production", action="store_true",
                   help="required prod opt-in gate (with CAMPAIGN_ENV + CAMPAIGN_ALLOW_PRODUCTION)")
    p.add_argument("--dry-run", action="store_true",
                   help="compile + iterate the day plan, POST nothing")
    p.add_argument("--offline", action="store_true",
                   help="report mode: skip read-only API cross-checks")
    args = p.parse_args()
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
