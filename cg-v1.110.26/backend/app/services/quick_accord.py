"""
QuickAccord service for managing lightweight situational agreements.

QuickAccords are used for impromptu situations like:
- Surprise trips
- Schedule swaps
- Special events
- Temporary expenses

They can be created conversationally via ARIA chat.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
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
from app.models.schedule import ScheduleEvent
from app.models.clearfund import Obligation, ObligationFunding
from app.models.user import User
from app.schemas.family_file import (
    QuickAccordCreate,
    QuickAccordUpdate,
    QuickAccordApproval,
)
from app.services.family_file import FamilyFileService

# Purpose categories that create schedule events
SCHEDULE_EVENT_CATEGORIES = ["travel", "schedule_swap", "special_event", "overnight"]


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

        query = (
            select(QuickAccord)
            .options(selectinload(QuickAccord.family_file))
            .where(QuickAccord.family_file_id == family_file_id)
        )

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
            quick_accord.updated_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(quick_accord)

            # Handle approval side effects (create events/expenses)
            await self._handle_approval_side_effects(quick_accord, family_file)

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
        else:
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

    async def _handle_approval_side_effects(
        self,
        quick_accord: QuickAccord,
        family_file: FamilyFile
    ) -> Dict[str, Any]:
        """
        Handle side effects when a QuickAccord is approved by both parents.

        Creates:
        1. ScheduleEvent for schedule-related accords (travel, schedule_swap, special_event, overnight)
        2. ClearFund Obligation for expense-related accords (has_shared_expense = True)

        Args:
            quick_accord: The approved QuickAccord
            family_file: The associated FamilyFile

        Returns:
            Dict with created resources (schedule_event_id, obligation_id)
        """
        result: Dict[str, Any] = {
            "schedule_event_created": False,
            "schedule_event_id": None,
            "obligation_created": False,
            "obligation_id": None,
        }

        try:
            # 1. Create ScheduleEvent for schedule-related categories
            if quick_accord.purpose_category in SCHEDULE_EVENT_CATEGORIES:
                schedule_event = await self._create_schedule_event_from_accord(
                    quick_accord, family_file
                )
                if schedule_event:
                    result["schedule_event_created"] = True
                    result["schedule_event_id"] = schedule_event.id

            # 2. Create ClearFund Obligation if has_shared_expense
            if quick_accord.has_shared_expense and quick_accord.estimated_amount:
                obligation = await self._create_obligation_from_accord(
                    quick_accord, family_file
                )
                if obligation:
                    result["obligation_created"] = True
                    result["obligation_id"] = obligation.id

            await self.db.commit()

        except Exception as e:
            # Log but don't fail - side effects are non-critical
            import logging
            logging.error(f"Error creating QuickAccord side effects: {str(e)}")
            await self.db.rollback()

        return result

    async def _create_schedule_event_from_accord(
        self,
        quick_accord: QuickAccord,
        family_file: FamilyFile
    ) -> Optional[ScheduleEvent]:
        """
        Create a ScheduleEvent from an approved QuickAccord.

        Args:
            quick_accord: The approved QuickAccord
            family_file: The associated FamilyFile

        Returns:
            Created ScheduleEvent or None
        """
        # Determine event timing
        if quick_accord.is_single_event and quick_accord.event_date:
            start_time = quick_accord.event_date
            end_time = quick_accord.event_date + timedelta(hours=4)  # Default 4 hour event
        elif quick_accord.start_date and quick_accord.end_date:
            start_time = quick_accord.start_date
            end_time = quick_accord.end_date
        else:
            # Can't create event without dates
            return None

        # Map purpose category to event type
        event_type_mapping = {
            "travel": "vacation",
            "schedule_swap": "regular",
            "special_event": "special",
            "overnight": "regular",
        }
        event_type = event_type_mapping.get(quick_accord.purpose_category, "special")

        # Build description with ARIA attribution
        description_parts = []
        if quick_accord.purpose_description:
            description_parts.append(quick_accord.purpose_description)
        description_parts.append(f"Created by ARIA based on QuickAccord: {quick_accord.title}")

        # Create the schedule event
        schedule_event = ScheduleEvent(
            id=str(uuid.uuid4()),
            family_file_id=family_file.id,
            quick_accord_id=quick_accord.id,
            created_by=quick_accord.initiated_by,
            event_type=event_type,
            event_category="general",
            start_time=start_time,
            end_time=end_time,
            all_day=not quick_accord.is_single_event,  # Multi-day = all day
            custodial_parent_id=quick_accord.initiated_by,
            child_ids=quick_accord.child_ids or [],
            title=quick_accord.title,
            description="\n\n".join(description_parts),
            location=quick_accord.location,
            visibility="co_parent",
            location_shared=True,
        )

        self.db.add(schedule_event)
        await self.db.flush()

        return schedule_event

    async def _create_obligation_from_accord(
        self,
        quick_accord: QuickAccord,
        family_file: FamilyFile
    ) -> Optional[Obligation]:
        """
        Create a ClearFund Obligation from an approved QuickAccord.

        Uses agreement-locked split ratio if available.

        Args:
            quick_accord: The approved QuickAccord with expense
            family_file: The associated FamilyFile

        Returns:
            Created Obligation or None
        """
        if not quick_accord.estimated_amount:
            return None

        # Determine expense type (default to shared for backwards compatibility)
        expense_type = quick_accord.expense_type or "shared"

        # Determine split ratio based on expense type
        petitioner_percentage = 50  # Default 50/50
        split_from_agreement = False

        if expense_type in ("reimbursement", "request_payment"):
            # Full amount from other parent
            # If initiator is parent_a, parent_b pays 100% (petitioner_percentage = 0)
            # If initiator is parent_b, parent_a pays 100% (petitioner_percentage = 100)
            if quick_accord.initiated_by == family_file.parent_a_id:
                petitioner_percentage = 0  # Parent B pays 100%
            else:
                petitioner_percentage = 100  # Parent A pays 100%
        else:
            # "shared" - use agreement-locked split or default 50/50
            if family_file.agreement_split_locked and family_file.agreement_split_parent_a_percentage is not None:
                petitioner_percentage = family_file.agreement_split_parent_a_percentage
                split_from_agreement = True

        # Calculate shares
        total_amount = Decimal(str(quick_accord.estimated_amount))
        petitioner_share = total_amount * Decimal(petitioner_percentage) / 100
        respondent_share = total_amount - petitioner_share

        # Map purpose to expense category
        category_mapping = {
            "travel": "transportation",
            "schedule_swap": "other",
            "special_event": "extracurricular",
            "overnight": "childcare",
            "expense": "other",
        }
        expense_category = quick_accord.expense_category or category_mapping.get(
            quick_accord.purpose_category, "other"
        )

        # Build description with ARIA attribution
        description_parts = []
        if quick_accord.purpose_description:
            description_parts.append(quick_accord.purpose_description)
        description_parts.append(f"Created by ARIA based on QuickAccord: {quick_accord.title}")

        # Create the obligation
        obligation = Obligation(
            id=str(uuid.uuid4()),
            family_file_id=family_file.id,
            quick_accord_id=quick_accord.id,
            source_type="agreement",  # From QuickAccord agreement
            source_id=quick_accord.id,
            purpose_category=expense_category,
            title=f"Expense: {quick_accord.title}",
            description="\n\n".join(description_parts),
            child_ids=quick_accord.child_ids or [],
            total_amount=total_amount,
            petitioner_share=petitioner_share,
            respondent_share=respondent_share,
            petitioner_percentage=petitioner_percentage,
            split_from_agreement=split_from_agreement,
            status="open",
            verification_required=True,
            receipt_required=quick_accord.receipt_required or False,
            created_by=quick_accord.initiated_by,
        )

        self.db.add(obligation)
        await self.db.flush()

        # Create funding records for each parent
        if family_file.parent_a_id:
            parent_a_funding = ObligationFunding(
                id=str(uuid.uuid4()),
                obligation_id=obligation.id,
                parent_id=family_file.parent_a_id,
                amount_required=petitioner_share,
                amount_funded=Decimal("0"),
            )
            self.db.add(parent_a_funding)

        if family_file.parent_b_id:
            parent_b_funding = ObligationFunding(
                id=str(uuid.uuid4()),
                obligation_id=obligation.id,
                parent_id=family_file.parent_b_id,
                amount_required=respondent_share,
                amount_funded=Decimal("0"),
            )
            self.db.add(parent_b_funding)

        await self.db.flush()

        return obligation
