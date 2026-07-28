"""Tests for the transactional email provider switch (Resend / SendGrid).

Covers provider resolution, the Resend delivery payload, retry/outbox
semantics on transient vs permanent failures, and dev-mode no-send.
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("SECRET_KEY", "test_secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test_anon")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test_service")
os.environ.setdefault("ANTHROPIC_API_KEY", "test_anthropic")
os.environ.setdefault("OPENAI_API_KEY", "test_openai")
os.environ.setdefault("STRIPE_SECRET_KEY", "test_stripe")
os.environ.setdefault("STRIPE_PUBLISHABLE_KEY", "test_stripe_pub")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "test_webhook")

import pytest

from app.services.email import EmailService


def _service(**overrides) -> EmailService:
    """Build an EmailService against patched settings."""
    defaults = {
        "EMAIL_ENABLED": True,
        "EMAIL_PROVIDER": "auto",
        "RESEND_API_KEY": "re_test_key",
        "SENDGRID_API_KEY": None,
        "FROM_EMAIL": "noreply@find-commonground.com",
        "FROM_NAME": "CommonGround",
    }
    defaults.update(overrides)
    with patch.multiple("app.services.email.settings", create=True, **defaults):
        return EmailService()


class _FakeResponse:
    def __init__(self, status_code: int, body: dict | None = None, text: str = ""):
        self.status_code = status_code
        self._body = body or {}
        self.text = text

    def json(self):
        return self._body


def _mock_httpx_client(response: _FakeResponse) -> MagicMock:
    """AsyncClient context manager whose post() returns the given response."""
    client = MagicMock()
    client.post = AsyncMock(return_value=response)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm, client


# =============================================================================
# Provider resolution
# =============================================================================

def test_auto_prefers_resend_when_key_present():
    service = _service()
    assert service.provider == "resend"
    assert service.enabled is True


def test_auto_falls_back_to_sendgrid_without_resend_key():
    service = _service(RESEND_API_KEY=None, SENDGRID_API_KEY="sg_test")
    assert service.provider == "sendgrid"
    assert service.enabled is True


def test_explicit_provider_overrides_auto():
    service = _service(
        EMAIL_PROVIDER="sendgrid", RESEND_API_KEY="re_x", SENDGRID_API_KEY="sg_x"
    )
    assert service.provider == "sendgrid"


def test_missing_key_for_selected_provider_disables_sending():
    service = _service(EMAIL_PROVIDER="resend", RESEND_API_KEY=None)
    assert service.enabled is False


# =============================================================================
# Resend delivery
# =============================================================================

@pytest.mark.asyncio
async def test_resend_success_posts_correct_payload():
    service = _service()
    cm, client = _mock_httpx_client(_FakeResponse(200, {"id": "msg_123"}))

    with patch("httpx.AsyncClient", return_value=cm):
        msg_id = await service._send_email(
            "pro@example.com", "Access Invitation", "<p>hi</p>"
        )

    assert msg_id == "msg_123"
    url = client.post.call_args.args[0]
    kwargs = client.post.call_args.kwargs
    assert url == "https://api.resend.com/emails"
    assert kwargs["headers"]["Authorization"] == "Bearer re_test_key"
    assert kwargs["json"]["from"] == "CommonGround <noreply@find-commonground.com>"
    assert kwargs["json"]["to"] == ["pro@example.com"]
    assert kwargs["json"]["subject"] == "Access Invitation"
    assert kwargs["json"]["html"] == "<p>hi</p>"


@pytest.mark.asyncio
async def test_resend_from_name_override():
    service = _service()
    cm, client = _mock_httpx_client(_FakeResponse(200, {"id": "msg_1"}))

    with patch("httpx.AsyncClient", return_value=cm):
        await service._send_email(
            "a@b.com", "s", "<p>x</p>", from_name_override="Jane via CommonGround"
        )

    sent_from = client.post.call_args.kwargs["json"]["from"]
    assert sent_from == "Jane via CommonGround <noreply@find-commonground.com>"


@pytest.mark.asyncio
async def test_resend_permanent_failure_spills_to_outbox_without_retry():
    service = _service()
    cm, client = _mock_httpx_client(_FakeResponse(422, text="invalid to"))
    service._spill_to_outbox = AsyncMock()

    with patch("httpx.AsyncClient", return_value=cm):
        msg_id = await service._send_email(
            "bad@example.com", "s", "<p>x</p>", outbox_category="invitation"
        )

    assert msg_id is None
    assert client.post.await_count == 1  # 4xx is not retried
    service._spill_to_outbox.assert_awaited_once()


@pytest.mark.asyncio
async def test_resend_server_error_retries_then_spills():
    service = _service()
    cm, client = _mock_httpx_client(_FakeResponse(503, text="unavailable"))
    service._spill_to_outbox = AsyncMock()

    with patch("httpx.AsyncClient", return_value=cm), \
         patch("asyncio.sleep", new=AsyncMock()):
        msg_id = await service._send_email(
            "a@b.com", "s", "<p>x</p>", outbox_category="report"
        )

    assert msg_id is None
    assert client.post.await_count == 3  # initial + 2 retries
    service._spill_to_outbox.assert_awaited_once()


@pytest.mark.asyncio
async def test_dev_mode_sends_nothing():
    service = _service(EMAIL_ENABLED=False)
    with patch("httpx.AsyncClient") as client_cls:
        msg_id = await service._send_email("a@b.com", "s", "<p>x</p>")
    assert msg_id is None
    client_cls.assert_not_called()
