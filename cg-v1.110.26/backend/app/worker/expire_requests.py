"""
Access Request Expiration Worker

Runs daily to transition stale ProfessionalAccessRequest records
from PENDING → EXPIRED when their expires_at timestamp has passed.

Run as: python -m app.worker.expire_requests
Or schedule via Render cron alongside rolling_generator.
"""

import os
import sys
import asyncio
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)

# Initialize Sentry for worker process
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        sentry_sdk.init(
            dsn=_sentry_dsn,
            environment=os.environ.get("ENVIRONMENT", "production"),
            release="commonground-worker@expire-requests",
            traces_sample_rate=1.0,
            integrations=[SqlalchemyIntegration()],
        )
        logger.info("Sentry initialized for expire_requests worker")
    except Exception as e:
        logger.warning(f"Failed to init Sentry for worker: {e}")

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


async def run_expire_requests():
    """Main entry point for the expiration worker."""
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        print("DATABASE_URL not set. Cannot run expiration worker.")
        return

    from app.core.database import create_app_engine
    engine = create_app_engine(database_url, app_name="commonground_expire_requests")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    logger.info(f"Expire Requests worker started at {datetime.utcnow().isoformat()}")

    async with async_session() as db:
        try:
            expired_count = await _expire_stale_requests(db)
            await db.commit()
            logger.info(f"Done: {expired_count} access requests expired")
        except Exception as e:
            await db.rollback()
            logger.error(f"Expire requests worker failed: {e}", exc_info=True)
            capture_error(e)
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except Exception:
                pass

    await engine.dispose()


async def _expire_stale_requests(db: AsyncSession) -> int:
    """Transition PENDING access requests past their expires_at to EXPIRED."""
    from app.models.professional import ProfessionalAccessRequest, AccessRequestStatus

    now = datetime.utcnow()

    # Bulk update all pending requests that have passed their expiration
    result = await db.execute(
        update(ProfessionalAccessRequest)
        .where(
            ProfessionalAccessRequest.status == AccessRequestStatus.PENDING.value,
            ProfessionalAccessRequest.expires_at < now,
        )
        .values(status=AccessRequestStatus.EXPIRED.value)
    )

    expired_count = result.rowcount
    if expired_count:
        logger.info(f"Expired {expired_count} stale access requests")

    return expired_count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_expire_requests())
