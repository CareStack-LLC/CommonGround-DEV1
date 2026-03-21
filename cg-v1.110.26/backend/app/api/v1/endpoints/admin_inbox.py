"""
Admin Email Monitor API - Gmail integration with AI-powered draft responses.

Provides OAuth setup, email sync, AI draft management, and inbox analytics
for the superadmin automated email monitoring system.

All endpoints require is_admin=True on the authenticated user.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Request / Response schemas
# =============================================================================

class ReplyBody(BaseModel):
    response_body: str


# =============================================================================
# OAuth
# =============================================================================

@router.get(
    "/oauth/url",
    summary="Get Google OAuth consent URL",
)
async def get_oauth_url(
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Generate a Google OAuth consent URL for Gmail API access."""
    from app.services.gmail_monitor_service import get_google_oauth_url

    try:
        url = await get_google_oauth_url()
        return {"url": url}
    except Exception as exc:
        logger.warning("OAuth URL generation failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_SECRET in environment.",
        )


@router.post(
    "/oauth/callback",
    summary="Exchange OAuth code for tokens",
)
async def oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Exchange an OAuth authorization code for access and refresh tokens."""
    from app.services.gmail_monitor_service import exchange_oauth_code

    result = await exchange_oauth_code(db, code)
    await db.commit()
    return result


# =============================================================================
# Emails
# =============================================================================

@router.get(
    "/emails",
    summary="List monitored emails",
)
async def list_emails(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_urgent: Optional[bool] = Query(None, description="Filter urgent emails"),
    draft_status: Optional[str] = Query(None, description="Filter by draft status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """List monitored emails with optional filters and pagination."""
    from app.services.gmail_monitor_service import get_emails_paginated

    try:
        return await get_emails_paginated(
            db,
            category=category,
            is_urgent=is_urgent,
            draft_status=draft_status,
            page=page,
            page_size=page_size,
        )
    except Exception as exc:
        # Table may not exist yet (migration not applied)
        logger.warning("Inbox emails query failed (table may not exist): %s", exc)
        return {"emails": [], "total": 0, "page": page, "page_size": page_size}


@router.get(
    "/emails/{email_id}",
    summary="Get email detail",
)
async def get_email_detail(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get full detail for a monitored email including AI draft if available."""
    from app.services.gmail_monitor_service import get_email_by_id

    result = await get_email_by_id(db, email_id)
    if not result:
        raise HTTPException(status_code=404, detail="Email not found")
    return result


@router.post(
    "/emails/{email_id}/approve-draft",
    summary="Approve AI draft for sending",
)
async def approve_draft(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Approve an AI-generated draft response and send it."""
    from app.services.gmail_monitor_service import approve_email_draft

    result = await approve_email_draft(db, email_id)
    await db.commit()
    return result


@router.post(
    "/emails/{email_id}/reject-draft",
    summary="Reject AI draft",
)
async def reject_draft(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Reject an AI-generated draft response."""
    from app.services.gmail_monitor_service import reject_email_draft

    result = await reject_email_draft(db, email_id)
    await db.commit()
    return result


@router.post(
    "/emails/{email_id}/reply",
    summary="Send custom reply",
)
async def send_custom_reply(
    email_id: str,
    body: ReplyBody,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Send a custom reply to a monitored email."""
    from app.services.gmail_monitor_service import send_reply

    result = await send_reply(db, email_id, body.response_body)
    await db.commit()
    return result


# =============================================================================
# Sync & Digests
# =============================================================================

@router.post(
    "/sync",
    summary="Trigger manual email sync",
)
async def trigger_sync(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Manually trigger an email sync from Gmail."""
    from app.services.gmail_monitor_service import sync_emails

    try:
        result = await sync_emails(db)
        await db.commit()
        return result
    except Exception as exc:
        logger.warning("Inbox sync failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Email sync is not available. Google OAuth may not be configured, or the database migration has not been applied.",
        )


@router.get(
    "/digests",
    summary="List past email digests",
)
async def list_digests(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> list:
    """Return recent email digest summaries."""
    from app.services.gmail_monitor_service import get_digests

    try:
        return await get_digests(db, limit)
    except Exception as exc:
        logger.warning("Digests query failed (table may not exist): %s", exc)
        return []


# =============================================================================
# Stats
# =============================================================================

@router.get(
    "/stats",
    summary="Inbox statistics",
)
async def get_inbox_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get inbox stats: counts by category, urgent count, pending drafts."""
    from app.services.gmail_monitor_service import get_inbox_stats as svc_get_inbox_stats

    try:
        return await svc_get_inbox_stats(db)
    except Exception as exc:
        # Table may not exist yet (migration not applied)
        logger.warning("Inbox stats query failed (table may not exist): %s", exc)
        return {"total": 0, "by_category": {}, "urgent_pending": 0, "pending_drafts": 0}
