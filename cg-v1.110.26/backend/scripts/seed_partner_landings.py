"""
Wave 5 — Idempotently upsert the launch partner(s) so their landing
page (/foreverforward) always renders.

Root cause of the user-reported issue:
    The frontend route /{partner} fetches /api/v1/partners/{slug}. If the
    Partner row is missing or inactive, the page renders "Partner not
    found." We've hardened the endpoint against malformed JSON, but we
    still need the rows to exist in every environment.

Usage:
    cd backend
    source venv/bin/activate
    DATABASE_URL=postgresql+asyncpg://... python scripts/seed_partner_landings.py

Safe to run repeatedly — writes nothing if a partner row with the same
slug already exists with status=active. When a row exists but is inactive
or missing branding, the script updates only the fields that need it.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.partner import Partner, PartnerStatus

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


# Each entry mirrors the fields the landing endpoint returns. Keep them
# filled in with sensible defaults; the admin UI can further customize.
PARTNERS_TO_SEED: list[dict] = [
    {
        "partner_slug": "foreverforward",
        "legal_name": "Forever Forward",
        "display_name": "Forever Forward",
        "mission_statement": (
            "Forever Forward helps families move through divorce and "
            "separation with dignity. Our CommonGround partnership gives "
            "every client six months of free access to the Complete tier."
        ),
        "branding_config": {
            "logo_url": "",
            "primary_color": "#1F3A5F",
            "secondary_color": "#D4A853",
            "accent_color": "#4A90A4",
            "font_family": "system-ui",
            "hero_image_url": "",
            "tagline": (
                "Through Forever Forward, CommonGround is free for 6 months. "
                "Reduce conflict, protect your kids, focus on what matters."
            ),
        },
        "landing_config": {
            "show_mission": True,
            "show_stats": True,
            "show_testimonials": False,
            "custom_welcome_message": "",
            "faq_items": [],
            "contact_method": "email",
        },
        "code_prefix": "FF",
    },
]


async def seed_one(db: AsyncSession, payload: dict) -> tuple[str, str]:
    """Upsert a single partner. Returns (slug, action) where action is
    one of: 'created', 'activated', 'unchanged'."""
    slug = payload["partner_slug"].lower()
    result = await db.execute(select(Partner).where(Partner.partner_slug == slug))
    existing: Optional[Partner] = result.scalar_one_or_none()

    if existing is None:
        row = Partner(
            partner_slug=slug,
            legal_name=payload["legal_name"],
            display_name=payload["display_name"],
            mission_statement=payload["mission_statement"],
            branding_config=payload["branding_config"],
            landing_config=payload["landing_config"],
            code_prefix=payload.get("code_prefix"),
            status=PartnerStatus.ACTIVE,
            activation_date=datetime.utcnow(),
        )
        db.add(row)
        return slug, "created"

    changed = False
    if existing.status != PartnerStatus.ACTIVE:
        existing.status = PartnerStatus.ACTIVE
        existing.activation_date = existing.activation_date or datetime.utcnow()
        changed = True
    # Backfill empty branding / landing configs without clobbering real overrides.
    if not existing.branding_config or not existing.branding_config.get("tagline"):
        existing.branding_config = payload["branding_config"]
        changed = True
    if not existing.landing_config:
        existing.landing_config = payload["landing_config"]
        changed = True
    if not existing.mission_statement:
        existing.mission_statement = payload["mission_statement"]
        changed = True

    return slug, ("activated" if changed else "unchanged")


async def main() -> int:
    url = settings.async_database_url
    if not url:
        logger.error("DATABASE_URL is not configured.")
        return 1

    engine = create_async_engine(url)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with Session() as db:
            actions: list[tuple[str, str]] = []
            for payload in PARTNERS_TO_SEED:
                actions.append(await seed_one(db, payload))
            await db.commit()

        for slug, action in actions:
            logger.info("  [%s] %s", action, slug)
        return 0
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
