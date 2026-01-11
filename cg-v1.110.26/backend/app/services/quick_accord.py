"""
QuickAccord service for managing lightweight situational agreements.

QuickAccords are used for impromptu situations like:
- Surprise trips
- Schedule swaps
- Special events
- Temporary expenses

They can be created conversationally via ARIA chat.
"""

from datetime import datetime
from typing import List, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family_file import (
    FamilyFile,
    QuickAccord,
    generate_quick_accord_number,
)
from app.models.user import User
from app.schemas.family_file import (
    QuickAccordCreate,
    QuickAccordUpdate,
    QuickAccordApproval,
)
from app.services.family_file import FamilyFileService


class QuickAccordService:
    """Service for handling QuickAccord operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize QuickAccord service.

        Args:
            db: Database session
        """
        self.db = db
        self.family_file_service = FamilyFileService(db)

    async def create_quick_accord(
        self,
        family_file_id: str,
        data: QuickAccordCreate,
        user: User
    ) -> QuickAccord:
        """
        Create a new QuickAccord.

        Args:
            family_file_id: ID of the Family File
            data: QuickAccord creation data
            user: User creating the accord

        Returns:
            Created QuickAccord

        Raises:
            HTTPException: If creation fails
        """
        # Verify access to Family File
        family_file = await self.family_file_service.get_family_file(family_file_id, user)

        # Verify family file is complete (both parents joined) for approval workflow
        # But single parent can create drafts

        try:
            # Determine if user is Parent A or Parent B
            is_parent_a = family_file.parent_a_id == user.id

            quick_accord = QuickAccord(
                id=str(uuid.uuid4()),
                family_file_id=family_file.id,
                accord_number=generate_quick_accord_number(),
                title=data.title,
                purpose_category=data.purpose_category,
                purpose_description=data.purpose_description,
                is_single_event=data.is_single_event,
                event_date=data.event_date,
                start_date=data.start_date,
                end_date=data.end_date,
                child_ids=data.child_ids,
                location=data.location,
                pickup_responsibility=data.pickup_responsibility,
                dropoff_responsibility=data.dropoff_responsibility,
                transportation_notes=data.transportation_notes,
                has_shared_expense=data.has_shared_expense,
                estimated_amount=data.estimated_amount,
                expense_category=data.expense_category,
                receipt_required=data.receipt_required,
                initiated_by=user.id,
                status="draft",
            )

            # If require_joint_approval is False, auto-approve for initiator
            if not family_file.require_joint_approval:
                if is_parent_a:
                    quick_accord.parent_a_approved = True
                    quick_accord.parent_a_approved_at = datetime.utcnow()
                else:
                    quick_accord.parent_b_approved = True
                    quick_accord.parent_b_approved_at = datetime.utcnow()

            self.db.add(quick_accord)
            await self.db.commit()
            await self.db.refresh(quick_accord)

            return quick_accord

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create QuickAccord: {str(e)}"
            )

    async def get_quick_accord(
        self,
        quick_accord_id: str,
        user: User
    ) -> QuickAccord:
        """
        Get a QuickAccord by ID.

        Args:
            quick_accord_id: ID of the QuickAccord
            user: User requesting access

        Returns:
            QuickAccord

        Raises:
            HTTPException: If not found or access denied
        """
        result = await self.db.execute(
            select(QuickAccord)
            .options(selectinload(QuickAccord.family_file))
            .where(QuickAccord.id == quick_accord_id)
        )
        quick_accord = result.scalar_one_or_none()

        if not quick_accord:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="QuickAccord not found"
            )

        # Verify access through Family File
        family_file = quick_accord.family_file
        if not self._has_access(family_file, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this QuickAccord"
            )

        return quick_accord

    async def get_family_file_quick_accords(
        self,
        family_file_id: str,
        user: User,
        status_filter: Optional[str] = None
    ) -> List[QuickAccord]:
        """
        Get all QuickAccords for a Family File.

        Args:
            family_file_id: ID of the Family File
            user: User requesting access
            status_filter: Optional status to filter by

        Returns:
            List of QuickAccords
        """
        # Verify access
        await self.family_file_service.get_family_file(family_file_id, user)

        query = select(QuickAccord).where(QuickAccord.family_file_id == family_file_id)

        if status_filter:
            query = query.where(QuickAccord.status == status_filter)

        query = query.order_by(QuickAccord.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_quick_accord(
        self,
        quick_accord_id: str,
        data: QuickAccordUpdate,
        user: User
    ) -> QuickAccord:
        """
        Update a QuickAccord.

        Only allowed in draft status.

        Args:
            quick_accord_id: ID of the QuickAccord
            data: Update data
            user: User making the update

        Returns:
            Updated QuickAccord
        """
        quick_accord = await self.get_quick_accord(quick_accord_id, user)

        # Only allow updates in draft status
        if quick_accord.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update QuickAccords in draft status"
            )

        # Only initiator can update
        if quick_accord.initiated_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the initiator can update this QuickAccord"
            )

        # Apply updates
        update_fields = data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(quick_accord, field, value)

        quick_accord.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(quick_accord)

        return quick_accord

    async def submit_for_approval(
        self,
        quick_accord_id: str,
        user: User
    ) -> QuickAccord:
        """
        Submit a QuickAccord for approval.

        Changes status from draft to pending_approval.

        Args:
            quick_accord_id: ID of the QuickAccord
            user: User submitting

        Returns:
            Updated QuickAccord
        """
        quick_accord = await self.get_quick_accord(quick_accord_id, user)

        if quick_accord.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only submit QuickAccords in draft status"
            )

        if quick_accord.initiated_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the initiator can submit this QuickAccord"
            )

        # Determine if user is Parent A or Parent B
        family_file = quick_accord.family_file
        is_parent_a = family_file.parent_a_id == user.id

        # Auto-approve for initiator
        if is_parent_a:
            quick_accord.parent_a_approved = True
            quick_accord.parent_a_approved_at = datetime.utcnow()
        else:
            quick_accord.parent_b_approved = True
            quick_accord.parent_b_approved_at = datetime.utcnow()

        quick_accord.status = "pending_approval"
        quick_accord.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(quick_accord)

        # TODO: Send notification to other parent

        return quick_accord

    async def approve_quick_accord(
        self,
        quick_accord_id: str,
        data: QuickAccordApproval,
        user: User
    ) -> QuickAccord:
        """
        Approve or reject a QuickAccord.

        Args:
            quick_accord_id: ID of the QuickAccord
            data: Approval decision
            user: User approving/rejecting

        Returns:
            Updated QuickAccord
        """
        quick_accord = await self.get_quick_accord(quick_accord_id, user)

        if quick_accord.status not in ["draft", "pending_approval"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QuickAccord is not pending approval"
            )

        # Can't approve your own submission (unless it's the other parent's turn)
        family_file = quick_accord.family_file
        is_parent_a = family_file.parent_a_id == user.id

        # Record approval
        if is_parent_a:
            if quick_accord.parent_a_approved:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You have already approved this QuickAccord"
                )
            quick_accord.parent_a_approved = data.approved
            quick_accord.parent_a_approved_at = datetime.utcnow()
        else:
            if quick_accord.parent_b_approved:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You have already approved this QuickAccord"
                )
            quick_accord.parent_b_approved = data.approved
            quick_accord.parent_b_approved_at = datetime.utcnow()

        # Check if both parents have approved
        if quick_accord.parent_a_approved and quick_accord.parent_b_approved:
            quick_accord.status = "active"
        elif not data.approved:
            # If rejected, revert to draft for revision
            quick_accord.status = "draft"
            # Reset approvals
            quick_accord.parent_a_approved = False
            quick_accord.parent_a_approved_at = None
            quick_accord.parent_b_approved = False
            quick_accord.parent_b_approved_at = None

        quick_accord.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(quick_accord)

        return quick_accord

    async def complete_quick_accord(
        self,
        quick_accord_id: str,
        user: User
    ) -> QuickAccord:
        """
        Mark a QuickAccord as completed.

        Args:
            quick_accord_id: ID of the QuickAccord
            user: User marking complete

        Returns:
            Updated QuickAccord
        """
        quick_accord = await self.get_quick_accord(quick_accord_id, user)

        if quick_accord.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only complete active QuickAccords"
            )

        quick_accord.status = "completed"
        quick_accord.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(quick_accord)

        return quick_accord

    async def revoke_quick_accord(
        self,
        quick_accord_id: str,
        user: User
    ) -> QuickAccord:
        """
        Revoke a QuickAccord.

        Either parent can revoke an active QuickAccord.

        Args:
            quick_accord_id: ID of the QuickAccord
            user: User revoking

        Returns:
            Updated QuickAccord
        """
        quick_accord = await self.get_quick_accord(quick_accord_id, user)

        if quick_accord.status not in ["active", "pending_approval"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only revoke active or pending QuickAccords"
            )

        quick_accord.status = "revoked"
        quick_accord.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(quick_accord)

        return quick_accord

    async def delete_quick_accord(
        self,
        quick_accord_id: str,
        user: User
    ) -> None:
        """
        Delete a QuickAccord.

        Only allowed for drafts by the initiator.

        Args:
            quick_accord_id: ID of the QuickAccord
            user: User deleting
        """
        quick_accord = await self.get_quick_accord(quick_accord_id, user)

        if quick_accord.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only delete QuickAccords in draft status"
            )

        if quick_accord.initiated_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the initiator can delete this QuickAccord"
            )

        await self.db.delete(quick_accord)
        await self.db.commit()

    def _has_access(self, family_file: FamilyFile, user: User) -> bool:
        """Check if user has access to a Family File."""
        return (
            family_file.parent_a_id == user.id or
            family_file.parent_b_id == user.id
        )
