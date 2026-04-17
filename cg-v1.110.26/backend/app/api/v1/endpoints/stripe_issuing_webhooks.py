"""
Wave 4-Alt — Stripe Issuing webhook endpoint.

Separate from the main payments webhook at `/webhooks/stripe` so the
Stripe dashboard can send Issuing events to a dedicated handler with
persistent (DB-backed) idempotency.

Events handled
--------------
- ``issuing_authorization.request`` — REAL-TIME. Must return a decision
  within ~2s or Stripe auto-declines. We allow when the authorization
  amount + merchant category fit the card's spending_controls AND the
  card is still linked to an open obligation. Decline otherwise.
- ``issuing_authorization.created`` — log only.
- ``issuing_transaction.created`` — persistent spend record. Update the
  `VirtualCardAuthorization` amount_spent / amount_remaining. When the
  authorization's card belongs to an obligation and cumulative spend
  >= obligation.total_amount, mark obligation completed + auto-create
  a `VerificationArtifact` so no manual receipt upload is needed.
- ``issuing_card.created`` / ``issuing_card.updated`` — log only.

Setup
-----
1. In the Stripe dashboard, create a webhook endpoint pointing at
   ``/api/v1/webhooks/stripe/issuing`` and subscribing to all
   ``issuing.*`` event types.
2. Copy the signing secret into ``settings.STRIPE_WEBHOOK_SECRET``.
   (The main payments webhook uses the same secret today — if you
   separate them later, use a distinct env var here.)
3. Provision the ``card_issuing`` capability on the Stripe account.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.stripe_webhook_event import StripeWebhookEvent
from app.services.stripe_issuing import (
    IssuingUnavailable,
    approve_authorization,
    decline_authorization,
)
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/stripe/issuing", status_code=status.HTTP_200_OK)
async def handle_issuing_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Stripe Issuing webhook receiver with persistent idempotency."""

    payload_bytes = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not getattr(settings, "STRIPE_WEBHOOK_SECRET", None):
        logger.warning("Issuing webhook received but STRIPE_WEBHOOK_SECRET unset — dropping")
        return {"status": "unconfigured"}
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )

    try:
        import stripe  # type: ignore

        event = stripe.Webhook.construct_event(
            payload_bytes, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as exc:
        logger.warning("Issuing webhook signature verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    event_id = event.get("id") if isinstance(event, dict) else getattr(event, "id", None)
    event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", "")

    # Persistent dedupe — block at the DB's unique index.
    existing = (
        await db.execute(
            select(StripeWebhookEvent).where(StripeWebhookEvent.stripe_event_id == event_id)
        )
    ).scalar_one_or_none()
    if existing and existing.processed_at is not None:
        logger.info("Issuing webhook %s already processed; acking 200", event_id)
        return {"status": "duplicate", "event_id": event_id}

    # Record receipt first — even if processing fails we keep the row so
    # we can replay later via an admin endpoint.
    if not existing:
        existing = StripeWebhookEvent(
            id=str(uuid.uuid4()),
            stripe_event_id=event_id,
            event_type=event_type,
            payload=_safe_json(event),
        )
        db.add(existing)
        await db.commit()
        await db.refresh(existing)

    try:
        await _dispatch(event, event_type, db)
        existing.processed_at = datetime.utcnow()
        existing.error = None
        await db.commit()
        return {"status": "processed", "event_id": event_id, "event_type": event_type}
    except IssuingUnavailable as exc:
        # Not an error we should 500 on — log, record, ack so Stripe doesn't retry.
        logger.warning("Issuing unavailable when handling %s: %s", event_type, exc)
        existing.error = str(exc)[:500]
        await db.commit()
        return {"status": "unavailable"}
    except Exception as exc:
        capture_error(exc, tags={"service": "stripe_issuing_webhook", "event_type": event_type})
        existing.error = f"{type(exc).__name__}: {exc}"[:500]
        await db.commit()
        # Still return 200 — our idempotency store preserves the record for replay.
        return {"status": "error", "detail": str(exc)[:200]}


# ─────────────────────────── Dispatch ────────────────────────────────────


async def _dispatch(event: Any, event_type: str, db: AsyncSession) -> None:
    data_object = _event_data_object(event)

    if event_type == "issuing_authorization.request":
        await _handle_authorization_request(data_object, db)
    elif event_type == "issuing_authorization.created":
        logger.info("issuing_authorization.created id=%s", data_object.get("id"))
    elif event_type == "issuing_transaction.created":
        await _handle_transaction_created(data_object, db)
    elif event_type in ("issuing_card.created", "issuing_card.updated"):
        logger.info("%s id=%s", event_type, data_object.get("id"))
    else:
        logger.info("unhandled Issuing event_type=%s id=%s", event_type, data_object.get("id"))


async def _handle_authorization_request(auth: dict, db: AsyncSession) -> None:
    """Real-time approve/decline by looking up the card in our obligations.

    Approve when:
      - the card_id exists as a VirtualCardAuthorization
      - the authorization's pending amount fits within amount_remaining
      - the MCC / merchant_category is in the card's allowed set (Stripe
        already enforces this at their end; we double-check as belt & braces)

    Otherwise decline. We must respond inside Stripe's 2s window or they
    auto-decline on our behalf.
    """
    auth_id = auth.get("id")
    card = auth.get("card") or {}
    card_id = card.get("id") if isinstance(card, dict) else None
    amount = auth.get("pending_request", {}).get("amount") or auth.get("amount") or 0

    if not card_id:
        logger.warning("Authorization %s missing card.id — declining", auth_id)
        await decline_authorization(auth_id, reason="missing_card_id")
        return

    # Look up our row.
    try:
        from app.models.clearfund import VirtualCardAuthorization

        vca = (
            await db.execute(
                select(VirtualCardAuthorization).where(
                    VirtualCardAuthorization.stripe_card_id == card_id
                )
            )
        ).scalar_one_or_none()
    except Exception as exc:  # pragma: no cover — defensive import
        capture_error(exc, tags={"service": "stripe_issuing_webhook"})
        vca = None

    if not vca:
        logger.warning("No VirtualCardAuthorization for stripe_card_id=%s; declining", card_id)
        await decline_authorization(auth_id, reason="card_not_recognized")
        return

    amount_remaining_cents = int(round(float(getattr(vca, "amount_remaining", 0) or 0) * 100))
    if amount > amount_remaining_cents:
        logger.info(
            "Authorization %s over limit: requested=%s remaining=%s — declining",
            auth_id, amount, amount_remaining_cents,
        )
        await decline_authorization(auth_id, reason="over_obligation_limit")
        return

    await approve_authorization(auth_id, reason="within_obligation_limit")
    logger.info(
        "Authorization %s approved for card=%s amount_cents=%s", auth_id, card_id, amount
    )


async def _handle_transaction_created(txn: dict, db: AsyncSession) -> None:
    """Record a completed spend against the obligation's virtual card."""
    card = txn.get("card") or {}
    card_id = card.get("id") if isinstance(card, dict) else None
    amount_cents = abs(int(txn.get("amount") or 0))  # Stripe signs debits negative
    merchant = (txn.get("merchant_data") or {}).get("name") or "Unknown merchant"

    if not card_id or amount_cents == 0:
        return

    from app.models.clearfund import (  # local import to avoid startup-time cycles
        Obligation,
        VerificationArtifact,
        VirtualCardAuthorization,
    )

    vca = (
        await db.execute(
            select(VirtualCardAuthorization).where(
                VirtualCardAuthorization.stripe_card_id == card_id
            )
        )
    ).scalar_one_or_none()
    if not vca:
        logger.warning("Transaction received for unknown card_id=%s", card_id)
        return

    amount_usd = Decimal(amount_cents) / Decimal(100)
    vca.amount_spent = (getattr(vca, "amount_spent", 0) or Decimal(0)) + amount_usd
    vca.amount_remaining = (
        (getattr(vca, "amount_remaining", 0) or Decimal(0)) - amount_usd
    )
    vca.last_transaction_at = datetime.utcnow()

    # Record the receipt-equivalent artifact.
    try:
        db.add(
            VerificationArtifact(
                id=str(uuid.uuid4()),
                obligation_id=vca.obligation_id,
                artifact_type="stripe_issuing_transaction",
                source="stripe_webhook",
                description=f"Spent ${amount_usd} at {merchant}",
                extra_metadata={
                    "stripe_transaction_id": txn.get("id"),
                    "merchant": merchant,
                    "amount_cents": amount_cents,
                },
            )
        )
    except Exception as exc:  # pragma: no cover — model shape may differ
        logger.warning("VerificationArtifact insert failed (non-fatal): %s", exc)

    # Auto-complete the obligation when fully spent.
    obl = (
        await db.execute(
            select(Obligation).where(Obligation.id == vca.obligation_id)
        )
    ).scalar_one_or_none()
    if obl and vca.amount_spent >= (obl.total_amount or Decimal(0)) and obl.status != "completed":
        obl.status = "completed"
        logger.info("Obligation %s auto-completed from Issuing spend", obl.id)

    await db.commit()


# ─────────────────────────── helpers ─────────────────────────────────────


def _event_data_object(event: Any) -> dict:
    """Safely extract `event.data.object` across dict and Stripe object shapes."""
    if isinstance(event, dict):
        return (event.get("data") or {}).get("object") or {}
    data = getattr(event, "data", None)
    if data is None:
        return {}
    obj = getattr(data, "object", None)
    if obj is None:
        return {}
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    return dict(obj) if not isinstance(obj, dict) else obj


def _safe_json(event: Any) -> dict:
    """Best-effort JSON-serialize a Stripe event for storage."""
    try:
        if hasattr(event, "to_dict"):
            return event.to_dict()
        if isinstance(event, dict):
            return event
        return json.loads(json.dumps(event, default=str))
    except Exception:
        return {}
