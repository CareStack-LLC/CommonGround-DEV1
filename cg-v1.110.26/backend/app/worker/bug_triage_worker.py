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
                categorize_issues,
                ai_triage,
                generate_sprint_plan,
                auto_resolve_issues,
                recent_critical_issues,
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

            # Step 2 -- Categorize by severity/platform (drives counts + alerts)
            categorized = categorize_issues(issues)

            # Step 3 -- Run AI triage (summary + per-issue action recommendations)
            logger.info("Running AI triage on issues...")
            triaged = await ai_triage(issues)

            # Step 4 -- Auto-resolve: mute known-noise + AI-'ignore' issues in
            #           Sentry (dry-run unless SENTRY_AUTO_RESOLVE_ENABLED).
            auto = await auto_resolve_issues(issues, triaged)
            logger.info(
                "Auto-resolve %s: %d candidate(s), %d applied",
                "DRY-RUN" if auto["dry_run"] else "LIVE",
                auto["candidate_count"], auto["applied_count"],
            )

            # Step 5 -- Generate + persist the sprint plan
            sprint_plan = await generate_sprint_plan(triaged)
            combined = {**categorized, **triaged}  # counts + AI summary for storage
            sprint_id = await save_sprint(db, sprint_plan, combined)
            await db.commit()
            logger.info("Sprint plan saved (id=%s)", sprint_id)

            # Step 6 -- Email summary (highlights newly-seen critical/high issues)
            new_criticals = recent_critical_issues(categorized, hours=48)
            await _send_triage_summary_email(categorized, sprint_plan, auto, new_criticals)
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


async def _send_triage_summary_email(
    categorized: dict, sprint_plan: dict, auto: dict, new_criticals: list
):
    """Summary email: counts, newly-seen criticals, auto-mute actions, sprint plan."""
    today = datetime.utcnow().strftime('%Y-%m-%d')
    subject = (
        f"Bug Triage - {today} | {categorized.get('total', 0)} open"
        f"{f' | {len(new_criticals)} NEW critical/high' if new_criticals else ''}"
    )

    body_lines = [
        f"Bug Triage Report - {today}",
        f"Open issues: {categorized.get('total', 0)}  "
        f"(critical {categorized.get('critical', 0)}, high {categorized.get('high', 0)}, "
        f"medium {categorized.get('medium', 0)}, low {categorized.get('low', 0)})",
        f"User-reported: {categorized.get('user_reported', 0)}  |  "
        f"frontend {categorized.get('frontend', 0)} / backend {categorized.get('backend', 0)}",
        "",
    ]

    if new_criticals:
        body_lines += [f"⚠ NEW critical/high in last 48h ({len(new_criticals)}):", "-" * 40]
        for i, issue in enumerate(new_criticals[:10], 1):
            body_lines.append(
                f"  {i}. [{issue.get('_bucket', '').upper()}] {issue.get('title', 'Untitled')} "
                f"(events {issue.get('count', 0)}, users {issue.get('user_count', 0)})"
            )
        body_lines.append("")

    mode = "APPLIED" if not auto.get("dry_run") else "would mute (dry-run)"
    muted_note = f", {auto.get('applied_count', 0)} muted" if not auto.get("dry_run") else ""
    body_lines += [
        f"Auto-resolve: {auto.get('candidate_count', 0)} noise/ignore issue(s) {mode}{muted_note}.",
        "",
        f"Sprint plan: {sprint_plan.get('total_items', 0)} to fix, "
        f"{len(sprint_plan.get('deferred', []))} deferred, "
        f"{len(sprint_plan.get('investigate', []))} to investigate.",
        "",
        "Top 3: " + "; ".join(sprint_plan.get("top_3", [])[:3]),
    ]

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
