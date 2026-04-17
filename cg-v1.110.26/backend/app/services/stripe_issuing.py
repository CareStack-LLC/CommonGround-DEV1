"""
Wave 4-Alt — Stripe Issuing service wrapper.

Thin async-friendly helpers around the Stripe Issuing Python SDK. All
Stripe calls are sync, so we offload them to `asyncio.to_thread` to
avoid blocking the event loop.

**Graceful no-op when STRIPE_SECRET_KEY is missing.** The rest of the
app must work in development / CI without an Issuing account. Every
public function here either returns `None` or raises a typed
`IssuingUnavailable` that callers can handle locally.

Live activation requires:
    1. `settings.STRIPE_SECRET_KEY` populated
    2. Stripe account approved for the `card_issuing` capability
    3. PCI-DSS SAQ-A (we use Stripe Elements to reveal card details)
    4. Webhook endpoint signed secret configured at
       `settings.STRIPE_WEBHOOK_SECRET`

None of those are needed to import this module.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class IssuingUnavailable(RuntimeError):
    """Raised when a caller asks for live Stripe Issuing work but the
    platform is not configured for it. Callers decide whether to degrade
    silently or surface a 503 to the user."""


def _require_api_key() -> None:
    if not getattr(settings, "STRIPE_SECRET_KEY", None):
        raise IssuingUnavailable(
            "STRIPE_SECRET_KEY is not set — Issuing calls are disabled."
        )


def _stripe_module():
    """Lazy-import stripe so the module loads even when the SDK is unused."""
    import stripe  # type: ignore

    if getattr(settings, "STRIPE_SECRET_KEY", None):
        stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


async def _to_thread(fn, *args, **kwargs):
    return await asyncio.to_thread(fn, *args, **kwargs)


# ─────────────────────────────── Cardholders ─────────────────────────────


async def create_cardholder(
    *,
    name: str,
    email: str,
    phone: str,
    billing_address: dict,
    external_ref: str,
) -> dict[str, Any]:
    """Create (or idempotently reuse) a Stripe Issuing cardholder.

    `billing_address` must have: line1, city, state, postal_code, country.
    `external_ref` is used as the Stripe idempotency key + stored on
    metadata.commonground_user_id so we can dedupe.
    """
    _require_api_key()
    stripe = _stripe_module()

    def _create() -> Any:
        return stripe.issuing.Cardholder.create(
            name=name,
            email=email,
            phone_number=phone,
            type="individual",
            billing={"address": billing_address},
            metadata={"commonground_user_id": external_ref},
            idempotency_key=f"cardholder:{external_ref}",
        )

    obj = await _to_thread(_create)
    return obj.to_dict() if hasattr(obj, "to_dict") else dict(obj)


async def retrieve_cardholder(cardholder_id: str) -> dict[str, Any]:
    _require_api_key()
    stripe = _stripe_module()
    obj = await _to_thread(stripe.issuing.Cardholder.retrieve, cardholder_id)
    return obj.to_dict() if hasattr(obj, "to_dict") else dict(obj)


# ─────────────────────────────── Cards ───────────────────────────────────


async def create_virtual_card(
    *,
    cardholder_id: str,
    spending_controls: dict,
    card_ref: str,
    currency: str = "usd",
) -> dict[str, Any]:
    """Issue a new virtual card. `card_ref` = idempotency key (e.g. obligation id)."""
    _require_api_key()
    stripe = _stripe_module()

    def _create() -> Any:
        return stripe.issuing.Card.create(
            cardholder=cardholder_id,
            currency=currency,
            type="virtual",
            status="active",
            spending_controls=spending_controls,
            metadata={"commonground_card_ref": card_ref},
            idempotency_key=f"card:{card_ref}",
        )

    obj = await _to_thread(_create)
    return obj.to_dict() if hasattr(obj, "to_dict") else dict(obj)


async def update_spending_controls(
    card_id: str,
    *,
    spending_controls: Optional[dict] = None,
    status: Optional[str] = None,
) -> dict[str, Any]:
    _require_api_key()
    stripe = _stripe_module()
    update_kwargs: dict[str, Any] = {}
    if spending_controls is not None:
        update_kwargs["spending_controls"] = spending_controls
    if status is not None:
        update_kwargs["status"] = status
    if not update_kwargs:
        return await retrieve_card_details(card_id)

    def _update() -> Any:
        return stripe.issuing.Card.modify(card_id, **update_kwargs)

    obj = await _to_thread(_update)
    return obj.to_dict() if hasattr(obj, "to_dict") else dict(obj)


async def retrieve_card_details(card_id: str) -> dict[str, Any]:
    _require_api_key()
    stripe = _stripe_module()
    obj = await _to_thread(stripe.issuing.Card.retrieve, card_id)
    return obj.to_dict() if hasattr(obj, "to_dict") else dict(obj)


# ─────────────────────────────── Authorizations ──────────────────────────


async def approve_authorization(
    authorization_id: str,
    reason: Optional[str] = None,
) -> dict[str, Any]:
    """Approve an issuing_authorization.request webhook event in real time.

    Must be called within ~2 seconds of the webhook delivery or Stripe
    auto-declines on our behalf. Our webhook handler keeps this path
    allocation-free.
    """
    _require_api_key()
    stripe = _stripe_module()

    def _approve() -> Any:
        kwargs: dict[str, Any] = {}
        if reason:
            kwargs["metadata"] = {"approval_reason": reason[:500]}
        return stripe.issuing.Authorization.approve(authorization_id, **kwargs)

    obj = await _to_thread(_approve)
    return obj.to_dict() if hasattr(obj, "to_dict") else dict(obj)


async def decline_authorization(
    authorization_id: str,
    reason: Optional[str] = None,
) -> dict[str, Any]:
    _require_api_key()
    stripe = _stripe_module()

    def _decline() -> Any:
        kwargs: dict[str, Any] = {}
        if reason:
            kwargs["metadata"] = {"decline_reason": reason[:500]}
        return stripe.issuing.Authorization.decline(authorization_id, **kwargs)

    obj = await _to_thread(_decline)
    return obj.to_dict() if hasattr(obj, "to_dict") else dict(obj)


# ─────────────────────────────── Availability check ──────────────────────


def is_issuing_available() -> bool:
    """Cheap check before routing the user into an Issuing flow.

    Doesn't make a live Stripe call — just validates the env. Real
    availability (e.g. `card_issuing` capability revoked) surfaces as
    a 4xx from the actual API call when it happens.
    """
    return bool(getattr(settings, "STRIPE_SECRET_KEY", None))
