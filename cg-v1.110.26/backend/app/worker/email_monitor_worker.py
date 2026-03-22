"""
Email Monitor Worker

Fetches new emails from Gmail, runs AI analysis on each, and periodically
generates and sends a digest.  Urgent emails are flagged immediately.

Run as: python -m app.worker.email_monitor_worker
Schedule: Render Cron every 5 minutes, or as a long-running process
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

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
            release="commonground-worker@email-monitor",
            traces_sample_rate=1.0,
            integrations=[SqlalchemyIntegration()],
        )
        logger.info("Sentry initialized for email_monitor worker")
    except Exception as e:
        logger.warning(f"Failed to init Sentry for worker: {e}")

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.utils.sentry_helpers import capture_error

# Digest interval in hours
DIGEST_INTERVAL_HOURS = 6


async def run_email_monitor():
    """Main entry point for the email monitor worker."""
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        logger.error("DATABASE_URL not set. Cannot run email monitor worker.")
        return

    from app.core.database import create_app_engine
    engine = create_app_engine(database_url, app_name="commonground_email_monitor")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    logger.info(f"Email Monitor worker started at {datetime.utcnow().isoformat()}")

    async with async_session() as db:
        try:
            from app.services.gmail_monitor_service import (
                fetch_new_emails,
                analyze_email,
                generate_digest,
            )

            # Step 1 -- Fetch new emails since the last check
            logger.info("Fetching new emails...")
            new_emails = await fetch_new_emails(db)
            logger.info(f"Fetched {len(new_emails)} new email(s)")

            # Step 2 -- Analyse each email with AI
            urgent_emails = []
            analyzed_count = 0
            for email in new_emails:
                try:
                    analysis = await analyze_email(db, email)
                    analyzed_count += 1

                    # Flag urgent emails immediately
                    if analysis.get("is_urgent"):
                        urgent_emails.append({"email": email, "analysis": analysis})
                        logger.warning(
                            f"URGENT email detected: "
                            f"subject={email.get('subject', 'N/A')}, "
                            f"reason={analysis.get('urgency_reason', 'unknown')}"
                        )
                except Exception as email_err:
                    logger.error(
                        f"Failed to analyze email "
                        f"(id={email.get('id', 'unknown')}): {email_err}",
                        exc_info=True,
                    )

            logger.info(f"Analyzed {analyzed_count}/{len(new_emails)} emails")

            # Notify about urgent emails right away
            if urgent_emails:
                await _notify_urgent_emails(urgent_emails)

            await db.commit()

            # Step 3 -- Check whether it is time to send a digest
            if await _should_send_digest(db):
                logger.info("Digest interval elapsed -- generating digest...")
                digest = await generate_digest(db)
                await _send_digest_email(digest)
                await _update_last_digest_time(db)
                await db.commit()
                logger.info("Digest email sent successfully")
            else:
                logger.info("Digest not due yet; skipping.")

            logger.info("Email monitor worker completed successfully")

        except Exception as e:
            await db.rollback()
            logger.error(f"Email monitor worker failed: {e}", exc_info=True)
            capture_error(e)
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except Exception:
                pass

    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _should_send_digest(db: AsyncSession) -> bool:
    """Return True if >= DIGEST_INTERVAL_HOURS have passed since the last digest."""
    try:
        from app.models.worker_state import WorkerState

        result = await db.execute(
            select(WorkerState).where(WorkerState.key == "email_monitor_last_digest")
        )
        state = result.scalar_one_or_none()
        if state is None:
            return True  # Never sent before

        last_digest = state.value_timestamp
        if last_digest is None:
            return True

        elapsed = datetime.utcnow() - last_digest
        return elapsed >= timedelta(hours=DIGEST_INTERVAL_HOURS)
    except ImportError:
        # WorkerState model not yet created -- fall back to env-based flag
        logger.info("WorkerState model not available; defaulting to send digest")
        return True
    except Exception as exc:
        logger.warning(f"Error checking digest time: {exc}")
        return False


async def _update_last_digest_time(db: AsyncSession):
    """Persist the current UTC time as the last digest timestamp."""
    try:
        from app.models.worker_state import WorkerState

        result = await db.execute(
            select(WorkerState).where(WorkerState.key == "email_monitor_last_digest")
        )
        state = result.scalar_one_or_none()
        now = datetime.utcnow()
        if state:
            state.value_timestamp = now
        else:
            db.add(WorkerState(key="email_monitor_last_digest", value_timestamp=now))
    except ImportError:
        logger.info("WorkerState model not available; skipping digest time update")
    except Exception as exc:
        logger.warning(f"Failed to update last digest time: {exc}")


async def _notify_urgent_emails(urgent_emails: list):
    """Send an immediate notification for urgent emails."""
    subject = (
        f"URGENT: {len(urgent_emails)} urgent email(s) detected - "
        f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    )

    body_lines = ["The following urgent emails require immediate attention:", ""]
    for idx, item in enumerate(urgent_emails, 1):
        email = item["email"]
        analysis = item["analysis"]
        body_lines.append(
            f"  {idx}. Subject: {email.get('subject', 'N/A')}\n"
            f"     From: {email.get('sender', 'N/A')}\n"
            f"     Reason: {analysis.get('urgency_reason', 'N/A')}"
        )
    body = "\n".join(body_lines)

    try:
        from app.services.email_service import send_admin_email
        await send_admin_email(subject=subject, body=body)
        logger.info(f"Urgent email notification sent ({len(urgent_emails)} emails)")
    except ImportError:
        logger.info(f"Email service not available. Urgent summary:\n{body}")
    except Exception as exc:
        logger.warning(f"Failed to send urgent email notification: {exc}")


async def _send_digest_email(digest: dict):
    """Send the periodic email digest."""
    subject = (
        f"Email Digest - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | "
        f"{digest.get('total_emails', 0)} emails processed"
    )

    body_lines = [
        f"Email Digest - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        f"Total emails processed: {digest.get('total_emails', 0)}",
        f"Urgent: {digest.get('urgent_count', 0)}",
        f"Action required: {digest.get('action_required_count', 0)}",
        f"Informational: {digest.get('informational_count', 0)}",
        "",
        "Summary:",
        digest.get("summary", "No summary available."),
    ]
    body = "\n".join(body_lines)

    try:
        from app.services.email_service import send_admin_email
        await send_admin_email(subject=subject, body=body)
    except ImportError:
        logger.info(f"Email service not available. Digest:\n{body}")
    except Exception as exc:
        logger.warning(f"Failed to send digest email: {exc}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_email_monitor())
