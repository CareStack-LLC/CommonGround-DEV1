"""
Email outbox dispatcher — re-sends critical emails that exhausted
EmailService's in-process retries.

Runs from the APScheduler tick every 2 minutes (see services/scheduler.py),
deduplicated across web instances with redis_lock. Rows are claimed with
FOR UPDATE SKIP LOCKED so even concurrent dispatchers never double-send.

Backoff: next_attempt_at = now + 5min * 2^attempts. Dead-letter after
MAX_ATTEMPTS with a Sentry capture (a dead row means a human should look).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_outbox import EmailOutbox, OutboxStatus
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
BATCH_SIZE = 20
BASE_BACKOFF_MINUTES = 5


class EmailOutboxDead(Exception):
    """Synthetic exception for Sentry when an outbox row dead-letters."""


async def dispatch_pending_emails(db: AsyncSession) -> dict:
    """Send due pending outbox rows. Returns a summary dict."""
    # Imported here to avoid a circular import (email.py spills into the
    # outbox; the dispatcher drains it through the same service).
    from app.services.email import email_service

    now = datetime.utcnow()
    result = await db.execute(
        select(EmailOutbox)
        .where(
            EmailOutbox.status == OutboxStatus.PENDING,
            EmailOutbox.next_attempt_at <= now,
        )
        .order_by(EmailOutbox.next_attempt_at)
        .limit(BATCH_SIZE)
        .with_for_update(skip_locked=True)
    )
    rows = result.scalars().all()

    sent = failed = dead = 0
    for row in rows:
        row.attempts += 1
        try:
            # No outbox_category here — a failure must not re-insert a new
            # outbox row; this row already tracks the retry state.
            message_id = await email_service._send_email(
                row.to_email,
                row.subject,
                row.html_body,
                from_name_override=row.from_name_override,
            )
        except Exception as exc:  # noqa: BLE001 — never kill the batch
            message_id = None
            row.last_error = str(exc)[:2000]

        if message_id:
            row.status = OutboxStatus.SENT
            row.sendgrid_message_id = message_id
            row.sent_at = datetime.utcnow()
            sent += 1
        elif row.attempts >= MAX_ATTEMPTS:
            row.status = OutboxStatus.DEAD
            dead += 1
            capture_error(EmailOutboxDead(
                f"email_outbox row {row.id} ({row.category}) to "
                f"{row.to_email} dead after {row.attempts} attempts: "
                f"{row.last_error}"
            ))
        else:
            row.next_attempt_at = datetime.utcnow() + timedelta(
                minutes=BASE_BACKOFF_MINUTES * (2 ** row.attempts)
            )
            failed += 1

    await db.commit()

    summary = {"claimed": len(rows), "sent": sent, "retrying": failed, "dead": dead}
    if rows:
        logger.info("email_outbox dispatcher: %s", summary)
    return summary
