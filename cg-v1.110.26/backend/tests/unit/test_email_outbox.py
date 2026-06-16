"""Reliability batch 1: email outbox spillover.

A critical email (tagged with outbox_category) that exhausts in-process
retries must be persisted to email_outbox instead of silently dropped;
un-tagged emails keep the old drop-on-failure behavior.
"""

import pytest

from app.models.email_outbox import EmailOutbox
from app.services.email import email_service


class _BoomSendGrid:
    def __init__(self, api_key):
        pass

    def send(self, message):
        raise ConnectionError("sendgrid unreachable")


class _FakeSession:
    def __init__(self, store):
        self.store = store
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    def add(self, obj):
        self.store.append(obj)

    async def commit(self):
        self.committed = True


@pytest.fixture
def outbox_store(monkeypatch):
    """Force production-mode send, failing SendGrid, instant retries,
    and capture outbox inserts."""
    store: list = []

    monkeypatch.setattr(email_service, "enabled", True)
    monkeypatch.setattr(email_service, "api_key", "test-key")
    monkeypatch.setattr("sendgrid.SendGridAPIClient", _BoomSendGrid)

    async def _no_sleep(_seconds):
        return None

    monkeypatch.setattr("asyncio.sleep", _no_sleep)

    import app.core.database as database
    monkeypatch.setattr(database, "AsyncSessionLocal", lambda: _FakeSession(store))
    return store


@pytest.mark.asyncio
async def test_tagged_email_spills_to_outbox(outbox_store):
    result = await email_service._send_email(
        "parent@example.com",
        "You're invited",
        "<p>hello</p>",
        outbox_category="case_invitation",
    )
    assert result is None
    assert len(outbox_store) == 1
    row = outbox_store[0]
    assert isinstance(row, EmailOutbox)
    assert row.to_email == "parent@example.com"
    assert row.category == "case_invitation"
    assert row.status == "pending"
    assert row.html_body == "<p>hello</p>"
    assert row.next_attempt_at is not None
    assert "sendgrid unreachable" in (row.last_error or "")


@pytest.mark.asyncio
async def test_untagged_email_does_not_spill(outbox_store):
    result = await email_service._send_email(
        "someone@example.com",
        "Newsletter",
        "<p>marketing</p>",
    )
    assert result is None
    assert outbox_store == []
