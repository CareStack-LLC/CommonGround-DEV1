"""
Bug Triage Worker

Fetches recent Sentry issues, runs AI-powered triage to prioritise them,
generates a sprint plan, persists it to the database, and sends a summary
email with the top issues.

Run as: python -m app.worker.bug_triage_worker
Schedule: Render Cron, every 2 days (Monday/Wednesday/Friday)
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
            release="commonground-worker@bug-triage",
            traces_sample_rate=1.0,
            integrations=[SqlalchemyIntegration()],
        )
        logger.info("Sentry initialized for bug_triage worker")
    except Exception as e:
        logger.warning(f"Failed to init Sentry for worker: {e}")

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.utils.sentry_helpers import capture_error


async def run_bug_triage():
    """Main entry point for the bug triage worker."""
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        logger.error("DATABASE_URL not set. Cannot run bug triage worker.")
        return

    from app.core.database import create_app_engine
    engine = create_app_engine(database_url, app_name="commonground_bug_triage")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    logger.info(f"Bug Triage worker started at {datetime.utcnow().isoformat()}")

    async with async_session() as db:
        try:
            from app.services.sentry_triage_service import (
                fetch_sentry_issues,
                ai_triage,
                generate_sprint_plan,
                save_sprint,
            )

            # Step 1 -- Fetch recent Sentry issues
            logger.info("Fetching Sentry issues...")
            issues = await fetch_sentry_issues()
            logger.info(f"Fetched {len(issues)} Sentry issues")

            if not issues:
                logger.info("No new Sentry issues found. Exiting.")
                await engine.dispose()
                return

            # Step 2 -- Run AI triage on each issue
            logger.info("Running AI triage on issues...")
            triaged_issues = await ai_triage(issues)
            logger.info(f"AI triage complete: {len(triaged_issues)} issues triaged")

            # Step 3 -- Generate a sprint plan from triaged issues
            logger.info("Generating sprint plan...")
            sprint_plan = await generate_sprint_plan(triaged_issues)
            logger.info(
                f"Sprint plan generated with {len(sprint_plan.get('tasks', []))} tasks"
            )

            # Step 4 -- Persist the sprint plan to the database
            logger.info("Saving sprint plan to database...")
            sprint_record = await save_sprint(db, sprint_plan)
            await db.commit()
            logger.info(f"Sprint plan saved (id={getattr(sprint_record, 'id', 'N/A')})")

            # Step 5 -- Send summary email with top issues
            logger.info("Sending bug triage summary email...")
            await _send_triage_summary_email(triaged_issues, sprint_plan)
            logger.info("Bug triage summary email sent successfully")

            logger.info("Bug triage worker completed successfully")

        except Exception as e:
            await db.rollback()
            logger.error(f"Bug triage worker failed: {e}", exc_info=True)
            capture_error(e)
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except Exception:
                pass

    await engine.dispose()


async def _send_triage_summary_email(triaged_issues: list, sprint_plan: dict):
    """Send a summary email with top triaged issues and sprint plan overview."""
    from app.services.sentry_triage_service import generate_sprint_plan  # noqa: F811

    # Build a concise summary of the top issues (up to 10)
    top_issues = sorted(
        triaged_issues,
        key=lambda i: i.get("priority", 999),
    )[:10]

    subject = (
        f"Bug Triage Report - {datetime.utcnow().strftime('%Y-%m-%d')} | "
        f"{len(triaged_issues)} issues triaged"
    )

    body_lines = [
        f"Bug Triage Report - {datetime.utcnow().strftime('%Y-%m-%d')}",
        f"Total issues triaged: {len(triaged_issues)}",
        f"Sprint tasks generated: {len(sprint_plan.get('tasks', []))}",
        "",
        "Top Issues:",
        "-" * 40,
    ]
    for idx, issue in enumerate(top_issues, 1):
        body_lines.append(
            f"  {idx}. [{issue.get('severity', 'unknown').upper()}] "
            f"{issue.get('title', 'Untitled')} "
            f"(events: {issue.get('event_count', 'N/A')})"
        )

    body = "\n".join(body_lines)

    # Use a simple email utility; fall back to logging if unavailable
    try:
        from app.services.email_service import send_admin_email
        await send_admin_email(subject=subject, body=body)
    except ImportError:
        logger.info(f"Email service not available. Summary:\n{body}")
    except Exception as exc:
        logger.warning(f"Failed to send triage email: {exc}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_bug_triage())
