"""
Message endpoints with ARIA integration.

Handles parent-to-parent communication with AI-powered conflict prevention.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, text
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.message import Message, MessageFlag, MessageThread
from app.models.message_attachment import MessageAttachment
from app.models.case import Case, CaseParticipant
from app.models.child import Child
from app.models.family_file import FamilyFile
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageWithFlagResponse,
    InterventionAction,
    ARIAAnalysisResponse,
    AnalyticsResponse,
    ThreadCreate,
    ThreadResponse,
    MessageAttachmentResponse,
    AttachmentUploadResponse,
)
from app.services.aria import aria_service
from app.services.activity import log_message_activity
from app.services.push import push_service
from app.services.storage import (
    storage_service,
    StorageBucket,
    build_attachment_path,
    validate_attachment,
)
from app.core.websocket import manager
from datetime import datetime
import uuid
import hashlib
import logging
import json

logger = logging.getLogger(__name__)


router = APIRouter()


@router.post("/analyze", response_model=ARIAAnalysisResponse)
async def analyze_message_content(
    content: str = Query(..., min_length=1),
    case_id: Optional[str] = Query(None, description="Case ID for context (legacy)"),
    family_file_id: Optional[str] = Query(None, description="Family File ID for context"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze message content before sending (preview mode).

    This allows users to check their message before sending.
    Uses case-level or family file-level ARIA settings (provider and enabled status).

    Args:
        content: Message content to analyze
        case_id: Case ID for context (legacy support)
        family_file_id: Family File ID for context (preferred)

    Returns:
        ARIA analysis result
    """
    aria_enabled = True
    ai_provider = settings.ARIA_DEFAULT_PROVIDER
    case_context = {"children": []}

    # Check which context to use
    if family_file_id:
        # Get family file and verify access
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Family file not found"
            )

        # Verify user has access to family file
        if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this family file"
            )

        # Get family file ARIA settings
        aria_enabled = family_file.aria_enabled
        ai_provider = family_file.aria_provider or settings.ARIA_DEFAULT_PROVIDER

        # Get children from family file for context
        children_result = await db.execute(
            select(Child).where(
                and_(
                    Child.family_file_id == family_file_id,
                    Child.is_active == True
                )
            )
        )
        children = children_result.scalars().all()

        case_context = {
            "children": [
                {
                    "first_name": child.first_name,
                    "age": (datetime.utcnow().date() - child.date_of_birth).days // 365 if child.date_of_birth else None
                }
                for child in children
            ]
        }

    elif case_id:
        # Legacy: Get case and verify access
        result = await db.execute(
            select(Case).where(Case.id == case_id)
        )
        case = result.scalar_one_or_none()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found"
            )

        # Verify user has access to case
        participant_result = await db.execute(
            select(CaseParticipant).where(
                and_(
                    CaseParticipant.case_id == case_id,
                    CaseParticipant.user_id == current_user.id,
                    CaseParticipant.is_active == True
                )
            )
        )
        participant = participant_result.scalar_one_or_none()

        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this case"
            )

        # Get case ARIA settings
        aria_enabled = case.aria_enabled
        ai_provider = case.aria_provider or settings.ARIA_DEFAULT_PROVIDER

        # Get case context (children for context)
        children_result = await db.execute(
            select(Child).where(
                and_(
                    Child.case_id == case_id,
                    Child.is_active == True
                )
            )
        )
        children = children_result.scalars().all()

        case_context = {
            "children": [
                {
                    "first_name": child.first_name,
                    "age": (datetime.utcnow().date() - child.date_of_birth).days // 365
                }
                for child in children
            ]
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either case_id or family_file_id is required"
        )

    # Check if ARIA is enabled
    if not aria_enabled:
        # ARIA disabled - return clean result
        return ARIAAnalysisResponse(
            toxicity_level="green",
            toxicity_score=0.0,
            categories=[],
            triggers=[],
            explanation="ARIA analysis is disabled",
            suggestion=None,
            is_flagged=False
        )

    # Analyze with ARIA using settings

    if ai_provider == "claude":
        analysis = await aria_service.analyze_with_ai(content, case_context)
    elif ai_provider == "openai":
        analysis = await aria_service.analyze_with_openai(content, case_context)
    else:
        # Fast regex analysis (ai_provider=settings.ARIA_DEFAULT_PROVIDER or default)
        result = aria_service.analyze_message(content)
        analysis = {
            "toxicity_score": result.toxicity_score,
            "categories": [cat.value for cat in result.categories],
            "triggers": result.triggers,
            "explanation": result.explanation,
            "suggestions": [result.suggestion] if result.suggestion else [],
            "ai_powered": False,
            "provider": settings.ARIA_DEFAULT_PROVIDER
        }

    # Determine if flagged
    is_flagged = analysis["toxicity_score"] > 0.3

    if is_flagged:
        # ARIA v2: Log preview intervention for audit trail
        try:
            from app.services.aria import SentimentAnalysis, ToxicityCategory, ToxicityLevel
            from datetime import datetime
            
            # Map score to level for the log object
            score = analysis["toxicity_score"]
            if score < 0.2:
                level = ToxicityLevel.NONE
            elif score < 0.4:
                level = ToxicityLevel.LOW
            elif score < 0.6:
                level = ToxicityLevel.MEDIUM
            elif score < 0.8:
                level = ToxicityLevel.HIGH
            else:
                level = ToxicityLevel.SEVERE

            analysis_obj = SentimentAnalysis(
                original_message=content,
                toxicity_level=level,
                toxicity_score=score,
                categories=aria_service.map_categories(analysis.get("categories", [])),
                triggers=analysis.get("triggers", []),
                explanation=analysis.get("explanation", ""),
                suggestion=analysis["suggestions"][0] if analysis.get("suggestions") else None,
                is_flagged=True,
                timestamp=datetime.utcnow()
            )
            
            await aria_service.log_event(
                db=db,
                user_id=str(current_user.id),
                family_file_id=family_file_id,
                message_id=f"preview_{uuid.uuid4()}",
                content_type="text_preview",
                analysis=analysis_obj,
                context_data={"source": "analyze_endpoint"}
            )
        except Exception as e:
            logger.error(f"Failed to log ARIA preview event: {e}")

    # Map score to level
    score = analysis["toxicity_score"]
    if score < 0.2:
        toxicity_level = "green"
    elif score < 0.5:
        toxicity_level = "yellow"
    elif score < 0.8:
        toxicity_level = "orange"
    else:
        toxicity_level = "red"

    return ARIAAnalysisResponse(
        toxicity_level=toxicity_level,
        toxicity_score=analysis["toxicity_score"],
        categories=analysis.get("categories", []),
        triggers=analysis.get("triggers", []),
        explanation=analysis.get("explanation", ""),
        suggestion=analysis["suggestions"][0] if analysis.get("suggestions") else None,
        is_flagged=is_flagged
    )


async def _store_reply_suggestions(
    message_id: str,
    family_file_id: Optional[str],
    recipient_id: str,
    message_content: str,
    thread_history: List[str],
    aria_mode: str
) -> None:
    """
    Background task: generate reply suggestions and store them in aria_reply_suggestions.
    Also pushes them via WebSocket to the recipient.
    """
    try:
        suggestions = await aria_service.generate_reply_suggestion(
            incoming_message=message_content,
            thread_history=thread_history,
            aria_mode=aria_mode
        )
        if not suggestions:
            return

        # Store in DB via raw SQL (avoids model dependency)
        from app.core.database import async_session_maker
        async with async_session_maker() as db_bg:
            stmt = text("""
                INSERT INTO aria_reply_suggestions
                    (id, message_id, family_file_id, recipient_id, suggestions, aria_mode, created_at)
                VALUES
                    (:id, :msg_id, :ff_id, :recip_id, :suggestions, :aria_mode, NOW())
            """)
            await db_bg.execute(stmt, {
                "id": str(uuid.uuid4()),
                "msg_id": message_id,
                "ff_id": family_file_id,
                "recip_id": recipient_id,
                "suggestions": json.dumps(suggestions),
                "aria_mode": aria_mode,
            })
            await db_bg.commit()

        # Push to recipient via WebSocket
        try:
            await manager.broadcast_to_case(
                message={
                    "type": "aria_reply_suggestions",
                    "message_id": message_id,
                    "suggestions": suggestions,
                },
                case_id=family_file_id,
                exclude_user=None
            )
        except Exception as e:
            print(f"[ARIA v2] WebSocket push for reply suggestions failed: {e}")
    except Exception as e:
        print(f"[ARIA v2] _store_reply_suggestions background task failed: {e}")


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a message with ARIA analysis.

    Supports both court cases (case_id) and family files (family_file_id).

    Flow:
    1. Verify user access to case or family file
    2. Get ARIA settings from case or family file
    3. Analyze message with ARIA (if enabled)
    4. If toxic, create intervention flag (frontend will show UI)
    5. Save message and flag (if any)
    6. Broadcast via WebSocket to other parent

    Args:
        message_data: Message content and metadata

    Returns:
        Created message with ARIA analysis result if flagged
    """
    aria_enabled = True
    ai_provider = settings.ARIA_DEFAULT_PROVIDER
    aria_mode = "standard"  # ARIA v2: default mode
    case_context = {"children": []}
    context_id = None  # For WebSocket broadcast
    thread_history: List[str] = []  # ARIA v2: conversation context for rewriting

    # Determine context: family file or court case
    if message_data.family_file_id:
        # Family File context (preferred)
        result = await db.execute(
            select(FamilyFile).where(FamilyFile.id == message_data.family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Family file not found"
            )

        # Verify user has access to family file
        if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this family file"
            )

        # Verify recipient is the other parent in the family file
        other_parent_id = family_file.parent_b_id if current_user.id == family_file.parent_a_id else family_file.parent_a_id
        if message_data.recipient_id != other_parent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient must be the other parent in the family file"
            )

        # Get family file ARIA settings
        aria_enabled = family_file.aria_enabled
        ai_provider = family_file.aria_provider or settings.ARIA_DEFAULT_PROVIDER
        aria_mode = getattr(family_file, 'aria_mode', 'standard') or 'standard'
        context_id = message_data.family_file_id

        # ARIA v2: Load recent thread history for contextual rewrite
        history_result = await db.execute(
            select(Message.content)
            .where(Message.family_file_id == message_data.family_file_id)
            .order_by(desc(Message.sent_at))
            .limit(10)
        )
        thread_history = list(reversed([row[0] for row in history_result.fetchall()]))

        # Get children from family file for context
        children_result = await db.execute(
            select(Child).where(
                and_(
                    Child.family_file_id == message_data.family_file_id,
                    Child.is_active == True
                )
            )
        )
        children = children_result.scalars().all()

        case_context = {
            "children": [
                {"first_name": child.first_name}
                for child in children
            ]
        }

    elif message_data.case_id:
        # Court Case context (legacy)
        case_result = await db.execute(
            select(Case).where(Case.id == message_data.case_id)
        )
        case = case_result.scalar_one_or_none()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found"
            )

        # Verify access
        result = await db.execute(
            select(CaseParticipant).where(
                and_(
                    CaseParticipant.case_id == message_data.case_id,
                    CaseParticipant.user_id == current_user.id,
                    CaseParticipant.is_active == True
                )
            )
        )
        participant = result.scalar_one_or_none()

        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this case"
            )

        # Verify recipient is in the case
        recipient_result = await db.execute(
            select(CaseParticipant).where(
                and_(
                    CaseParticipant.case_id == message_data.case_id,
                    CaseParticipant.user_id == message_data.recipient_id,
                    CaseParticipant.is_active == True
                )
            )
        )
        recipient_participant = recipient_result.scalar_one_or_none()

        if not recipient_participant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient is not a participant in this case"
            )

        # Get case ARIA settings
        aria_enabled = case.aria_enabled
        ai_provider = case.aria_provider or settings.ARIA_DEFAULT_PROVIDER
        context_id = message_data.case_id

        # Get children for context
        children_result = await db.execute(
            select(Child).where(
                and_(
                    Child.case_id == message_data.case_id,
                    Child.is_active == True
                )
            )
        )
        children = children_result.scalars().all()

        case_context = {
            "children": [
                {"first_name": child.first_name}
                for child in children
            ]
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either case_id or family_file_id is required"
        )

    # Analyze with ARIA
    aria_analysis = None
    if aria_enabled:
        # Run ARIA analysis based on provider setting
        if ai_provider == "claude":
            analysis_result = await aria_service.analyze_with_ai(message_data.content, case_context)
            # Convert to SentimentAnalysis format
            from app.services.aria import SentimentAnalysis, ToxicityCategory, ToxicityLevel

            # Determine toxicity level from score
            score = analysis_result["toxicity_score"]
            if score < 0.2:
                toxicity_level = ToxicityLevel.NONE
            elif score < 0.4:
                toxicity_level = ToxicityLevel.LOW
            elif score < 0.6:
                toxicity_level = ToxicityLevel.MEDIUM
            elif score < 0.8:
                toxicity_level = ToxicityLevel.HIGH
            else:
                toxicity_level = ToxicityLevel.SEVERE

            categories_list = [ToxicityCategory(cat) for cat in analysis_result.get("categories", [])]
            # STRICT BLOCKING: Enforce zero tolerance for AI results too
            block_send = (
                ToxicityCategory.THREATENING in categories_list or
                ToxicityCategory.HATE_SPEECH in categories_list or
                ToxicityCategory.SEXUAL_HARASSMENT in categories_list
            )

            aria_analysis = SentimentAnalysis(
                original_message=message_data.content,
                toxicity_level=toxicity_level,
                toxicity_score=score,
                categories=categories_list,
                triggers=analysis_result.get("triggers", []),
                explanation=analysis_result.get("explanation", ""),
                suggestion=analysis_result["suggestions"][0] if analysis_result.get("suggestions") else None,
                is_flagged=score > 0.3,
                block_send=block_send,
                timestamp=datetime.utcnow()
            )
        elif ai_provider == "openai":
            analysis_result = await aria_service.analyze_with_openai(message_data.content, case_context)
            from app.services.aria import SentimentAnalysis, ToxicityCategory, ToxicityLevel

            # Determine toxicity level from score
            score = analysis_result["toxicity_score"]
            if score < 0.2:
                toxicity_level = ToxicityLevel.NONE
            elif score < 0.4:
                toxicity_level = ToxicityLevel.LOW
            elif score < 0.6:
                toxicity_level = ToxicityLevel.MEDIUM
            elif score < 0.8:
                toxicity_level = ToxicityLevel.HIGH
            else:
                toxicity_level = ToxicityLevel.SEVERE

            categories_list = [ToxicityCategory(cat) for cat in analysis_result.get("categories", [])]
            # STRICT BLOCKING: Enforce zero tolerance for AI results too
            block_send = (
                ToxicityCategory.THREATENING in categories_list or
                ToxicityCategory.HATE_SPEECH in categories_list or
                ToxicityCategory.SEXUAL_HARASSMENT in categories_list
            )

            aria_analysis = SentimentAnalysis(
                original_message=message_data.content,
                toxicity_level=toxicity_level,
                toxicity_score=score,
                categories=categories_list,
                triggers=analysis_result.get("triggers", []),
                explanation=analysis_result.get("explanation", ""),
                suggestion=analysis_result["suggestions"][0] if analysis_result.get("suggestions") else None,
                is_flagged=score > 0.3,
                block_send=block_send,
                timestamp=datetime.utcnow()
            )
        else:
            # Default to regex
            aria_analysis = aria_service.analyze_message(message_data.content)
    else:
        # ARIA disabled - create clean result
        from app.services.aria import SentimentAnalysis, ToxicityLevel
        aria_analysis = SentimentAnalysis(
            original_message=message_data.content,
            toxicity_level=ToxicityLevel.NONE,
            toxicity_score=0.0,
            categories=[],
            triggers=[],
            explanation="ARIA disabled",
            suggestion=None,
            is_flagged=False,
            timestamp=datetime.utcnow()
        )

    # ==========================================================================
    # ARIA v2: Intercept flagged messages BEFORE saving — return rewrite modal
    # ==========================================================================
    aria_accepted_rewrite = getattr(message_data, 'aria_accepted_rewrite', False)

    if (
        aria_enabled
        and aria_analysis
        and aria_analysis.is_flagged
        and not aria_analysis.block_send
        and not aria_accepted_rewrite
    ):
        # Generate context-aware rewrite via Claude
        flag_reason = aria_analysis.explanation or "toxic content"
        rewrite = await aria_service.generate_contextual_rewrite(
            flagged_message=message_data.content,
            thread_history=thread_history,
            flag_reason=flag_reason,
            aria_mode=aria_mode
        )

        # LOG EVENT (Intercepted - before 202)
        # This ensures we track messages that were intercepted and potentially modified/cancelled
        await aria_service.log_event(
            db=db,
            user_id=str(current_user.id),
            family_file_id=message_data.family_file_id,
            message_id=f"intercept_{uuid.uuid4()}",
            content_type="text_intercept",
            analysis=aria_analysis,
            context_data={
                "thread_history_count": len(thread_history),
                "aria_mode": aria_mode
            }
        )

        # Return 202 with the rewrite so the frontend shows the modal
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=202,
            content={
                "aria_flagged": True,
                "aria_mode": aria_mode,
                "original_message": message_data.content,
                "suggested_rewrite": rewrite,
                "explanation": aria_analysis.explanation,
                "categories": [cat.value for cat in aria_analysis.categories],
                "toxicity_score": aria_analysis.toxicity_score,
            }
        )

    # In strict mode: if the message was flagged and user has NOT accepted a rewrite,
    # we block the send even if aria_accepted_rewrite is somehow missing.
    if (
        aria_mode == "strict"
        and aria_analysis
        and aria_analysis.is_flagged
        and not aria_analysis.block_send
        and not aria_accepted_rewrite
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ARIA Strict Mode: You must use the suggested rewrite before sending."
        )

    # Determine final content and original content based on intervention
    final_content = message_data.content
    original_content = None
    user_action = "pending"
    
    if aria_analysis and aria_analysis.is_flagged and message_data.intervention_action:
        action = message_data.intervention_action
        user_action = action.action
        
        # If flagged, track original content
        original_content = message_data.content
        
        if action.action == "accepted" and aria_analysis.suggestion:
            final_content = aria_analysis.suggestion
        elif action.action == "modified" and action.final_message:
            final_content = action.final_message
        elif action.action == "rejected" and action.final_message:
             final_content = action.final_message
        # "sent_anyway" keeps original content
            
    # Calculate content hash of the FINAL content
    content_hash = hashlib.sha256(final_content.encode()).hexdigest()

    # Create message
    new_message = Message(
        id=str(uuid.uuid4()),
        case_id=message_data.case_id,  # May be None for family file messages
        family_file_id=message_data.family_file_id,  # May be None for court case messages
        thread_id=message_data.thread_id,
        agreement_id=message_data.agreement_id,  # Link to SharedCare Agreement
        sender_id=current_user.id,
        recipient_id=message_data.recipient_id,

        content=final_content,
        content_hash=content_hash,
        message_type=message_data.message_type,
        sent_at=datetime.utcnow(),
        was_flagged=aria_analysis.is_flagged,
        original_content=original_content
    )

    # BLOCKING LOGIC: If blocked (Severe Threats / Hate Speech / Sexual Harassment)
    # Strict blocking: Reject the request entirely
    if aria_analysis.block_send:
        # Check if it was an admin override? No, for now strict block for everyone on these patterns.
        # LOG EVENT (Synchronous)
        await aria_service.log_event(
            db=db,
            user_id=str(current_user.id),
            family_file_id=message_data.family_file_id,
            message_id=str(new_message.id),
            content_type="text",
            analysis=aria_analysis,
            context_data={"preceding_messages": case_context}
        )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message blocked by ARIA Safety Shield: Content contains prohibited threats, hate speech, or sexual harassment."
        )

    # Legacy soft-block logic (kept for reference, but unreachable if we raise above)
    # if aria_analysis.block_send:
    #     new_message.is_hidden_by_recipient = True
    #     context_id = None

    if aria_analysis.is_flagged:
        # Calculate severity/level (reuse logic)
        score = aria_analysis.toxicity_score
        if score < 0.2:
            severity = "low"
            intervention_level = 1
        elif score < 0.5:
            severity = "medium"
            intervention_level = 2
        elif score < 0.8:
            severity = "high"
            intervention_level = 3
        else:
            severity = "severe"
            intervention_level = 4

        message_flag = MessageFlag(
            id=str(uuid.uuid4()),
            message_id=new_message.id,
            severity=severity,
            toxicity_score=aria_analysis.toxicity_score,
            categories=[cat.value for cat in aria_analysis.categories],
            suggested_content=aria_analysis.suggestion,
            user_action=user_action,
            original_content_hash=hashlib.sha256(message_data.content.encode()).hexdigest(),
            final_content_hash=content_hash,
            intervention_level=intervention_level,
            intervention_message=aria_analysis.explanation or "Content flagged by ARIA",
            created_at=datetime.utcnow()
        )
        db.add(message_flag)

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    # Log activity for the activity feed (only for family file messages)
    if message_data.family_file_id:
        try:
            sender_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await log_message_activity(
                db=db,
                family_file_id=message_data.family_file_id,
                sender_id=str(current_user.id),
                sender_name=sender_name or "Co-parent",
                message_id=new_message.id,
            )
        except Exception as e:
            # Don't fail message send if activity logging fails
            print(f"Activity logging failed: {e}")

    # Broadcast via WebSocket to recipient
    if context_id:
        try:
            await manager.broadcast_to_case(
                message={
                    "type": "new_message",
                    "message_id": str(new_message.id),
                    "sender_id": str(current_user.id),
                    "sender_name": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
                    "content": new_message.content,
                    "sent_at": new_message.sent_at.isoformat(),
                    "was_flagged": new_message.was_flagged
                },
                case_id=context_id,
                exclude_user=None  # Send to all including sender so all tabs update
            )
        except Exception as e:
            print(f"WebSocket broadcast failed: {e}")

    # ARIA v2: Generate reply suggestions for recipient in background
    if aria_enabled and aria_mode != "off" and message_data.family_file_id:
        background_tasks.add_task(
            _store_reply_suggestions,
            message_id=str(new_message.id),
            family_file_id=message_data.family_file_id,
            recipient_id=new_message.recipient_id,
            message_content=new_message.content,
            thread_history=thread_history,
            aria_mode=aria_mode
        )

    # Send push notification to recipient if they have subscriptions
    if new_message.recipient_id and new_message.recipient_id != current_user.id:
        try:
            sender_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            # Truncate content for push notification
            body_preview = new_message.content[:100] + "..." if len(new_message.content) > 100 else new_message.content
            await push_service.send_notification(
                db=db,
                user_id=new_message.recipient_id,
                title=f"New message from {sender_name}",
                body=body_preview,
                url=f"/messages?family_file_id={new_message.family_file_id}" if new_message.family_file_id else "/messages",
                tag=f"message-{context_id}" if context_id else "message",
                data={"message_id": str(new_message.id), "sender_id": str(current_user.id)}
            )
        except Exception as e:
            print(f"Push notification failed: {e}")

    return MessageResponse(
        id=new_message.id,
        case_id=new_message.case_id,
        family_file_id=new_message.family_file_id,
        thread_id=new_message.thread_id,
        agreement_id=new_message.agreement_id,
        sender_id=new_message.sender_id,
        recipient_id=new_message.recipient_id,
        content=new_message.content,
        message_type=new_message.message_type,
        sent_at=new_message.sent_at,
        delivered_at=new_message.delivered_at,
        read_at=new_message.read_at,
        acknowledged_at=new_message.acknowledged_at,
        was_flagged=new_message.was_flagged,
        original_content=None
    )


@router.get("/{message_id}/suggestions")
async def get_reply_suggestions(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ARIA v2: Fetch reply suggestions generated for an incoming message.

    Only the recipient of the original message can fetch suggestions.
    Returns the list of suggested reply strings.
    """
    # Verify the message exists and user is the recipient
    msg_result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = msg_result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.recipient_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the recipient can view reply suggestions")

    # Fetch from aria_reply_suggestions
    result = await db.execute(
        text("""
            SELECT suggestions, was_used, created_at
            FROM aria_reply_suggestions
            WHERE message_id = :msg_id
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"msg_id": message_id}
    )
    row = result.fetchone()

    if not row:
        return {"message_id": message_id, "suggestions": []}

    suggestions = row[0] if isinstance(row[0], list) else json.loads(row[0])
    return {
        "message_id": message_id,
        "suggestions": suggestions,
        "was_used": row[1],
        "created_at": row[2].isoformat() if row[2] else None
    }


@router.patch("/{message_id}/suggestions/mark-used")
async def mark_suggestion_used(
    message_id: str,
    suggestion_index: int = Query(0, ge=0, le=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ARIA v2: Mark a reply suggestion as used (analytics)."""
    await db.execute(
        text("""
            UPDATE aria_reply_suggestions
            SET was_used = true, used_suggestion_index = :idx
            WHERE message_id = :msg_id AND recipient_id = :recip
        """),
        {"msg_id": message_id, "recip": str(current_user.id), "idx": suggestion_index}
    )
    await db.commit()
    return {"status": "ok"}


@router.patch("/family-file/{family_file_id}/aria-mode")
async def update_aria_mode(
    family_file_id: str,
    aria_mode: str = Query(..., regex="^(off|standard|strict)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ARIA v2: Update the ARIA mode for a family file.
    Values: off | standard | strict
    Both parents can change the mode.
    """
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(status_code=404, detail="Family file not found")

    if str(current_user.id) not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(status_code=403, detail="You don't have access to this family file")

    family_file.aria_mode = aria_mode
    await db.commit()

    return {"family_file_id": family_file_id, "aria_mode": aria_mode, "status": "updated"}



async def handle_intervention_response(
    message_id: str,
    action: InterventionAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Handle user's response to ARIA intervention.
    
    User can:
    - Accept the suggestion (use ARIA's rewrite)
    - Modify the suggestion
    - Reject and rewrite themselves
    - Send anyway (if not red level)
    
    Args:
        message_id: Message ID that was flagged
        action: User's intervention action
        
    Returns:
        Updated message
    """
    # Get message
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user is sender
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own messages"
        )
    
    # Get the message flag
    flag_result = await db.execute(
        select(MessageFlag).where(MessageFlag.message_id == message_id)
    )
    flag = flag_result.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No intervention found for this message"
        )
    
    # Update flag with user action
    flag.user_action = action.action
    flag.notes = action.notes
    
    # Update message content based on action
    if action.action == "accepted":
        # Use ARIA's suggestion
        message.original_content = message.content
        message.content = flag.suggested_content
    elif action.action == "modified":
        # Use user's modified version
        message.original_content = message.content
        message.content = action.final_message
    elif action.action == "rejected":
        # User rewrote themselves
        message.original_content = message.content
        message.content = action.final_message
    # "sent_anyway" keeps original content
    
    # SAFETY CHECK: If trying to send a SEVERE blocked message, forbid it
    if action.action == "sent_anyway" and flag.severity == "severe":
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot send messages with severe safety threats."
        )

    # If action was "sent_anyway" or "modified" on a previously blocked message,
    # we might need to unhide it IF it's now safe.
    # But if it was "severe" and we are here, we rejected sent_anyway above.
    # If modified, it might be safe now.
    
    if message.is_hidden_by_recipient and action.action in ["modified", "accepted"]:
        # If they modified it or accepted suggestion, it's presumably safe now
        # (The new content is either the suggestion or the user's manual edit)
        # However, for manual edits (modified), we might want to re-analyze? 
        # For now, we assume user modification implies they fixed it or we rely on frontend re-check.
        # But to be safe, we unhide it.
        message.is_hidden_by_recipient = False
        
        # We should also trigger the websocket broadcast now since it wasn't sent before
        # NOTE: This complicates things as we need the context_id again.
        # For this implementation, we will update the DB status. Real-time delivery might need a separate trigger
        # or we assume polling.
        pass

    await db.commit()
    await db.refresh(message)
    
    return MessageResponse(
        id=message.id,
        case_id=message.case_id,
        family_file_id=getattr(message, 'family_file_id', None),
        thread_id=message.thread_id,
        agreement_id=message.agreement_id,
        sender_id=message.sender_id,
        recipient_id=message.recipient_id,
        content=message.content,
        message_type=message.message_type,
        sent_at=message.sent_at,
        delivered_at=message.delivered_at,
        read_at=message.read_at,
        acknowledged_at=message.acknowledged_at,
        was_flagged=message.was_flagged,
        original_content=message.original_content
    )


@router.get("/case/{case_id}", response_model=List[MessageResponse])
async def list_messages(
    case_id: str,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get messages for a case.

    Args:
        case_id: Case ID
        limit: Number of messages to return
        offset: Offset for pagination

    Returns:
        List of messages (most recent first) with attachments
    """
    # Verify access
    result = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == current_user.id,
                CaseParticipant.is_active == True
            )
        )
    )
    participant = result.scalar_one_or_none()

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this case"
        )

    # Get messages with attachments
    messages_result = await db.execute(
        select(Message)
        .options(selectinload(Message.attachments))
        .where(Message.case_id == case_id)
        .order_by(desc(Message.sent_at))
        .limit(limit)
        .offset(offset)
    )
    messages = messages_result.scalars().all()

    return [
        MessageResponse(
            id=msg.id,
            case_id=msg.case_id,
            family_file_id=getattr(msg, 'family_file_id', None),
            thread_id=msg.thread_id,
            agreement_id=msg.agreement_id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            content=msg.content,
            message_type=msg.message_type,
            sent_at=msg.sent_at,
            delivered_at=msg.delivered_at,
            read_at=msg.read_at,
            acknowledged_at=msg.acknowledged_at,
            was_flagged=msg.was_flagged,
            original_content=msg.original_content,
            attachments=[
                MessageAttachmentResponse(
                    id=att.id,
                    message_id=att.message_id,
                    family_file_id=att.family_file_id,
                    file_name=att.file_name,
                    file_type=att.file_type,
                    file_size=att.file_size,
                    file_category=att.file_category,
                    storage_path=att.storage_path,
                    storage_url=att.storage_url,
                    sha256_hash=att.sha256_hash,
                    virus_scanned=att.virus_scanned,
                    uploaded_by=att.uploaded_by,
                    uploaded_at=att.uploaded_at,
                )
                for att in (msg.attachments or [])
            ]
        )
        for msg in messages
    ]


@router.get("/family-file/{family_file_id}", response_model=List[MessageResponse])
async def list_messages_by_family_file(
    family_file_id: str,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get messages for a family file.

    Args:
        family_file_id: Family File ID
        limit: Number of messages to return
        offset: Offset for pagination

    Returns:
        List of messages (oldest first) with attachments
    """
    # Verify user has access to family file
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this family file"
        )

    # Get messages with attachments, ordered newest first (to get the latest)
    messages_result = await db.execute(
        select(Message)
        .options(selectinload(Message.attachments))
        .where(
            and_(
                Message.family_file_id == family_file_id,
                Message.is_hidden_by_recipient == False
            )
        )
        .order_by(desc(Message.sent_at))  # Newest first to get the tail
        .limit(limit)
        .offset(offset)
    )
    # Reverse to restore chronological order (Oldest -> Newest) for the UI
    messages = list(reversed(messages_result.scalars().all()))

    return [
        MessageResponse(
            id=msg.id,
            case_id=msg.case_id,
            family_file_id=msg.family_file_id,
            thread_id=msg.thread_id,
            agreement_id=msg.agreement_id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            content=msg.content,
            message_type=msg.message_type,
            sent_at=msg.sent_at,
            delivered_at=msg.delivered_at,
            read_at=msg.read_at,
            acknowledged_at=msg.acknowledged_at,
            was_flagged=msg.was_flagged,
            original_content=msg.original_content,
            attachments=[
                MessageAttachmentResponse(
                    id=att.id,
                    message_id=att.message_id,
                    family_file_id=att.family_file_id,
                    file_name=att.file_name,
                    file_type=att.file_type,
                    file_size=att.file_size,
                    file_category=att.file_category,
                    storage_path=att.storage_path,
                    storage_url=att.storage_url,
                    sha256_hash=att.sha256_hash,
                    virus_scanned=att.virus_scanned,
                    uploaded_by=att.uploaded_by,
                    uploaded_at=att.uploaded_at,
                )
                for att in (msg.attachments or [])
            ]
        )
        for msg in messages
    ]


@router.get("/agreement/{agreement_id}", response_model=List[MessageResponse])
async def list_messages_by_agreement(
    agreement_id: str,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get messages for a specific SharedCare Agreement.

    This is the primary way to get messages in the new agreement-centric architecture.

    Args:
        agreement_id: Agreement ID
        limit: Number of messages to return
        offset: Offset for pagination

    Returns:
        List of messages (most recent first) with attachments
    """
    from app.models.agreement import Agreement
    from app.services.agreement import AgreementService

    # Verify user has access to the agreement
    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    # Get messages for this agreement with attachments eagerly loaded
    messages_result = await db.execute(
        select(Message)
        .options(selectinload(Message.attachments))
        .where(Message.agreement_id == agreement_id)
        .order_by(desc(Message.sent_at))
        .limit(limit)
        .offset(offset)
    )
    messages = messages_result.scalars().all()

    return [
        MessageResponse(
            id=msg.id,
            case_id=msg.case_id,
            family_file_id=getattr(msg, 'family_file_id', None),
            thread_id=msg.thread_id,
            agreement_id=msg.agreement_id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            content=msg.content,
            message_type=msg.message_type,
            sent_at=msg.sent_at,
            delivered_at=msg.delivered_at,
            read_at=msg.read_at,
            acknowledged_at=msg.acknowledged_at,
            was_flagged=msg.was_flagged,
            original_content=msg.original_content,
            attachments=[
                MessageAttachmentResponse(
                    id=att.id,
                    message_id=att.message_id,
                    family_file_id=att.family_file_id,
                    file_name=att.file_name,
                    file_type=att.file_type,
                    file_size=att.file_size,
                    file_category=att.file_category,
                    storage_path=att.storage_path,
                    storage_url=att.storage_url,
                    sha256_hash=att.sha256_hash,
                    virus_scanned=att.virus_scanned,
                    uploaded_by=att.uploaded_by,
                    uploaded_at=att.uploaded_at,
                )
                for att in (msg.attachments or [])
            ]
        )
        for msg in messages
    ]


@router.post("/family-file/{family_file_id}/mark-read")
async def mark_messages_as_read(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark all unread messages as read for the current user in a family file.

    This should be called when the user views the messages page.

    Args:
        family_file_id: Family file ID

    Returns:
        Count of messages marked as read
    """
    # Verify user has access to family file
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    if current_user.id not in [family_file.parent_a_id, family_file.parent_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this family file"
        )

    # Mark all unread messages where user is recipient as read
    from sqlalchemy import update

    result = await db.execute(
        update(Message)
        .where(
            and_(
                Message.family_file_id == family_file_id,
                Message.recipient_id == str(current_user.id),
                Message.read_at.is_(None)
            )
        )
        .values(read_at=datetime.utcnow())
    )

    await db.commit()

    return {"marked_read": result.rowcount}


@router.post("/{message_id}/acknowledge", response_model=MessageResponse)
async def acknowledge_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Acknowledge a message without sending a response.

    This allows recipients to indicate they've seen and acknowledged
    a message without needing to write a reply.

    Args:
        message_id: Message ID to acknowledge

    Returns:
        Updated message with acknowledged_at timestamp

    Raises:
        404: Message not found
        403: Not authorized (only recipient can acknowledge)
        400: Already acknowledged
    """
    # Get message
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    # Verify user is the recipient
    if message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recipient can acknowledge a message"
        )

    # Check if already acknowledged
    if message.acknowledged_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message already acknowledged"
        )

    # Set acknowledged timestamp
    message.acknowledged_at = datetime.utcnow()

    # Also mark as read if not already
    if not message.read_at:
        message.read_at = datetime.utcnow()

    await db.commit()
    await db.refresh(message)

    # Broadcast acknowledgment via WebSocket
    context_id = message.family_file_id or message.case_id
    if context_id:
        try:
            await manager.broadcast_to_case(
                message={
                    "type": "message_acknowledged",
                    "message_id": str(message.id),
                    "acknowledged_by": str(current_user.id),
                    "acknowledged_at": message.acknowledged_at.isoformat()
                },
                case_id=context_id,
                exclude_user=None
            )
        except Exception as e:
            logger.warning(f"WebSocket broadcast failed: {e}")

    return MessageResponse(
        id=message.id,
        case_id=message.case_id,
        family_file_id=message.family_file_id,
        thread_id=message.thread_id,
        agreement_id=message.agreement_id,
        sender_id=message.sender_id,
        recipient_id=message.recipient_id,
        content=message.content,
        message_type=message.message_type,
        sent_at=message.sent_at,
        delivered_at=message.delivered_at,
        read_at=message.read_at,
        acknowledged_at=message.acknowledged_at,
        was_flagged=message.was_flagged,
        original_content=message.original_content
    )


@router.get("/analytics/{case_id}/user", response_model=AnalyticsResponse)
async def get_user_analytics(
    case_id: str,
    period_days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get good faith communication metrics for current user.
    
    Args:
        case_id: Case ID
        period_days: Analysis period (default: 30 days)
        
    Returns:
        Communication quality metrics
    """
    # Verify access
    result = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == current_user.id,
                CaseParticipant.is_active == True
            )
        )
    )
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this case"
        )
    
    # Calculate metrics
    metrics = await aria_service.calculate_good_faith_metrics(
        db=db,
        user_id=current_user.id,
        case_id=case_id,
        period_days=period_days
    )
    
    return AnalyticsResponse(**metrics)


@router.get("/analytics/{case_id}/conversation")
async def get_conversation_health(
    case_id: str,
    period_days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overall conversation health for the case.
    
    Both parents can see this to understand communication quality.
    
    Args:
        case_id: Case ID
        period_days: Analysis period
        
    Returns:
        Overall conversation health metrics
    """
    # Verify access
    result = await db.execute(
        select(CaseParticipant).where(
            and_(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == current_user.id,
                CaseParticipant.is_active == True
            )
        )
    )
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this case"
        )
    
    # Get conversation health
    health = await aria_service.get_conversation_health(
        db=db,
        case_id=case_id,
        period_days=period_days
    )

    return health


# ========================================
# Message Attachment Endpoints
# ========================================


@router.post("/{message_id}/attachments", response_model=AttachmentUploadResponse)
async def upload_message_attachment(
    message_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an attachment to a message.

    Args:
        message_id: Message ID to attach file to
        file: File upload (max 150MB)

    Returns:
        Attachment details

    Raises:
        404: Message not found or no access
        400: Invalid file type or size
    """
    # Get message and verify access
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    # Verify user is sender or recipient
    if message.sender_id != current_user.id and message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this message"
        )

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # Validate file
    is_valid, file_category, error_message = validate_attachment(
        content_type=file.content_type or "application/octet-stream",
        file_size=file_size
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    # Generate SHA-256 hash for integrity
    sha256_hash = hashlib.sha256(file_content).hexdigest()

    # Determine family_file_id (prefer family_file_id, fall back to case)
    family_file_id = message.family_file_id
    if not family_file_id and message.case_id:
        # Legacy: Get family file from case
        case_result = await db.execute(
            select(Case).where(Case.id == message.case_id)
        )
        case = case_result.scalar_one_or_none()
        if case and case.family_file_id:
            family_file_id = case.family_file_id

    if not family_file_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload attachment: no family file associated with message"
        )

    # Build storage path
    storage_path = build_attachment_path(
        family_file_id=family_file_id,
        message_id=message_id,
        filename=file.filename or f"attachment-{uuid.uuid4()}"
    )

    # Upload to Supabase Storage
    try:
        storage_url = await storage_service.upload_file(
            bucket=StorageBucket.MESSAGE_ATTACHMENTS,
            path=storage_path,
            file_content=file_content,
            content_type=file.content_type or "application/octet-stream",
            upsert=True
        )
    except Exception as e:
        logger.error(f"Failed to upload attachment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file to storage"
        )

    # Create attachment record
    attachment = MessageAttachment(
        message_id=message_id,
        family_file_id=family_file_id,
        file_name=file.filename or "unnamed",
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        file_category=file_category or "document",
        storage_path=storage_path,
        storage_url=storage_url,
        sha256_hash=sha256_hash,
        virus_scanned=False,  # TODO: Integrate virus scanning service
        uploaded_by=current_user.id,
        uploaded_at=datetime.utcnow(),
    )

    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    logger.info(f"User {current_user.id} uploaded attachment {attachment.id} to message {message_id}")

    # --- VISUAL MODERATION TRIGGER (SYNCHRONOUS ENFORCEMENT) ---
    if file_category == "image":
        # 1. Run Analysis Synchronously (Blocking)
        # We need to ensure safety before confirming the upload
        from app.services.aria_inference import analyze_image_with_llm
        import asyncio
        from functools import partial

        # Run blocking LLM call in thread pool
        loop = asyncio.get_event_loop()
        analysis = await loop.run_in_executor(
            None, 
            partial(analyze_image_with_llm, message_id, storage_url)
        )

        # 2. Check Verdict
        action = analysis.get("action", "ALLOW")
        
        if action == "BLOCK" or action == "FLAG":
            from app.services.aria import SentimentAnalysis, ToxicityLevel, ToxicityCategory
            
            # Map Vision labels to ToxicityCategory
            categories = []
            for label in analysis.get("labels", []):
                if label["score"] > 0.5:
                    if label["name"] == "Nudity":
                        categories.append(ToxicityCategory.SEXUAL_HARASSMENT)
                    elif label["name"] in ["Violence", "Weapons", "SelfHarm"]:
                        categories.append(ToxicityCategory.THREATENING)
                    elif label["name"] == "HateSymbols":
                        categories.append(ToxicityCategory.HATE_SPEECH)
            
            # Create SentimentAnalysis object for logging
            vision_analysis = SentimentAnalysis(
                original_message=f"Image Attachment: {file.filename}",
                toxicity_level=ToxicityLevel.SEVERE if action == "BLOCK" else ToxicityLevel.HIGH,
                toxicity_score=analysis.get("severity", 1.0),
                categories=categories,
                triggers=[l["name"] for l in analysis.get("labels", []) if l["score"] > 0.5],
                explanation=analysis.get("explanation", "Flagged by ARIA Vision"),
                suggestion=None,
                is_flagged=True,
                block_send=(action == "BLOCK"),
                timestamp=datetime.utcnow()
            )
            
            # Log the event
            await aria_service.log_event(
                db=db,
                user_id=str(current_user.id),
                family_file_id=family_file_id,
                message_id=message_id,  # Note: Message exists, but attachment might be deleted
                content_type="image",
                analysis=vision_analysis,
                context_data={"file_name": file.filename, "storage_path": storage_path}
            )

        if action == "BLOCK":
            logger.warning(f"BLOCKED UNSAFE IMAGE upload for user {current_user.id}: {analysis.get('explanation')}")
            
            # 3. Cleanup: Delete the unsafe file from storage
            try:
                await storage_service.delete_file(
                    bucket=StorageBucket.MESSAGE_ATTACHMENTS,
                    path=storage_path
                )
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup unsafe file: {cleanup_error}")

            # 4. Cleanup: Remove DB record (since we haven't committed yet? 
            # Actually we typically commit before returning, let's check strict flow)
            # The current code adds and commits at lines 1358-1359.
            # We should move the commit AFTER this check or delete the record.
            
            # Since we already committed above (lines 1359), we must delete the record.
            # 4. Cleanup: Remove DB record
            await db.delete(attachment)
            
            # LOG BLOCK EVENT
            try:
                stmt = text("""
                    INSERT INTO aria_events (
                        message_id, user_id, family_file_id, content_type,
                        classification_source, model_version,
                        toxicity_score, severity_level, labels,
                        action_taken, intervention_text, explanation,
                        context_data, original_content
                    ) VALUES (
                        :msg_id, :uid, :ff_id, 'image',
                        'llm', 'gpt-4o',
                        :score, 'severe', :labels,
                        'blocked', :explanation, :explanation,
                        :ctx_data, :orig_content
                    )
                """)
                await db.execute(stmt, {
                    "msg_id": message_id,
                    "uid": str(current_user.id),
                    "ff_id": family_file_id,
                    "score": analysis.get("severity", 1.0),
                    "labels": json.dumps(analysis.get("labels", [])),
                    "explanation": analysis.get("explanation", ""),
                    "ctx_data": None,
                    "orig_content": storage_url
                })
                # Commit deletion and log
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to log ARIA BLOCK event: {e}")
                # Try to commit the deletion at least
                try: 
                    await db.commit()
                except: 
                    pass

            # 5. Return Error to User
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image blocked by ARIA Safety Shield: {analysis.get('explanation', 'Unsafe content detected')}"
            )
        
        # If not blocked, we can still log the event for the worker (or just create the event here)
        # To avoid duplicate work, we can SKIP the queue since we already have the result.
        # But for now, let's just logging it.
        # Ideally we should save the event here since we paid for the token usage.
        
        # Log Success Event
        try:
            stmt = text("""
                INSERT INTO aria_events (
                    message_id, user_id, family_file_id, content_type,
                    classification_source, model_version,
                    toxicity_score, severity_level, labels,
                    action_taken, intervention_text, explanation,
                    context_data, original_content
                ) VALUES (
                    :msg_id, :uid, :ff_id, 'image',
                     'llm', 'gpt-4o',
                    :score, 'computed_now', :labels,
                    :action, :explanation, :explanation,
                    :ctx_data, :orig_content
                )
            """)
            await db.execute(stmt, {
                "msg_id": message_id,
                "uid": str(current_user.id),
                "ff_id": family_file_id,
                "score": analysis.get("severity", 0.0),
                "labels": json.dumps(analysis.get("labels", [])),
                "action": action,
                "explanation": analysis.get("explanation", ""),
                "ctx_data": None,
                "orig_content": storage_url
            })
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to log ARIA event: {e}")

    # ---------------------------------

    return {
        "attachment": attachment,
        "message": "Attachment uploaded successfully"
    }



@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a message (soft delete or hard delete depending on policy).
    For now, strict deletion for blocked/failed messages cleanup.
    """
    # Get message
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
        
    # Only sender can delete (or admin)
    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this message"
        )
        
    # Delete attachments first (if any)
    # We should also clean up storage, but let's stick to DB record for now
    # or rely on cascades.
    
    await db.delete(message)
    await db.commit()
    
    return None

@router.get("/{message_id}/attachments", response_model=List[MessageAttachmentResponse])
async def get_message_attachments(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all attachments for a message.

    Args:
        message_id: Message ID

    Returns:
        List of attachments

    Raises:
        404: Message not found or no access
    """
    # Get message and verify access
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    # Verify user is sender or recipient
    if message.sender_id != current_user.id and message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this message"
        )

    # Get attachments
    attachments_result = await db.execute(
        select(MessageAttachment)
        .where(MessageAttachment.message_id == message_id)
        .order_by(MessageAttachment.uploaded_at)
    )
    attachments = list(attachments_result.scalars().all())

    return attachments


@router.delete("/attachments/{attachment_id}")
async def delete_message_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a message attachment.

    Only the uploader can delete their own attachments.

    Args:
        attachment_id: Attachment ID

    Returns:
        Success message

    Raises:
        404: Attachment not found
        403: Not authorized to delete
    """
    # Get attachment
    result = await db.execute(
        select(MessageAttachment).where(MessageAttachment.id == attachment_id)
    )
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    # Verify uploader
    if attachment.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own attachments"
        )

    # Delete from storage
    try:
        await storage_service.delete_file(
            bucket=StorageBucket.MESSAGE_ATTACHMENTS,
            path=attachment.storage_path
        )
    except Exception as e:
        logger.warning(f"Failed to delete file from storage: {e}")
        # Continue with database deletion even if storage fails

    # Delete from database
    await db.delete(attachment)
    await db.commit()

    logger.info(f"User {current_user.id} deleted attachment {attachment_id}")

    return {"message": "Attachment deleted successfully"}
