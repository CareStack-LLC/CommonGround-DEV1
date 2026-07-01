"""
Campaign configuration + production safety gates.

Loaded from environment. Refuses to touch production unless the operator has
explicitly opted in via three independent gates (env + env + CLI flag).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Hosts we treat as production. Hitting any of these requires explicit opt-in.
PRODUCTION_HOSTS = {
    "commonground-api-a0fr.onrender.com",
    "www.find-commonground.com",
    "find-commonground.com",
}

STATE_DIR = Path(__file__).resolve().parent / "state"


def _envbool(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


def _host_of(url: str) -> str:
    from urllib.parse import urlparse

    return (urlparse(url).hostname or "").lower()


@dataclass
class CampaignConfig:
    # --- Target ---
    base_url: str = "http://localhost:8000"
    api_prefix: str = "/api/v1"
    target: str = "development"  # development | staging | production

    # --- Scale ---
    family_count: int = 4

    # --- Admin (needed to create cohort / seed / assign testers) ---
    admin_email: str | None = None
    admin_password: str | None = None

    # --- AI ---
    ai_enabled: bool = True
    anthropic_api_key: str | None = None
    ai_daily_token_budget: int = 200_000
    narrator_model: str = "claude-haiku-4-5-20251001"
    judge_model: str = "claude-opus-4-8"

    # --- Behaviour ---
    dry_run: bool = False            # run scenarios + Oracle, post NOTHING
    request_delay_ms: int = 150      # cushion under per-IP rate limits
    http_timeout_s: float = 30.0
    mapbox_enabled: bool = True      # skip geocode asserts if False

    # --- Prod opt-in gates (all three required to hit a production host) ---
    allow_production: bool = False   # env CAMPAIGN_ALLOW_PRODUCTION
    confirm_production: bool = False # CLI --confirm-production

    cohort_name: str = "Custody & Handoff — 2-Week Campaign"

    @property
    def api_base(self) -> str:
        return self.base_url.rstrip("/") + self.api_prefix

    @property
    def host(self) -> str:
        return _host_of(self.base_url)

    @property
    def targets_production(self) -> bool:
        return self.host in PRODUCTION_HOSTS or self.target == "production"

    def validate(self) -> None:
        """Raise a loud error if the config is unsafe. Call before any run."""
        errors: list[str] = []

        if not self.base_url.startswith(("http://", "https://")):
            errors.append(f"base_url must be an http(s) URL, got {self.base_url!r}")

        if self.targets_production:
            gates = {
                "CAMPAIGN_TARGET=production": self.target == "production",
                "CAMPAIGN_ALLOW_PRODUCTION=true": self.allow_production,
                "--confirm-production flag": self.confirm_production,
            }
            missing = [k for k, ok in gates.items() if not ok]
            if missing:
                errors.append(
                    "Refusing to run against PRODUCTION host "
                    f"'{self.host}'. Missing opt-in gate(s): {', '.join(missing)}."
                )
            if self.family_count > 6:
                errors.append(
                    f"family_count={self.family_count} exceeds the prod cap of 6."
                )

        if self.target not in {"development", "staging", "production"}:
            errors.append(f"CAMPAIGN_ENV must be development|staging|production, got {self.target!r}")

        if not self.admin_email or not self.admin_password:
            errors.append("CAMPAIGN_ADMIN_EMAIL and CAMPAIGN_ADMIN_PASSWORD are required (a superadmin login).")

        if errors:
            raise SystemExit(
                "\n".join(["", "❌ Campaign config rejected:", *[f"  • {e}" for e in errors], ""])
            )

    def summary(self) -> str:
        flags = []
        if self.dry_run:
            flags.append("DRY-RUN")
        if self.targets_production:
            flags.append("PRODUCTION")
        if not self.ai_enabled or not self.anthropic_api_key:
            flags.append("AI-OFF")
        if not self.mapbox_enabled:
            flags.append("NO-MAPBOX")
        tag = f" [{' '.join(flags)}]" if flags else ""
        return f"target={self.target} host={self.host} families={self.family_count}{tag}"


def load_config(confirm_production: bool = False, dry_run: bool | None = None) -> CampaignConfig:
    """Build a CampaignConfig from environment variables."""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY") or None
    cfg = CampaignConfig(
        base_url=os.getenv("CAMPAIGN_BASE_URL", "http://localhost:8000"),
        target=os.getenv("CAMPAIGN_ENV", os.getenv("CAMPAIGN_TARGET", "development")),
        family_count=int(os.getenv("CAMPAIGN_FAMILY_COUNT", "4")),
        admin_email=os.getenv("CAMPAIGN_ADMIN_EMAIL"),
        admin_password=os.getenv("CAMPAIGN_ADMIN_PASSWORD"),
        ai_enabled=_envbool("CAMPAIGN_AI_ENABLED", True),
        anthropic_api_key=anthropic_key,
        ai_daily_token_budget=int(os.getenv("CAMPAIGN_AI_BUDGET", "200000")),
        dry_run=_envbool("CAMPAIGN_DRY_RUN", False) if dry_run is None else dry_run,
        request_delay_ms=int(os.getenv("CAMPAIGN_REQ_DELAY_MS", "150")),
        mapbox_enabled=_envbool("CAMPAIGN_MAPBOX_ENABLED", True),
        allow_production=_envbool("CAMPAIGN_ALLOW_PRODUCTION", False),
        confirm_production=confirm_production,
        cohort_name=os.getenv("CAMPAIGN_COHORT_NAME", "Custody & Handoff — 2-Week Campaign"),
    )
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    return cfg
