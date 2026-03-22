"""
Chatbot endpoints for the public-facing Aria customer success chatbot.

Public endpoints (no auth): start sessions, send messages, update visitor info, escalate.
Admin endpoints (requires admin auth): list sessions, view transcripts, email transcripts, stats.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User
from app.schemas.chatbot import (
    ChatbotStartSessionRequest,
    ChatbotStartSessionResponse,
    ChatbotSendMessageRequest,
    ChatbotSendMessageResponse,
    ChatbotUpdateVisitorRequest,
    ChatbotUpdateVisitorResponse,
    ChatbotEscalateRequest,
    ChatbotEscalateResponse,
    ChatbotSessionListItem,
    ChatbotSessionDetail,
    ChatbotSessionsListResponse,
    ChatbotAdminStats,
    ChatbotMessageItem,
    ChatbotVisitorInfo,
)
from app.services.chatbot import chatbot_service
from app.utils.sentry_helpers import capture_error

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/debug-test")
async def debug_test():
    """Temporary debug endpoint — REMOVE AFTER TESTING."""
    import anthropic as _anthropic
    from app.core.config import settings as _s
    result = {
        "key_present": bool(_s.ANTHROPIC_API_KEY),
        "key_prefix": (_s.ANTHROPIC_API_KEY or "")[:12] + "..." if _s.ANTHROPIC_API_KEY else None,
        "anthropic_version": _anthropic.__version__,
    }
    try:
        client = _anthropic.AsyncAnthropic(api_key=_s.ANTHROPIC_API_KEY)
        resp = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=20,
            messages=[{"role": "user", "content": "Say hi in one word"}],
        )
        result["claude_response"] = resp.content[0].text
        result["status"] = "SUCCESS"
    except Exception as e:
        result["error_type"] = type(e).__name__
        result["error"] = str(e)[:500]
        result["status"] = "FAILED"
    return result


# ── Public Endpoints (no auth) ───────────────────────────────────────

@router.post("/sessions", response_model=ChatbotStartSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    request_body: ChatbotStartSessionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Start a new chatbot conversation. No authentication required."""
    try:
        ip_address = request.client.host if request.client else ""
        user_agent = request.headers.get("user-agent", "")

        session_id, greeting = await chatbot_service.create_session(
            db=db,
            ip_address=ip_address,
            user_agent=user_agent,
            source_page=request_body.source_page or "",
        )

        return ChatbotStartSessionResponse(session_id=session_id, greeting=greeting)
    except Exception as e:
        logger.error(f"Failed to start chatbot session: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start chat session.",
        )


@router.post("/messages", response_model=ChatbotSendMessageResponse)
async def send_message(
    request_body: ChatbotSendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message and receive an AI reply. No authentication required."""
    try:
        message_id, reply = await chatbot_service.send_message(
            db=db,
            session_id=request_body.session_id,
            user_content=request_body.content,
        )
        return ChatbotSendMessageResponse(message_id=message_id, reply=reply)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Chatbot message error: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message.",
        )


@router.put("/visitors", response_model=ChatbotUpdateVisitorResponse)
async def update_visitor(
    request_body: ChatbotUpdateVisitorRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update visitor contact info for a session. No authentication required."""
    try:
        success = await chatbot_service.update_visitor_info(
            db=db,
            session_id=request_body.session_id,
            name=request_body.name,
            email=request_body.email,
            phone=request_body.phone,
        )
        return ChatbotUpdateVisitorResponse(success=success)
    except Exception as e:
        logger.error(f"Chatbot visitor update error: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update visitor info.",
        )


@router.post("/escalate", response_model=ChatbotEscalateResponse)
async def escalate_session(
    request_body: ChatbotEscalateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Escalate a chat session to human support. No authentication required."""
    try:
        success = await chatbot_service.escalate_session(
            db=db,
            session_id=request_body.session_id,
            reason=request_body.reason,
        )
        if success:
            return ChatbotEscalateResponse(
                success=True,
                message="Your conversation has been sent to our support team at hello@find-commonground.com. They'll follow up shortly!",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chatbot escalation error: {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to escalate session.",
        )


# ── Admin Endpoints (requires admin auth) ────────────────────────────

@router.get("/admin/sessions", response_model=ChatbotSessionsListResponse)
async def admin_list_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """List all chatbot sessions with filters. Requires admin auth."""
    parsed_from = datetime.fromisoformat(date_from) if date_from else None
    parsed_to = datetime.fromisoformat(date_to) if date_to else None

    sessions, total = await chatbot_service.list_sessions(
        db=db,
        status=status_filter,
        search=search,
        date_from=parsed_from,
        date_to=parsed_to,
        page=page,
        per_page=per_page,
    )

    items = [
        ChatbotSessionListItem(
            id=s.id,
            visitor_name=s.visitor.name if s.visitor else None,
            visitor_email=s.visitor.email if s.visitor else None,
            status=s.status,
            message_count=s.message_count or 0,
            started_at=s.started_at,
            ended_at=s.ended_at,
        )
        for s in sessions
    ]

    return ChatbotSessionsListResponse(
        sessions=items, total=total, page=page, per_page=per_page
    )


@router.get("/admin/sessions/{session_id}", response_model=ChatbotSessionDetail)
async def admin_get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Get full session transcript. Requires admin auth."""
    session = await chatbot_service.get_session_detail(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found."
        )

    return ChatbotSessionDetail(
        id=session.id,
        visitor=ChatbotVisitorInfo(
            name=session.visitor.name if session.visitor else None,
            email=session.visitor.email if session.visitor else None,
            phone=session.visitor.phone if session.visitor else None,
            source_page=session.visitor.source_page if session.visitor else None,
        ),
        status=session.status,
        message_count=session.message_count or 0,
        started_at=session.started_at,
        ended_at=session.ended_at,
        escalation_reason=session.escalation_reason,
        transcript_emailed=session.transcript_emailed,
        messages=[
            ChatbotMessageItem(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in session.messages
        ],
    )


@router.post("/admin/sessions/{session_id}/email-transcript")
async def admin_email_transcript(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Email a session transcript to the support team. Requires admin auth."""
    success = await chatbot_service.email_transcript(db, session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found."
        )
    return {"success": True, "message": "Transcript emailed to hello@find-commonground.com"}


@router.get("/admin/stats", response_model=ChatbotAdminStats)
async def admin_get_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Get aggregate chatbot statistics. Requires admin auth."""
    stats = await chatbot_service.get_stats(db)
    return ChatbotAdminStats(**stats)


# ── Admin Config Endpoints (editable system prompt / promotions) ──

@router.get("/admin/config/{key}")
async def admin_get_config(
    key: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Get a chatbot config value. Requires admin auth."""
    try:
        value = await chatbot_service.get_config(db, key)
        return {"key": key, "value": value}
    except Exception as e:
        logger.error(f"Failed to get chatbot config '{key}': {e}")
        # Table may not exist yet — return null gracefully
        return {"key": key, "value": None}


@router.put("/admin/config/{key}")
async def admin_update_config(
    key: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Update a chatbot config value. Requires admin auth.

    Valid keys: system_prompt, active_promotions, greeting_message
    """
    ALLOWED_KEYS = {"system_prompt", "active_promotions", "greeting_message"}
    if key not in ALLOWED_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid config key. Allowed: {', '.join(ALLOWED_KEYS)}",
        )

    body = await request.json()
    value = body.get("value", "")
    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Value must be a string.",
        )

    try:
        await chatbot_service.update_config(
            db, key, value, updated_by=admin_user.email or str(admin_user.id)
        )
        return {"success": True, "key": key}
    except Exception as e:
        logger.error(f"Failed to update chatbot config '{key}': {e}")
        capture_error(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save config. The chatbot_config table may need to be created. Please contact support.",
        )
