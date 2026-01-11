"""
QuickAccord management endpoints.

QuickAccords are lightweight situational agreements for impromptu situations
like surprise trips, schedule swaps, special events, and temporary expenses.
They can be created conversationally via ARIA chat.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Body, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.family_file import (
    QuickAccordCreate,
    QuickAccordUpdate,
    QuickAccordResponse,
    QuickAccordList,
    QuickAccordApproval,
)
from app.services.quick_accord import QuickAccordService
from app.services.aria_quick_accord import AriaQuickAccordService
from app.schemas.family_file import ARIAQuickAccordMessage

router = APIRouter()


def _build_quick_accord_response(qa) -> dict:
    """Build a QuickAccordResponse dict from a QuickAccord model."""
    return {
        "id": qa.id,
        "family_file_id": qa.family_file_id,
        "accord_number": qa.accord_number,
        "title": qa.title,
        "purpose_category": qa.purpose_category,
        "purpose_description": qa.purpose_description,
        "is_single_event": qa.is_single_event,
        "status": qa.status,
        "event_date": qa.event_date,
        "start_date": qa.start_date,
        "end_date": qa.end_date,
        "child_ids": qa.child_ids or [],
        "location": qa.location,
        "pickup_responsibility": qa.pickup_responsibility,
        "dropoff_responsibility": qa.dropoff_responsibility,
        "transportation_notes": qa.transportation_notes,
        "has_shared_expense": qa.has_shared_expense,
        "estimated_amount": qa.estimated_amount,
        "expense_category": qa.expense_category,
        "receipt_required": qa.receipt_required,
        "parent_a_approved": qa.parent_a_approved,
        "parent_a_approved_at": qa.parent_a_approved_at,
        "parent_b_approved": qa.parent_b_approved,
        "parent_b_approved_at": qa.parent_b_approved_at,
        "ai_summary": qa.ai_summary,
        "initiated_by": qa.initiated_by,
        "created_at": qa.created_at,
        "updated_at": qa.updated_at,
        "is_approved": qa.is_approved,
        "is_active": qa.is_active,
        "is_expired": qa.is_expired,
    }


@router.post("/family-file/{family_file_id}", status_code=status.HTTP_201_CREATED)
async def create_quick_accord(
    family_file_id: str,
    data: QuickAccordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new QuickAccord for a Family File.

    QuickAccords are for situational agreements:
    - travel: Taking kids on a trip
    - schedule_swap: Trading custody days
    - special_event: Birthday parties, events
    - overnight: One-off overnight stays
    - expense: Shared expense agreements
    - other: Other situational needs

    Args:
        family_file_id: ID of the Family File
        data: QuickAccord details

    Returns:
        Created QuickAccord in draft status
    """
    service = QuickAccordService(db)
    quick_accord = await service.create_quick_accord(family_file_id, data, current_user)

    response = _build_quick_accord_response(quick_accord)
    response["message"] = "QuickAccord created as draft"

    return response


@router.get("/family-file/{family_file_id}", response_model=QuickAccordList)
async def list_family_file_quick_accords(
    family_file_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all QuickAccords for a Family File.

    Args:
        family_file_id: ID of the Family File
        status_filter: Optional filter by status (draft, pending_approval, active, completed, revoked, expired)

    Returns:
        List of QuickAccords
    """
    service = QuickAccordService(db)
    quick_accords = await service.get_family_file_quick_accords(
        family_file_id, current_user, status_filter
    )

    return {
        "items": [_build_quick_accord_response(qa) for qa in quick_accords],
        "total": len(quick_accords)
    }


@router.get("/{quick_accord_id}", response_model=QuickAccordResponse)
async def get_quick_accord(
    quick_accord_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a QuickAccord by ID.

    Args:
        quick_accord_id: ID of the QuickAccord

    Returns:
        QuickAccord details
    """
    service = QuickAccordService(db)
    quick_accord = await service.get_quick_accord(quick_accord_id, current_user)

    return _build_quick_accord_response(quick_accord)


@router.put("/{quick_accord_id}", response_model=QuickAccordResponse)
async def update_quick_accord(
    quick_accord_id: str,
    data: QuickAccordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a QuickAccord.

    Only allowed when in draft status and only by the initiator.

    Args:
        quick_accord_id: ID of the QuickAccord
        data: Fields to update

    Returns:
        Updated QuickAccord
    """
    service = QuickAccordService(db)
    quick_accord = await service.update_quick_accord(quick_accord_id, data, current_user)

    return _build_quick_accord_response(quick_accord)


@router.post("/{quick_accord_id}/submit")
async def submit_for_approval(
    quick_accord_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a QuickAccord for approval by the other parent.

    Changes status from draft to pending_approval and auto-approves
    for the submitting parent.

    Args:
        quick_accord_id: ID of the QuickAccord

    Returns:
        Updated QuickAccord with pending_approval status
    """
    service = QuickAccordService(db)
    quick_accord = await service.submit_for_approval(quick_accord_id, current_user)

    response = _build_quick_accord_response(quick_accord)
    response["message"] = "QuickAccord submitted for approval"

    return response


@router.post("/{quick_accord_id}/approve")
async def approve_quick_accord(
    quick_accord_id: str,
    data: QuickAccordApproval = Body(default=QuickAccordApproval(approved=True)),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a QuickAccord.

    When both parents approve, status changes to active.
    If rejected, status reverts to draft for revision.

    Args:
        quick_accord_id: ID of the QuickAccord
        data: Approval decision (approved=True/False, optional notes)

    Returns:
        Updated QuickAccord
    """
    service = QuickAccordService(db)
    quick_accord = await service.approve_quick_accord(quick_accord_id, data, current_user)

    response = _build_quick_accord_response(quick_accord)
    if quick_accord.is_approved:
        response["message"] = "QuickAccord is now active!"
    elif data.approved:
        response["message"] = "Approval recorded. Waiting for other parent."
    else:
        response["message"] = "QuickAccord returned to draft for revision."

    return response


@router.post("/{quick_accord_id}/complete")
async def complete_quick_accord(
    quick_accord_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a QuickAccord as completed.

    Use this when the event/situation covered by the QuickAccord
    has concluded.

    Args:
        quick_accord_id: ID of the QuickAccord

    Returns:
        Updated QuickAccord with completed status
    """
    service = QuickAccordService(db)
    quick_accord = await service.complete_quick_accord(quick_accord_id, current_user)

    response = _build_quick_accord_response(quick_accord)
    response["message"] = "QuickAccord marked as completed"

    return response


@router.post("/{quick_accord_id}/revoke")
async def revoke_quick_accord(
    quick_accord_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke a QuickAccord.

    Either parent can revoke an active or pending QuickAccord.
    This is useful if circumstances change.

    Args:
        quick_accord_id: ID of the QuickAccord

    Returns:
        Updated QuickAccord with revoked status
    """
    service = QuickAccordService(db)
    quick_accord = await service.revoke_quick_accord(quick_accord_id, current_user)

    response = _build_quick_accord_response(quick_accord)
    response["message"] = "QuickAccord has been revoked"

    return response


@router.delete("/{quick_accord_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quick_accord(
    quick_accord_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a QuickAccord.

    Only allowed for drafts and only by the initiator.

    Args:
        quick_accord_id: ID of the QuickAccord
    """
    service = QuickAccordService(db)
    await service.delete_quick_accord(quick_accord_id, current_user)


# ============================================================
# ARIA Conversational QuickAccord Creation
# ============================================================

@router.post("/aria/start/{family_file_id}")
async def start_aria_conversation(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Start an ARIA conversation to create a QuickAccord.

    ARIA will guide the user through creating a situational agreement
    using natural conversation.

    Args:
        family_file_id: ID of the Family File

    Returns:
        conversation_id and initial ARIA greeting
    """
    service = AriaQuickAccordService(db)
    result = await service.start_conversation(family_file_id, current_user)

    return {
        "conversation_id": result["conversation_id"],
        "response": result["response"],
        "extracted_data": result.get("extracted_data"),
        "is_ready_to_create": result.get("is_ready_to_create", False)
    }


@router.post("/aria/message/{conversation_id}")
async def send_aria_message(
    conversation_id: str,
    data: ARIAQuickAccordMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message in an ARIA QuickAccord conversation.

    ARIA will respond conversationally and extract structured data
    as the conversation progresses.

    Args:
        conversation_id: ID of the conversation
        data: User's message

    Returns:
        ARIA's response and extracted data
    """
    service = AriaQuickAccordService(db)
    result = await service.send_message(conversation_id, current_user, data.message)

    return {
        "conversation_id": result["conversation_id"],
        "response": result["response"],
        "extracted_data": result.get("extracted_data"),
        "is_ready_to_create": result.get("is_ready_to_create", False)
    }


@router.post("/aria/create/{conversation_id}")
async def create_from_aria_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a QuickAccord from an ARIA conversation.

    Call this when is_ready_to_create is True after the conversation
    has gathered all necessary information.

    Args:
        conversation_id: ID of the conversation

    Returns:
        Created QuickAccord
    """
    service = AriaQuickAccordService(db)
    quick_accord = await service.create_from_conversation(conversation_id, current_user)

    response = _build_quick_accord_response(quick_accord)
    response["message"] = "QuickAccord created from ARIA conversation"

    return response
