"""
SendGrid webhook endpoint for email delivery tracking (Fix #5).

Handles delivery, open, click, bounce, and dropped events
to update invitation status in real-time.
"""

import hashlib
import hmac
import base64
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.services.invitation import InvitationService
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)

router = APIRouter()

# SendGrid webhook verification key (set in SendGrid Event Webhook settings)
SENDGRID_WEBHOOK_VERIFICATION_KEY: Optional[str] = getattr(settings, 'SENDGRID_WEBHOOK_VERIFICATION_KEY', None)


def verify_sendgrid_signature(request: Request, body: bytes) -> bool:
    """
    Verify SendGrid Event Webhook signature using ECDSA or HMAC.

    SendGrid signs webhooks with the X-Twilio-Email-Event-Webhook-Signature header.
    If no verification key is configured, reject the request (fail closed).
    """
    if not SENDGRID_WEBHOOK_VERIFICATION_KEY:
        logger.warning("SENDGRID_WEBHOOK_VERIFICATION_KEY not configured - rejecting webhook (fail closed)")
        return False

    signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")
    timestamp = request.headers.get("X-Twilio-Email-Event-Webhook-Timestamp", "")

    if not signature or not timestamp:
        logger.warning("Missing SendGrid webhook signature headers")
        return False

    # Verify using HMAC-SHA256: timestamp + body
    try:
        payload = timestamp.encode() + body
        expected = hmac.new(
            SENDGRID_WEBHOOK_VERIFICATION_KEY.encode(),
            payload,
            hashlib.sha256
        ).digest()
        expected_b64 = base64.b64encode(expected).decode()
        return hmac.compare_digest(signature, expected_b64)
    except Exception as e:
        logger.error(f"SendGrid signature verification failed: {e}")
        capture_error(e)
        return False


class SendGridEvent(BaseModel):
    """Individual SendGrid webhook event."""
    event: str  # delivered, open, click, bounce, dropped, deferred
    email: str
    reason: Optional[str] = None
    sg_message_id: Optional[str] = None
    timestamp: Optional[int] = None
    url: Optional[str] = None
    category: Optional[List[str]] = None


@router.post("/sendgrid")
async def handle_sendgrid_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle SendGrid event webhooks for invitation tracking.

    SendGrid sends batches of events as a JSON array.
    We process each event to update invitation status
    and trigger case events for attorney dashboards.

    Supported events:
    - delivered: Email reached recipient's mail server
    - open: Recipient opened the email
    - click: Recipient clicked a link
    - bounce: Email bounced (hard or soft)
    - dropped: SendGrid dropped the email (prior bounces, spam reports)
    """
    # Verify webhook signature
    body_bytes = await request.body()
    if not verify_sendgrid_signature(request, body_bytes):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature"
        )

    try:
        import json
        body = json.loads(body_bytes)

        # SendGrid sends events as a JSON array
        events = body if isinstance(body, list) else [body]

        service = InvitationService(db)

        for event_data in events:
            try:
                event_type = event_data.get("event", "")
                email = event_data.get("email", "")

                if not email or event_type not in (
                    "delivered", "open", "click", "bounce", "dropped"
                ):
                    continue

                await service.handle_sendgrid_webhook(
                    event_type=event_type,
                    email=email,
                    reason=event_data.get("reason"),
                    sg_message_id=event_data.get("sg_message_id"),
                )

                logger.info(f"SendGrid webhook processed: {event_type} for {email}")

            except Exception as e:
                logger.error(f"Error processing SendGrid event: {e}")
                capture_error(e)
                continue

        return {"status": "ok", "events_processed": len(events)}

    except Exception as e:
        logger.error(f"SendGrid webhook error: {e}")
        capture_error(e)
        return {"status": "error", "message": "Webhook processing failed"}
