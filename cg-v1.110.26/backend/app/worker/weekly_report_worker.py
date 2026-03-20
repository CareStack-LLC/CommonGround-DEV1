"""
Weekly Report Worker

Generates and sends a weekly superadmin report covering key platform
metrics (active cases, messages, exchanges, signups, etc.).

Run as: python -m app.worker.weekly_report_worker
Schedule: Render Cron, Monday 8am UTC
"""

import os
import sys
import asyncio
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

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
            release="commonground-worker@weekly-report",
            traces_sample_rate=1.0,
            integrations=[SqlalchemyIntegration()],
        )
        logger.info("Sentry initialized for weekly_report worker")
    except Exception as e:
        logger.warning(f"Failed to init Sentry for worker: {e}")

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.utils.sentry_helpers import capture_error


async def run_weekly_report():
    """Main entry point for the weekly report worker."""
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        logger.error("DATABASE_URL not set. Cannot run weekly report worker.")
        return

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(
        database_url,
        echo=False,
        connect_args={"statement_cache_size": 0}
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    logger.info(f"Weekly Report worker started at {datetime.utcnow().isoformat()}")

    async with async_session() as db:
        try:
            # Import here to avoid circular imports at module level
            from app.services.weekly_report_service import (
                generate_weekly_report,
                send_weekly_report_email,
            )

            # Generate the report data
            logger.info("Generating weekly report...")
            report_data = await generate_weekly_report(db)
            logger.info(
                f"Weekly report generated: {report_data.get('total_active_cases', 'N/A')} "
                f"active cases, {report_data.get('total_messages', 'N/A')} messages this week"
            )

            # Send the report email
            logger.info("Sending weekly report email...")
            await send_weekly_report_email(report_data)
            logger.info("Weekly report email sent successfully")

            await db.commit()
            logger.info("Weekly report worker completed successfully")

        except Exception as e:
            await db.rollback()
            logger.error(f"Weekly report worker failed: {e}", exc_info=True)
            capture_error(e)
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except Exception:
                pass

    await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_weekly_report())
