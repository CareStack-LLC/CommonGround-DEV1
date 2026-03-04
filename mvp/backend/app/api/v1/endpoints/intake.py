"""
ARIA Paralegal - Intake API Endpoints.

Provides endpoints for:
- Professionals to create and manage intake sessions
- Parents to access and complete intakes
- Retrieving outputs (summary, transcript, draft forms)
"""

from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.intake import (
    IntakeSession,
    IntakeQuestion,
    IntakeExtraction,
    IntakeStatus,
    generate_session_number,
    generate_access_token,
)
from app.models.court import CourtProfessional, CourtAccessGrant
from app.models.case import Case
from app.models.child import Child
from app.schemas.intake import (
    IntakeSessionCreate,
    IntakeSessionResponse,
    IntakeSessionList,
    IntakeSessionListItem,
    IntakeAccessResponse,
    IntakeMessageRequest,
    IntakeMessageResponse,
    IntakeConfirmRequest,
    IntakeClarificationRequest,
    IntakeSummaryResponse,
    IntakeTranscriptResponse,
    IntakeOutputs,
    IntakeQuestionCreate,
    IntakeQuestionResponse,
    IntakeQuestionList,
)
from app.services.aria_paralegal import AriaParalegalService
from app.core.config import settings

router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

async def get_professional_from_user(
    db: AsyncSession,
    user: User
) -> CourtProfessional:
    """Get court professional record for user."""
    result = await db.execute(
        select(CourtProfessional).where(CourtProfessional.email == user.email)
    )
    professional = result.scalar_one_or_none()
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Court professional account required"
        )
    return professional


async def get_session_by_id(
    db: AsyncSession,
    session_id: str,
    professional_id: Optional[str] = None
) -> IntakeSession:
    """Get intake session by ID with optional professional check."""
    query = select(IntakeSession).where(IntakeSession.id == session_id)
    if professional_id:
        query = query.where(IntakeSession.professional_id == professional_id)

    result = await db.execute(query)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake session not found"
        )
    return session


async def get_session_by_token(
    db: AsyncSession,
    token: str
) -> IntakeSession:
    """Get intake session by access token."""
    result = await db.execute(
        select(IntakeSession).where(IntakeSession.access_token == token)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid intake link"
        )
    return session


# =============================================================================
# Professional Endpoints
# =============================================================================

@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_intake_session(
    data: IntakeSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new intake session.

    Professional creates intake request for a parent. Generates secure
    access link that can be sent to the parent.
    """
    professional = await get_professional_from_user(db, current_user)

    # Verify case exists and professional has access
    case_result = await db.execute(
        select(Case).where(Case.id == data.case_id)
    )
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Verify parent is part of the case
    if data.parent_id not in [case.petitioner_id, case.respondent_id]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent is not a party to this case"
        )

    # Create session
    session = IntakeSession(
        session_number=generate_session_number(),
        case_id=data.case_id,
        family_file_id=data.family_file_id,
        professional_id=professional.id,
        parent_id=data.parent_id,
        access_token=generate_access_token(),
        access_link_expires_at=datetime.utcnow() + timedelta(days=data.expires_in_days),
        target_forms=data.target_forms,
        custom_questions=data.custom_questions,
        status=IntakeStatus.PENDING.value,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "id": session.id,
        "session_number": session.session_number,
        "intake_link": f"{settings.FRONTEND_URL}/intake/{session.access_token}",
        "access_token": session.access_token,
        "expires_at": session.access_link_expires_at,
        "target_forms": session.target_forms,
        "status": session.status,
        "message": "Intake session created. Send the link to the parent."
    }


@router.get("/sessions", response_model=IntakeSessionList)
async def list_intake_sessions(
    case_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List intake sessions for professional's cases.
    """
    professional = await get_professional_from_user(db, current_user)

    query = select(IntakeSession).where(
        IntakeSession.professional_id == professional.id
    )

    if case_id:
        query = query.where(IntakeSession.case_id == case_id)
    if status_filter:
        query = query.where(IntakeSession.status == status_filter)

    query = query.order_by(IntakeSession.created_at.desc())

    result = await db.execute(query)
    sessions = result.scalars().all()

    return {
        "items": [
            {
                "id": s.id,
                "session_number": s.session_number,
                "case_id": s.case_id,
                "parent_id": s.parent_id,
                "target_forms": s.target_forms,
                "status": s.status,
                "message_count": s.message_count,
                "parent_confirmed": s.parent_confirmed,
                "professional_reviewed": s.professional_reviewed,
                "clarification_requested": s.clarification_requested,
                "access_link_expires_at": s.access_link_expires_at,
                "created_at": s.created_at,
            }
            for s in sessions
        ],
        "total": len(sessions)
    }


@router.get("/sessions/{session_id}")
async def get_intake_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed intake session information.
    """
    professional = await get_professional_from_user(db, current_user)
    session = await get_session_by_id(db, session_id, professional.id)

    return {
        "id": session.id,
        "session_number": session.session_number,
        "case_id": session.case_id,
        "family_file_id": session.family_file_id,
        "professional_id": session.professional_id,
        "parent_id": session.parent_id,
        "intake_link": f"{settings.FRONTEND_URL}/intake/{session.access_token}",
        "access_link_expires_at": session.access_link_expires_at,
        "access_link_used_at": session.access_link_used_at,
        "target_forms": session.target_forms,
        "custom_questions": session.custom_questions,
        "status": session.status,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
        "message_count": session.message_count,
        "parent_confirmed": session.parent_confirmed,
        "parent_confirmed_at": session.parent_confirmed_at,
        "professional_reviewed": session.professional_reviewed,
        "professional_reviewed_at": session.professional_reviewed_at,
        "clarification_requested": session.clarification_requested,
        "clarification_request": session.clarification_request,
        "clarification_response": session.clarification_response,
        "aria_summary": session.aria_summary,
        "extracted_data": session.extracted_data,
        "draft_form_url": session.draft_form_url,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }


@router.get("/sessions/{session_id}/transcript")
async def get_intake_transcript(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get full conversation transcript.
    """
    professional = await get_professional_from_user(db, current_user)
    session = await get_session_by_id(db, session_id, professional.id)

    return {
        "session_number": session.session_number,
        "messages": session.messages,
        "message_count": session.message_count,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
    }


@router.get("/sessions/{session_id}/summary")
async def get_intake_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ARIA summary of the intake.
    """
    professional = await get_professional_from_user(db, current_user)
    session = await get_session_by_id(db, session_id, professional.id)

    # Generate summary if not exists
    if not session.aria_summary and session.message_count > 2:
        service = AriaParalegalService(db)
        await service.generate_summary(session)

    return {
        "session_number": session.session_number,
        "aria_summary": session.aria_summary,
        "extracted_data": session.extracted_data,
        "target_forms": session.target_forms,
        "message_count": session.message_count,
        "parent_confirmed": session.parent_confirmed,
    }


@router.get("/sessions/{session_id}/outputs")
async def get_intake_outputs(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all outputs from completed intake.
    """
    professional = await get_professional_from_user(db, current_user)
    session = await get_session_by_id(db, session_id, professional.id)

    return {
        "session_number": session.session_number,
        "status": session.status,
        "parent_confirmed": session.parent_confirmed,
        "parent_confirmed_at": session.parent_confirmed_at,
        "aria_summary": session.aria_summary,
        "extracted_data": session.extracted_data,
        "messages": session.messages,
        "message_count": session.message_count,
        "draft_form_url": session.draft_form_url,
        "draft_form_generated_at": session.draft_form_generated_at,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
        "target_forms": session.target_forms,
    }


@router.post("/sessions/{session_id}/request-clarification")
async def request_clarification(
    session_id: str,
    data: IntakeClarificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Request additional information from parent.
    """
    professional = await get_professional_from_user(db, current_user)
    session = await get_session_by_id(db, session_id, professional.id)

    service = AriaParalegalService(db)
    session = await service.request_clarification(session, data.clarification_request)

    return {
        "session_number": session.session_number,
        "clarification_requested": True,
        "clarification_request": session.clarification_request,
        "message": "Clarification request sent to parent"
    }


@router.patch("/sessions/{session_id}/reviewed")
async def mark_session_reviewed(
    session_id: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark intake session as reviewed by professional.
    """
    professional = await get_professional_from_user(db, current_user)
    session = await get_session_by_id(db, session_id, professional.id)

    session.professional_reviewed = True
    session.professional_reviewed_at = datetime.utcnow()
    if notes:
        session.professional_notes = notes

    await db.commit()
    await db.refresh(session)

    return {
        "session_number": session.session_number,
        "professional_reviewed": True,
        "professional_reviewed_at": session.professional_reviewed_at,
        "message": "Intake marked as reviewed"
    }


# =============================================================================
# Parent Endpoints
# =============================================================================

@router.get("/access/{token}")
async def access_intake(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate intake link and get session info.

    No authentication required - uses secure token.
    """
    session = await get_session_by_token(db, token)

    # Check if expired
    if session.is_expired:
        return {
            "session_id": session.id,
            "status": "expired",
            "is_accessible": False,
            "message": "This intake link has expired. Please contact your attorney."
        }

    # Check status
    if session.status in [IntakeStatus.COMPLETED.value, IntakeStatus.CANCELLED.value]:
        return {
            "session_id": session.id,
            "status": session.status,
            "is_accessible": False,
            "message": "This intake has already been completed."
        }

    # Get professional info
    prof_result = await db.execute(
        select(CourtProfessional).where(
            CourtProfessional.id == session.professional_id
        )
    )
    professional = prof_result.scalar_one_or_none()

    # Get case info
    case_result = await db.execute(
        select(Case).where(Case.id == session.case_id)
    )
    case = case_result.scalar_one_or_none()

    # Get children
    children_names = []
    if case:
        children_result = await db.execute(
            select(Child).where(Child.case_id == case.id)
        )
        children = children_result.scalars().all()
        children_names = [c.first_name for c in children]

    return {
        "session_id": session.id,
        "session_number": session.session_number,
        "professional_name": professional.full_name if professional else "Your Attorney",
        "professional_role": professional.role if professional else "Attorney",
        "target_forms": session.target_forms,
        "status": session.status,
        "is_accessible": session.is_accessible,
        "case_name": case.case_name if case else None,
        "children_names": children_names,
    }


@router.post("/sessions/{session_id}/start")
async def start_intake(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Begin intake conversation.

    Returns ARIA's opening message.
    """
    session = await get_session_by_id(db, session_id)

    if not session.is_accessible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake is not accessible"
        )

    # Mark as accessed if first time
    if not session.access_link_used_at:
        session.access_link_used_at = datetime.utcnow()
        session.ip_address = request.client.host if request.client else None
        session.user_agent = request.headers.get("user-agent", "")[:500]

    service = AriaParalegalService(db)
    result = await service.start_session(session)

    return result


@router.post("/access/{token}/start")
async def start_intake_by_token(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Begin intake conversation via access token.

    No authentication required - uses secure token.
    """
    session = await get_session_by_token(db, token)

    if not session.is_accessible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake is not accessible"
        )

    # Mark as accessed if first time
    if not session.access_link_used_at:
        session.access_link_used_at = datetime.utcnow()
        session.ip_address = request.client.host if request.client else None
        session.user_agent = request.headers.get("user-agent", "")[:500]

    service = AriaParalegalService(db)
    result = await service.start_session(session)

    return result


@router.post("/sessions/{session_id}/message")
async def send_message(
    session_id: str,
    data: IntakeMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to ARIA and get response.
    """
    session = await get_session_by_id(db, session_id)

    if session.status not in [IntakeStatus.PENDING.value, IntakeStatus.IN_PROGRESS.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake is not in progress"
        )

    service = AriaParalegalService(db)
    result = await service.send_message(session, data.message)

    return result


@router.post("/access/{token}/message")
async def send_message_by_token(
    token: str,
    data: IntakeMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to ARIA via access token.

    No authentication required - uses secure token.
    """
    session = await get_session_by_token(db, token)

    if session.status not in [IntakeStatus.PENDING.value, IntakeStatus.IN_PROGRESS.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake is not in progress"
        )

    service = AriaParalegalService(db)
    result = await service.send_message(session, data.message)

    return result


@router.get("/sessions/{session_id}/parent-summary")
async def get_parent_summary(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Parent views their summary before confirming.
    """
    session = await get_session_by_id(db, session_id)

    # Generate summary if needed
    if not session.aria_summary and session.message_count > 2:
        service = AriaParalegalService(db)
        await service.generate_summary(session)

    return {
        "session_number": session.session_number,
        "aria_summary": session.aria_summary,
        "message_count": session.message_count,
        "target_forms": session.target_forms,
    }


@router.get("/access/{token}/summary")
async def get_parent_summary_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Parent views their summary before confirming (via token).

    No authentication required - uses secure token.
    """
    session = await get_session_by_token(db, token)

    # Generate summary if needed
    if not session.aria_summary and session.message_count > 2:
        service = AriaParalegalService(db)
        await service.generate_summary(session)

    return {
        "session_number": session.session_number,
        "aria_summary": session.aria_summary,
        "message_count": session.message_count,
        "target_forms": session.target_forms,
    }


@router.post("/sessions/{session_id}/confirm")
async def confirm_intake(
    session_id: str,
    data: IntakeConfirmRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Parent confirms intake is complete and accurate.
    """
    session = await get_session_by_id(db, session_id)

    if session.status not in [IntakeStatus.PENDING.value, IntakeStatus.IN_PROGRESS.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake cannot be confirmed in current state"
        )

    service = AriaParalegalService(db)
    session = await service.complete_intake(session, data.edits)

    return {
        "session_number": session.session_number,
        "status": session.status,
        "parent_confirmed": True,
        "parent_confirmed_at": session.parent_confirmed_at,
        "message": "Thank you! Your intake has been submitted to your attorney for review."
    }


@router.post("/access/{token}/confirm")
async def confirm_intake_by_token(
    token: str,
    data: IntakeConfirmRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Parent confirms intake is complete and accurate (via token).

    No authentication required - uses secure token.
    """
    session = await get_session_by_token(db, token)

    if session.status not in [IntakeStatus.PENDING.value, IntakeStatus.IN_PROGRESS.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake cannot be confirmed in current state"
        )

    service = AriaParalegalService(db)
    session = await service.complete_intake(session, data.edits)

    return {
        "session_number": session.session_number,
        "status": session.status,
        "parent_confirmed": True,
        "parent_confirmed_at": session.parent_confirmed_at,
        "message": "Thank you! Your intake has been submitted to your attorney for review."
    }


# =============================================================================
# Question Template Endpoints
# =============================================================================

@router.post("/questions", status_code=status.HTTP_201_CREATED)
async def create_intake_question(
    data: IntakeQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a custom intake question (optionally as template).
    """
    professional = await get_professional_from_user(db, current_user)

    question = IntakeQuestion(
        professional_id=professional.id,
        question_text=data.question_text,
        question_category=data.question_category,
        expected_response_type=data.expected_response_type,
        choices=data.choices,
        is_template=data.is_template,
        is_required=data.is_required,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)

    return {
        "id": question.id,
        "question_text": question.question_text,
        "question_category": question.question_category,
        "is_template": question.is_template,
        "message": "Question created successfully"
    }


@router.get("/questions", response_model=IntakeQuestionList)
async def list_intake_questions(
    templates_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List custom intake questions for the professional.
    """
    professional = await get_professional_from_user(db, current_user)

    query = select(IntakeQuestion).where(
        IntakeQuestion.professional_id == professional.id,
        IntakeQuestion.is_active == True
    )

    if templates_only:
        query = query.where(IntakeQuestion.is_template == True)

    result = await db.execute(query.order_by(IntakeQuestion.created_at.desc()))
    questions = result.scalars().all()

    return {
        "items": [
            {
                "id": q.id,
                "professional_id": q.professional_id,
                "question_text": q.question_text,
                "question_category": q.question_category,
                "expected_response_type": q.expected_response_type,
                "choices": q.choices,
                "is_template": q.is_template,
                "is_required": q.is_required,
                "is_active": q.is_active,
                "use_count": q.use_count,
                "created_at": q.created_at,
            }
            for q in questions
        ],
        "total": len(questions)
    }


@router.delete("/questions/{question_id}")
async def delete_intake_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Soft-delete an intake question.
    """
    professional = await get_professional_from_user(db, current_user)

    result = await db.execute(
        select(IntakeQuestion).where(
            IntakeQuestion.id == question_id,
            IntakeQuestion.professional_id == professional.id
        )
    )
    question = result.scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    question.is_active = False
    await db.commit()

    return {"message": "Question deleted"}
