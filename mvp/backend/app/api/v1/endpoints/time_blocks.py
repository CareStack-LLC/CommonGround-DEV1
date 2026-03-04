"""
Time Block endpoints for availability constraints.

PRIVACY RULE: Time blocks are NEVER shown to the other parent.
They are only used for ARIA conflict detection.
"""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.schedule import (
    TimeBlockCreate,
    TimeBlockUpdate,
    TimeBlockResponse,
    ConflictCheckRequest,
    ConflictCheckResponse,
    BusyPeriod,
)
from app.services.time_block import TimeBlockService

router = APIRouter()


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=TimeBlockResponse,
    summary="Create time block",
    description="Create an availability constraint (PRIVATE - never shown to other parent)."
)
async def create_time_block(
    block_data: TimeBlockCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a time block to mark when you're unavailable.

    Privacy: This is NEVER shown to the other parent. It's only used
    for ARIA to warn about potential scheduling conflicts.

    - **title**: Private label (e.g., "Work", "Gym")
    - **start_time**: Block start
    - **end_time**: Block end
    - **is_recurring**: Repeat this block (daily or weekly)
    - **recurrence_days**: For weekly: [0,1,2,3,4] = Mon-Fri
    """
    try:
        block = await TimeBlockService.create_time_block(
            db=db,
            collection_id=block_data.collection_id,
            user_id=current_user.id,
            title=block_data.title,
            start_time=block_data.start_time,
            end_time=block_data.end_time,
            all_day=block_data.all_day,
            is_recurring=block_data.is_recurring,
            recurrence_pattern=block_data.recurrence_pattern,
            recurrence_days=block_data.recurrence_days,
            recurrence_end_date=block_data.recurrence_end_date,
            notes=block_data.notes
        )

        return TimeBlockResponse.model_validate(block)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{block_id}",
    response_model=TimeBlockResponse,
    summary="Get time block",
    description="Get a time block by ID (owner only)."
)
async def get_time_block(
    block_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a time block by ID.

    Only the owner can view their time blocks.
    """
    block = await TimeBlockService.get_time_block(
        db=db,
        block_id=block_id,
        user_id=current_user.id
    )

    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time block not found or no access"
        )

    return TimeBlockResponse.model_validate(block)


@router.get(
    "/collections/{collection_id}",
    response_model=List[TimeBlockResponse],
    summary="List time blocks",
    description="List all time blocks in a collection (owner only)."
)
async def list_time_blocks(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all time blocks in a collection.

    Only the collection owner can view their time blocks.
    """
    try:
        blocks = await TimeBlockService.list_time_blocks(
            db=db,
            collection_id=collection_id,
            user_id=current_user.id
        )

        return [TimeBlockResponse.model_validate(block) for block in blocks]

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{block_id}",
    response_model=TimeBlockResponse,
    summary="Update time block",
    description="Update a time block (owner only)."
)
async def update_time_block(
    block_id: str,
    block_data: TimeBlockUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a time block.

    Only the owner can update their time blocks.
    """
    try:
        block = await TimeBlockService.update_time_block(
            db=db,
            block_id=block_id,
            user_id=current_user.id,
            title=block_data.title,
            start_time=block_data.start_time,
            end_time=block_data.end_time,
            notes=block_data.notes
        )

        return TimeBlockResponse.model_validate(block)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete time block",
    description="Delete a time block (owner only)."
)
async def delete_time_block(
    block_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a time block (soft delete).
    """
    deleted = await TimeBlockService.delete_time_block(
        db=db,
        block_id=block_id,
        user_id=current_user.id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time block not found"
        )

    return None


@router.post(
    "/check-conflicts",
    response_model=ConflictCheckResponse,
    summary="Check for scheduling conflicts",
    description="ARIA conflict detection - returns neutral warnings (no details revealed)."
)
async def check_conflicts(
    conflict_data: ConflictCheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a proposed time window conflicts with the other parent's availability.

    PRIVACY: This returns a NEUTRAL warning without revealing what the
    other parent is doing. It just says "potential conflict" without details.

    Used by ARIA to warn: "This time may create a scheduling conflict for
    the other parent."
    """
    result = await TimeBlockService.check_conflicts(
        db=db,
        case_id=conflict_data.case_id,
        start_time=conflict_data.start_time,
        end_time=conflict_data.end_time,
        exclude_user_id=conflict_data.exclude_user_id or current_user.id
    )

    has_conflicts, conflicts = result

    return ConflictCheckResponse(
        has_conflicts=has_conflicts,
        conflicts=conflicts,
        can_proceed=True  # MVP: conflicts are warnings, not blockers
    )


@router.get(
    "/cases/{case_id}/busy-periods",
    response_model=List[BusyPeriod],
    summary="Get busy periods for calendar",
    description="Get neutral 'busy' blocks for calendar display (no details)."
)
async def get_busy_periods(
    case_id: str,
    other_parent_id: str = Query(..., description="Other parent's user ID"),
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get 'busy' periods for calendar display.

    Shows the other parent's time blocks as anonymous gray "Busy" blocks
    with no details. Used for calendar visualization.

    Privacy: No titles, no details, just start/end times with "Busy" label.
    """
    busy_periods = await TimeBlockService.get_busy_periods_for_calendar(
        db=db,
        case_id=case_id,
        other_parent_id=other_parent_id,
        start_date=start_date,
        end_date=end_date
    )

    return [BusyPeriod(**period) for period in busy_periods]
