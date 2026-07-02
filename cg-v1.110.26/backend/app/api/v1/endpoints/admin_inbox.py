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
from sqlalchemy import select
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
    "/status",
    summary="Gmail integration status (Wave 5 Phase A)",
)
async def get_inbox_status(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Report whether Gmail is connected + whether the env is configured.

    Returns 200 in all cases so the UI can render the correct affordance
    (connect CTA, disconnect button, or error banner) without having to
    catch a 503 first.
    """
    from app.core.config import settings
    client_configured = bool(getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", None)) and bool(
        getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", None)
    )
    connected = False
    monitored_emails = getattr(settings, "GOOGLE_MONITORED_EMAILS", "") or ""
    try:
        from app.services.gmail_monitor_service import is_gmail_connected
        connected = await is_gmail_connected(db)
    except Exception as exc:
        # Service or table may not be present in this env — report rather than 500.
        logger.info("gmail_monitor_service.is_gmail_connected failed: %s", exc)

    return {
        "status": "connected" if connected else ("configurable" if client_configured else "not_configured"),
        "connected": connected,
        "client_configured": client_configured,
        "monitored_emails": [e.strip() for e in monitored_emails.split(",") if e.strip()],
    }


@router.get(
    "/oauth/url",
    summary="Get Google OAuth consent URL",
)
async def get_oauth_url(
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Generate a Google OAuth consent URL for Gmail API access.

    Returns 200 with `status: not_configured` when the env isn't set, so
    the UI can surface a "Gmail integration disabled" banner instead of
    a red error spinner.
    """
    from app.core.config import settings
    if not getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", None):
        return {
            "status": "not_configured",
            "url": None,
            "message": "Google OAuth client secret is not set. Configure GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in the backend environment.",
        }

    from app.services.gmail_monitor_service import get_google_oauth_url
    try:
        url = await get_google_oauth_url()
        return {"status": "ok", "url": url}
    except Exception as exc:
        logger.warning("OAuth URL generation failed: %s", exc)
        return {
            "status": "error",
            "url": None,
            "message": f"Failed to build OAuth URL: {type(exc).__name__}",
        }


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
    from app.core.config import Settings

    _settings = Settings()
    if not _settings.GOOGLE_OAUTH_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth client secret is not configured. Set GOOGLE_OAUTH_CLIENT_SECRET in environment.",
        )

    try:
        result = await exchange_oauth_code(db, code)
        await db.commit()
        return result
    except Exception as exc:
        logger.error("OAuth code exchange failed: %s", exc)
        await db.rollback()
        raise HTTPException(
            status_code=502,
            detail=f"Failed to exchange OAuth code with Google: {type(exc).__name__}. Check that the database migration has been applied and GOOGLE_OAUTH_CLIENT_SECRET is correct.",
        )


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


@router.post(
    "/backfill-aliases",
    summary="Re-hydrate to_email for emails synced before the alias-routing fix",
)
async def backfill_aliases(
    limit: int = Query(500, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Re-fetch Gmail headers for existing rows and correct their ``to_email``.

    Before the alias-routing fix every email's ``to_email`` was stored as
    the authenticated OAuth account (e.g. ``teejay@find-commonground.com``),
    so the inbox UI's per-alias tabs (Hello/Info/Partnerships/etc.) all
    funneled into the "TeeJay" tab. Call this endpoint once after the fix
    ships to retro-categorize the previously-synced messages. Idempotent —
    rows already on the correct alias are skipped.
    """
    from app.services.gmail_monitor_service import backfill_recipient_aliases

    try:
        result = await backfill_recipient_aliases(db, limit=limit)
        await db.commit()
        return result
    except Exception as exc:
        logger.error("Alias backfill failed: %s", exc)
        await db.rollback()
        raise HTTPException(
            status_code=502,
            detail=f"Backfill failed: {type(exc).__name__}: {exc}",
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


# =============================================================================
# AI Inbox Analysis
# =============================================================================

@router.post(
    "/analyze",
    summary="AI analysis of inbox",
)
async def analyze_inbox(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """
    Run AI analysis on recent emails to produce action items,
    category summary, and priority recommendations.
    """
    from app.services.gmail_monitor_service import get_emails_paginated

    try:
        result = await get_emails_paginated(db, limit=30, offset=0)
        emails = result.get("emails", [])
    except Exception as exc:
        logger.warning("Cannot fetch emails for analysis: %s", exc)
        return {"analysis": None, "error": "No emails available for analysis"}

    if not emails:
        return {"analysis": None, "error": "No emails to analyze"}

    # Build summary for AI
    email_summaries = []
    for e in emails[:20]:  # Cap at 20 for token limits
        email_summaries.append(
            f"- From: {e.get('from_name', '')} <{e.get('from_email', '')}>\n"
            f"  Subject: {e.get('subject', '')}\n"
            f"  Category: {e.get('category', 'unknown')}\n"
            f"  Urgent: {e.get('is_urgent', False)}\n"
            f"  Status: {e.get('draft_status', 'none')}"
        )

    prompt = (
        "Analyze this inbox for a co-parenting platform admin. "
        "Return a JSON object with these fields:\n"
        "- action_items: array of {priority: 'high'|'medium'|'low', action: string, email_subject: string}\n"
        "- category_breakdown: object mapping category to count\n"
        "- recommendations: array of strings (2-4 actionable suggestions)\n"
        "- summary: one paragraph overview of inbox health\n\n"
        f"Emails:\n{''.join(email_summaries)}"
    )

    # Try Claude first, fallback to OpenAI
    analysis = None
    provider = None
    try:
        from anthropic import AsyncAnthropic
        from app.core.config import settings
        if settings.ANTHROPIC_API_KEY:
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            resp = await client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text
            provider = "claude"
            # Parse JSON from response
            import json
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                analysis = json.loads(raw[start:end])
    except Exception as exc:
        logger.warning("Claude inbox analysis failed, trying OpenAI: %s", exc)

    if not analysis:
        try:
            from openai import AsyncOpenAI
            from app.core.config import settings
            if settings.OPENAI_API_KEY:
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                resp = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    max_tokens=1000,
                )
                import json
                analysis = json.loads(resp.choices[0].message.content or "{}")
                provider = "openai"
        except Exception as exc:
            logger.warning("OpenAI inbox analysis also failed: %s", exc)

    return {
        "analysis": analysis,
        "provider": provider,
        "email_count": len(emails),
    }


# =============================================================================
# Multi-Select Analysis
# =============================================================================

class AnalyzeSelectedBody(BaseModel):
    email_ids: list[str]


@router.post(
    "/analyze-selected",
    summary="Analyze selected emails for patterns",
)
async def analyze_selected_emails(
    body: AnalyzeSelectedBody,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Analyze a selected set of emails to find patterns, FAQ opportunities, and insights."""
    from app.models.inbox import MonitoredEmail

    if not body.email_ids:
        return {"analysis": None, "provider": None, "email_count": 0}

    # Load selected emails (cap at 30)
    ids = body.email_ids[:30]
    result = await db.execute(
        select(MonitoredEmail).where(MonitoredEmail.id.in_(ids))
    )
    emails = list(result.scalars().all())

    if not emails:
        return {"analysis": None, "provider": None, "email_count": 0}

    # Build email summaries
    email_summaries = []
    for e in emails:
        email_summaries.append(
            f"---\nFrom: {e.from_name or e.from_email}\n"
            f"To: {e.to_email}\nSubject: {e.subject}\n"
            f"Category: {e.category}\nPriority: {(e.admin_notes or '{}')}\n"
            f"Body: {(e.body_full or '')[:500]}\n"
        )

    prompt = (
        "You are a customer success analyst for CommonGround, an AI-powered co-parenting platform. "
        f"Analyze these {len(emails)} selected emails and find patterns.\n\n"
        "Return ONLY valid JSON with these fields:\n"
        "- patterns: array of {pattern: string, frequency: string, emails_affected: number}\n"
        "- faq_recommendations: array of {question: string, suggested_answer: string} — "
        "generate FAQ entries from recurring questions\n"
        "- action_items: array of {priority: 'high'|'medium'|'low', action: string}\n"
        "- insights: array of strings — business insights and improvement suggestions\n"
        "- summary: one paragraph overview of what these emails reveal\n\n"
        f"Emails:\n{''.join(email_summaries)}"
    )

    analysis = None
    provider = None

    try:
        import anthropic
        from app.core.config import Settings
        s = Settings()
        if s.ANTHROPIC_API_KEY:
            client = anthropic.AsyncAnthropic(api_key=s.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            import json
            analysis = json.loads(text.strip())
            provider = "claude"
    except Exception as exc:
        logger.warning("Claude multi-select analysis failed: %s", exc)

    if not analysis:
        try:
            from openai import AsyncOpenAI
            from app.core.config import Settings
            s = Settings()
            if s.OPENAI_API_KEY:
                oai = AsyncOpenAI(api_key=s.OPENAI_API_KEY)
                resp = await oai.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    max_tokens=2000,
                )
                import json
                analysis = json.loads(resp.choices[0].message.content or "{}")
                provider = "openai"
        except Exception as exc:
            logger.warning("OpenAI multi-select analysis also failed: %s", exc)

    return {
        "analysis": analysis,
        "provider": provider,
        "email_count": len(emails),
    }


# =============================================================================
# Thread-Aware AI Reply Generation
# =============================================================================

class GenerateReplyBody(BaseModel):
    instructions: str = ""


@router.post(
    "/emails/{email_id}/generate-reply",
    summary="Generate AI reply with thread context",
)
async def generate_reply(
    email_id: str,
    body: GenerateReplyBody = GenerateReplyBody(),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Generate a contextual AI reply using full email thread history."""
    try:
        from app.services import gmail_monitor_service
        result = await gmail_monitor_service.generate_thread_reply(
            db, email_id, body.instructions
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Generate reply failed: %s", e)
        raise HTTPException(status_code=502, detail="Failed to generate reply")


# =============================================================================
# Email KPIs
# =============================================================================

@router.get(
    "/kpis",
    summary="Inbox KPI dashboard metrics",
)
async def get_inbox_kpis(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> dict:
    """Detailed inbox KPIs: recipient breakdown, volume trends, approval rates."""
    try:
        from app.services import gmail_monitor_service
        return await gmail_monitor_service.get_inbox_kpis(db)
    except Exception as e:
        logger.error("KPIs fetch failed: %s", e)
        return {
            "by_recipient": {},
            "volume_trend": [],
            "draft_approval_rate": 0,
            "by_category": {},
            "total": 0,
            "urgent": 0,
        }
