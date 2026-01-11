"""
Message endpoints with ARIA integration.

Handles parent-to-parent communication with AI-powered conflict prevention.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.message import Message, MessageFlag, MessageThread
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
    ThreadResponse
)
from app.services.aria import aria_service
from app.services.activity import log_message_activity
from app.core.websocket import manager
from datetime import datetime
import uuid
import hashlib


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
    ai_provider = "regex"
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
        ai_provider = family_file.aria_provider or "regex"

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
        ai_provider = case.aria_provider or "regex"

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
        # Fast regex analysis (ai_provider="regex" or default)
        result = aria_service.analyze_message(content)
        analysis = {
            "toxicity_score": result.toxicity_score,
            "categories": [cat.value for cat in result.categories],
            "triggers": result.triggers,
            "explanation": result.explanation,
            "suggestions": [result.suggestion] if result.suggestion else [],
            "ai_powered": False,
            "provider": "regex"
        }

    # Determine if flagged
    is_flagged = analysis["toxicity_score"] > 0.3

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


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
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
    ai_provider = "regex"
    case_context = {"children": []}
    context_id = None  # For WebSocket broadcast

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
        ai_provider = family_file.aria_provider or "regex"
        context_id = message_data.family_file_id

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
        ai_provider = case.aria_provider or "regex"
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

            aria_analysis = SentimentAnalysis(
                original_message=message_data.content,
                toxicity_level=toxicity_level,
                toxicity_score=score,
                categories=[ToxicityCategory(cat) for cat in analysis_result.get("categories", [])],
                triggers=analysis_result.get("triggers", []),
                explanation=analysis_result.get("explanation", ""),
                suggestion=analysis_result["suggestions"][0] if analysis_result.get("suggestions") else None,
                is_flagged=score > 0.3,
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

            aria_analysis = SentimentAnalysis(
                original_message=message_data.content,
                toxicity_level=toxicity_level,
                toxicity_score=score,
                categories=[ToxicityCategory(cat) for cat in analysis_result.get("categories", [])],
                triggers=analysis_result.get("triggers", []),
                explanation=analysis_result.get("explanation", ""),
                suggestion=analysis_result["suggestions"][0] if analysis_result.get("suggestions") else None,
                is_flagged=score > 0.3,
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

    # Calculate content hash
    content_hash = hashlib.sha256(message_data.content.encode()).hexdigest()

    # Create message
    new_message = Message(
        id=str(uuid.uuid4()),
        case_id=message_data.case_id,  # May be None for family file messages
        family_file_id=message_data.family_file_id,  # May be None for court case messages
        thread_id=message_data.thread_id,
        agreement_id=message_data.agreement_id,  # Link to SharedCare Agreement
        sender_id=current_user.id,
        recipient_id=message_data.recipient_id,
        content=message_data.content,
        content_hash=content_hash,
        message_type=message_data.message_type,
        sent_at=datetime.utcnow(),
        was_flagged=aria_analysis.is_flagged
    )

    # If flagged, create MessageFlag for analytics
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
            user_action="pending",
            original_content_hash=content_hash,
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
            await manager.send_message(
                case_id=context_id,
                message={
                    "type": "new_message",
                    "message_id": new_message.id,
                    "sender_id": current_user.id,
                    "content": new_message.content,
                    "sent_at": new_message.sent_at.isoformat(),
                    "was_flagged": new_message.was_flagged
                }
            )
        except Exception as e:
            print(f"WebSocket broadcast failed: {e}")

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
        was_flagged=new_message.was_flagged,
        original_content=None
    )


@router.post("/{message_id}/intervention", response_model=MessageResponse)
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
        List of messages (most recent first)
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
    
    # Get messages
    messages_result = await db.execute(
        select(Message)
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
            was_flagged=msg.was_flagged,
            original_content=msg.original_content
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
        List of messages (most recent first)
    """
    from app.models.agreement import Agreement
    from app.services.agreement import AgreementService

    # Verify user has access to the agreement
    agreement_service = AgreementService(db)
    agreement = await agreement_service.get_agreement(agreement_id, current_user)

    # Get messages for this agreement
    messages_result = await db.execute(
        select(Message)
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
            was_flagged=msg.was_flagged,
            original_content=msg.original_content
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
