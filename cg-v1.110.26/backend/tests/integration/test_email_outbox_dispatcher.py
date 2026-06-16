"""Reliability batch 1: email outbox dispatcher backoff/dead-letter."""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import delete, select

from app.models.email_outbox import EmailOutbox, OutboxStatus
from app.services.email_outbox_dispatcher import MAX_ATTEMPTS, dispatch_pending_emails

pytestmark = pytest.mark.asyncio


def _row(unique_id, **overrides):
    defaults = dict(
        id=unique_id(),
        to_email="outbox-test@example.com",
        subject="Test outbox",
        html_body="<p>hi</p>",
        category="case_invitation",
        status=OutboxStatus.PENDING,
        attempts=0,
        next_attempt_at=datetime.utcnow() - timedelta(minutes=1),
    )
    defaults.update(overrides)
    return EmailOutbox(**defaults)


async def _cleanup(session_factory):
    async with session_factory() as db:
        await db.execute(delete(EmailOutbox).where(
            EmailOutbox.to_email == "outbox-test@example.com"))
        await db.commit()


async def test_dispatcher_sends_due_rows_and_backs_off_failures(
    session_factory, unique_id, monkeypatch
):
    import app.services.email as email_mod

    sent_to: list[str] = []

    async def _send_ok(to_email, subject, html_body, **kwargs):
        sent_to.append(to_email)
        return "sg-message-id"

    monkeypatch.setattr(email_mod.email_service, "_send_email", _send_ok)

    ids = {"due": unique_id(), "future": unique_id()}
    async with session_factory() as db:
        db.add(_row(lambda: ids["due"]))
        db.add(_row(lambda: ids["future"],
                    next_attempt_at=datetime.utcnow() + timedelta(hours=1)))
        await db.commit()

    try:
        async with session_factory() as db:
            summary = await dispatch_pending_emails(db)

        assert summary["sent"] >= 1
        async with session_factory() as db:
            due = (await db.execute(select(EmailOutbox).where(
                EmailOutbox.id == ids["due"]))).scalar_one()
            future = (await db.execute(select(EmailOutbox).where(
                EmailOutbox.id == ids["future"]))).scalar_one()
        assert due.status == OutboxStatus.SENT
        assert due.sendgrid_message_id == "sg-message-id"
        assert due.sent_at is not None
        # Not yet due — untouched
        assert future.status == OutboxStatus.PENDING
        assert future.attempts == 0
    finally:
        await _cleanup(session_factory)


async def test_dispatcher_dead_letters_after_max_attempts(
    session_factory, unique_id, monkeypatch
):
    import app.services.email as email_mod
    import app.services.email_outbox_dispatcher as dispatcher_mod

    async def _send_fail(*args, **kwargs):
        return None

    monkeypatch.setattr(email_mod.email_service, "_send_email", _send_fail)

    captured = []
    monkeypatch.setattr(
        dispatcher_mod, "capture_error", lambda exc, **kw: captured.append(exc)
    )

    rid = unique_id()
    async with session_factory() as db:
        db.add(_row(lambda: rid, attempts=MAX_ATTEMPTS - 1,
                    last_error="prior failure"))
        await db.commit()

    try:
        async with session_factory() as db:
            await dispatch_pending_emails(db)

        async with session_factory() as db:
            row = (await db.execute(select(EmailOutbox).where(
                EmailOutbox.id == rid))).scalar_one()
        assert row.status == OutboxStatus.DEAD
        assert row.attempts == MAX_ATTEMPTS
        assert len(captured) == 1

        # Retry path: a fresh failure below the cap gets exponential backoff
        rid2 = unique_id()
        async with session_factory() as db:
            db.add(_row(lambda: rid2, attempts=0))
            await db.commit()
            await dispatch_pending_emails(db)
        async with session_factory() as db:
            row2 = (await db.execute(select(EmailOutbox).where(
                EmailOutbox.id == rid2))).scalar_one()
        assert row2.status == OutboxStatus.PENDING
        assert row2.attempts == 1
        assert row2.next_attempt_at > datetime.utcnow() + timedelta(minutes=5)
    finally:
        await _cleanup(session_factory)
