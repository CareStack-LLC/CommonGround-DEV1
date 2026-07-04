"""
Simulation configuration — a thin layer on top of the campaign config.

Reuses scripts.bug_campaign.config.load_config() (and therefore ALL of its
production gates: CAMPAIGN_ENV=production + CAMPAIGN_ALLOW_PRODUCTION=true +
--confirm-production) and adds the sim-specific env reads:

  SIM_START_DATE       ISO date of run day 1. Optional: when seeding, defaults
                       to today and is persisted to state + recoverable from
                       the cohort's created_at on the server.
  SIM_FAMILY_COUNT     number of families to seed/drive (default 50)
  SIM_COHORT_NAME      exact cohort name used for stateless server recovery
  SIM_ACTION_DELAY_MS  extra pacing between simulation actions (default 250)
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from scripts.bug_campaign.config import STATE_DIR, CampaignConfig, load_config

SIM_DAYS = 14
SIM_DEFAULT_COHORT_NAME = "Family Simulation — 14-Day Run"
SIM_REPORT_DIR: Path = STATE_DIR / "sim_reports"

# All simulated exchange slots are scheduled at this UTC time so that the
# daily 15:00 UTC Render cron lands inside the check-in window (±120 min).
# The *narrative* local times ("Fri 18:00") live in the slot labels/bible.
EXCHANGE_HOUR_UTC = 15
EXCHANGE_MINUTE_UTC = 40
EXCHANGE_WINDOW_BEFORE_MIN = 120
EXCHANGE_WINDOW_AFTER_MIN = 120


@dataclass
class SimConfig:
    campaign: CampaignConfig
    start_date: date | None          # None until seeded / recovered
    family_count: int = 50
    cohort_name: str = SIM_DEFAULT_COHORT_NAME
    action_delay_ms: int = 250

    def summary(self) -> str:
        sd = self.start_date.isoformat() if self.start_date else "unset"
        return (
            f"{self.campaign.summary()} sim_families={self.family_count} "
            f"sim_start={sd} cohort={self.cohort_name!r}"
        )


def load_sim_config(confirm_production: bool = False, dry_run: bool | None = None) -> SimConfig:
    """Build SimConfig from env on top of the campaign config (gates included)."""
    campaign = load_config(confirm_production=confirm_production, dry_run=dry_run)

    start_raw = os.getenv("SIM_START_DATE", "").strip()
    start: date | None = None
    if start_raw:
        try:
            start = date.fromisoformat(start_raw)
        except ValueError:
            raise SystemExit(f"SIM_START_DATE must be an ISO date (YYYY-MM-DD), got {start_raw!r}")

    cfg = SimConfig(
        campaign=campaign,
        start_date=start,
        family_count=int(os.getenv("SIM_FAMILY_COUNT", "50")),
        cohort_name=os.getenv("SIM_COHORT_NAME", SIM_DEFAULT_COHORT_NAME),
        action_delay_ms=int(os.getenv("SIM_ACTION_DELAY_MS", "250")),
    )
    SIM_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    return cfg


def clamp_day(day: int) -> int:
    return max(1, min(SIM_DAYS, day))


def derive_day(start: date, today: date | None = None) -> int:
    """Day index = (today - SIM_START_DATE).days + 1, clamped to [1..14]."""
    today = today or date.today()
    return clamp_day((today - start).days + 1)
