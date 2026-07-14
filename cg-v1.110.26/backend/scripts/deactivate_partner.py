"""
Deactivate a partner so its public landing page (/{slug}) stops rendering.

Sets the partner's status to INACTIVE (reversible). Combined with the
partners endpoint now returning 404 for non-ACTIVE partners, this removes the
partner from the public site without deleting any data (grant codes,
redemptions, and metrics are preserved).

Usage (run where the production DATABASE_URL resolves, e.g. the Render shell):
    cd backend
    source venv/bin/activate
    DATABASE_URL=postgresql+asyncpg://... python scripts/deactivate_partner.py leftright4u

Pass --delete to hard-delete instead of deactivate (only if you're sure — this
cascades per the DB's FK rules).
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.partner import Partner, PartnerStatus

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


async def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    hard_delete = "--delete" in sys.argv
    slug = (args[0] if args else "leftright4u").lower()

    url = settings.async_database_url
    if not url:
        logger.error("DATABASE_URL is not configured.")
        return 1

    engine = create_async_engine(url)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with Session() as db:
            partner = (
                await db.execute(select(Partner).where(Partner.partner_slug == slug))
            ).scalar_one_or_none()

            if partner is None:
                logger.info("[%s] no row found — nothing to do.", slug)
                return 0

            if hard_delete:
                await db.delete(partner)
                await db.commit()
                logger.info("[%s] DELETED (id=%s).", slug, partner.id)
                return 0

            if partner.status == PartnerStatus.INACTIVE:
                logger.info("[%s] already INACTIVE — nothing to do.", slug)
                return 0

            partner.status = PartnerStatus.INACTIVE
            await db.commit()
            logger.info("[%s] deactivated (status=INACTIVE, id=%s).", slug, partner.id)
            return 0
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
