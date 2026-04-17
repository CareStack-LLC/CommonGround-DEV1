"""
Wave 4-Alt — Stripe Webhook Event idempotency.

Stripe retries webhook deliveries for hours if we don't 2xx. When a
retry arrives after we already processed the event, we'd double-count
authorizations / double-issue cards. To prevent that, every event is
persisted by `stripe_event_id` as soon as it arrives. Duplicate
deliveries are detected and skipped.

This table is write-once semantically. A row written on first receive
gets `processed_at` stamped when the handler succeeds. Failures set
`error` and leave `processed_at` null so we can replay via a manual
admin endpoint later.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class StripeWebhookEvent(Base, UUIDMixin):
    __tablename__ = "stripe_webhook_events"

    stripe_event_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), index=True)

    received_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
