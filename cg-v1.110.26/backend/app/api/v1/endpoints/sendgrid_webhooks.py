"""
SendGrid webhook endpoint for email delivery tracking (Fix #5).

Handles delivery, open, click, bounce, and dropped events
to update invitation status in real-time.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.invitation import InvitationService

logger = logging.getLogger(__name__)

router = APIRouter()


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
    try:
        body = await request.json()

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
                continue

        return {"status": "ok", "events_processed": len(events)}

    except Exception as e:
        logger.error(f"SendGrid webhook error: {e}")
        return {"status": "error", "message": str(e)}
