"""
Child Profile Service - Business logic for child profile management.

This service handles:
- Child profile creation with dual-parent approval workflow
- Profile approval and status transitions
- Collaborative editing with field attribution
- Court restriction enforcement
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
import json

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child, ChildProfileStatus
from app.models.case import Case, CaseParticipant
from app.models.family_file import FamilyFile
from app.models.user import User
from app.services.access_control import check_case_or_family_file_access
from app.schemas.child import (
    ChildCreateBasic,
    ChildUpdateBasic,
    ChildUpdateMedical,
    ChildUpdateEducation,
    ChildUpdatePreferences,
    ChildUpdateEmergencyContacts,
    CourtRestrictionUpdate,
)


class ChildService:
    """Service for managing child profiles with dual-parent approval."""

    def __init__(self, db: AsyncSession):
        """Initialize child service."""
        self.db = db

    async def _verify_case_access(
        self, case_id: str, user_id: str
    ) -> CaseParticipant:
        """Verify user has access to the case."""
        result = await self.db.execute(
            select(CaseParticipant).where(
                and_(
                    CaseParticipant.case_id == case_id,
                    CaseParticipant.user_id == user_id,
                    CaseParticipant.is_active == True,
                )
            )
        )
        participant = result.scalar_one_or_none()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this case",
            )
        return participant

    async def _verify_child_access(
        self, child: Child, user_id: str
    ) -> bool:
        """
        Verify user has access to a child profile.

        Checks both case_id and family_file_id for access.
        """
        # First check case_id if it exists
        if child.case_id:
            access = await check_case_or_family_file_access(
                self.db, child.case_id, user_id
            )
            if access.has_access:
                return True

        # Then check family_file_id if it exists
        if child.family_file_id:
            access = await check_case_or_family_file_access(
                self.db, child.family_file_id, user_id
            )
            if access.has_access:
                return True

        # No access found
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this child profile",
        )

    async def _get_case(self, case_id: str) -> Case:
        """Get case by ID."""
        result = await self.db.execute(
            select(Case).where(Case.id == case_id)
        )
        case = result.scalar_one_or_none()
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found",
            )
        return case

    async def _get_other_parent(
        self, case_id: str, user_id: str
    ) -> Optional[CaseParticipant]:
        """Get the other parent in a case."""
        result = await self.db.execute(
            select(CaseParticipant).where(
                and_(
                    CaseParticipant.case_id == case_id,
                    CaseParticipant.user_id != user_id,
                    CaseParticipant.is_active == True,
                )
            )
        )
        return result.scalar_one_or_none()

    # === CHILD PROFILE CREATION ===

    async def create_child(
        self,
        child_data: ChildCreateBasic,
        user: User,
    ) -> Child:
        """
        Create a new child profile with pending approval status.

        The creating parent automatically approves (approved_by_a).
        The profile becomes active only when the other parent approves.

        Args:
            child_data: Basic child information
            user: The parent creating the profile

        Returns:
            Created Child with pending_approval status
        """
        # Verify case access
        case = await self._get_case(child_data.case_id)
        participant = await self._verify_case_access(child_data.case_id, user.id)

        # Case must be active to add children
        if case.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add children to inactive case",
            )

        # Convert user.id to string for consistent storage
        user_id_str = str(user.id)

        # Create child with pending status
        child = Child(
            case_id=str(child_data.case_id) if child_data.case_id else None,
            first_name=child_data.first_name,
            last_name=child_data.last_name,
            date_of_birth=child_data.date_of_birth,
            gender=child_data.gender,
            status=ChildProfileStatus.PENDING_APPROVAL.value,
            created_by=user_id_str,
            approved_by_a=user_id_str,  # Creator auto-approves
            approved_at_a=datetime.utcnow(),
        )

        # Initialize field contributors with string IDs
        child.field_contributors = json.dumps({
            "first_name": user_id_str,
            "last_name": user_id_str,
            "date_of_birth": user_id_str,
        })

        self.db.add(child)
        await self.db.commit()
        await self.db.refresh(child)

        return child

    # === APPROVAL WORKFLOW ===

    async def approve_child(
        self,
        child_id: str,
        user: User,
    ) -> Child:
        """
        Approve a pending child profile.

        When both parents have approved, status transitions to active.

        Args:
            child_id: Child profile ID
            user: The parent approving

        Returns:
            Updated Child with new approval status
        """
        # Get child
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child profile not found",
            )

        # Verify access (checks both case_id and family_file_id)
        await self._verify_child_access(child, str(user.id))

        # Normalize all IDs to lowercase for consistent comparison (UUIDs can have different cases)
        user_id_norm = str(user.id).lower()
        approved_by_a_norm = str(child.approved_by_a).lower() if child.approved_by_a else None
        approved_by_b_norm = str(child.approved_by_b).lower() if child.approved_by_b else None

        # Check if already approved by this user (case-insensitive)
        if approved_by_a_norm == user_id_norm or approved_by_b_norm == user_id_norm:
            # SELF-HEALING: If both parents approved but status is still pending, fix it now.
            if (
                child.approved_by_a and
                child.approved_by_b and
                child.status == ChildProfileStatus.PENDING_APPROVAL.value
            ):
                child.status = ChildProfileStatus.ACTIVE.value
                await self.db.commit()
                await self.db.refresh(child)
                return child

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already approved this profile",
            )

        # Check status
        if child.status == ChildProfileStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile is already active",
            )

        if child.status == ChildProfileStatus.ARCHIVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve archived profile",
            )

        # Check if both slots are already filled (shouldn't happen, but safety check)
        if child.approved_by_a and child.approved_by_b:
            # Both already approved by different users - this is an edge case
            # Self-heal by activating
            child.status = ChildProfileStatus.ACTIVE.value
            await self.db.commit()
            await self.db.refresh(child)
            return child

        # Add approval to the appropriate slot
        user_id_str = str(user.id)
        if not child.approved_by_a:
            # First approval slot is empty (shouldn't happen normally, but handle it)
            child.approved_by_a = user_id_str
            child.approved_at_a = datetime.utcnow()
        elif not child.approved_by_b:
            # Second approval slot is empty - this is the normal case for second approver
            child.approved_by_b = user_id_str
            child.approved_at_b = datetime.utcnow()

        # If both parents have now approved, activate the profile
        if child.approved_by_a and child.approved_by_b:
            child.status = ChildProfileStatus.ACTIVE.value

        await self.db.commit()
        await self.db.refresh(child)

        return child

    # === PROFILE RETRIEVAL ===

    async def get_child(
        self,
        child_id: str,
        user: User,
    ) -> Child:
        """
        Get a child profile by ID.

        Enforces court restrictions if applicable.

        Args:
            child_id: Child profile ID
            user: Current user

        Returns:
            Child profile (potentially with restricted fields)
        """
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child profile not found",
            )

        # Verify access (checks both case_id and family_file_id)
        await self._verify_child_access(child, str(user.id))

        # SELF-HEALING: If both parents approved but status is still pending, fix it
        if (
            child.approved_by_a and
            child.approved_by_b and
            child.status == ChildProfileStatus.PENDING_APPROVAL.value
        ):
            child.status = ChildProfileStatus.ACTIVE.value
            await self.db.commit()
            await self.db.refresh(child)

        # Apply court restrictions if user is restricted
        user_id_str = str(user.id)
        if child.restricted_parent_id and str(child.restricted_parent_id) == user_id_str:
            child = self._apply_restrictions(child)

        return child

    async def list_children_for_case(
        self,
        case_id: str,
        user: User,
        include_pending: bool = True,
        include_archived: bool = False,
    ) -> List[Child]:
        """
        List all children for a case.

        Args:
            case_id: Case ID
            user: Current user
            include_pending: Include pending approval profiles
            include_archived: Include archived profiles

        Returns:
            List of Child profiles
        """
        # Verify access
        await self._verify_case_access(case_id, user.id)

        # Build query
        query = select(Child).where(Child.case_id == case_id)

        status_filter = [ChildProfileStatus.ACTIVE.value]
        if include_pending:
            status_filter.append(ChildProfileStatus.PENDING_APPROVAL.value)
        if include_archived:
            status_filter.append(ChildProfileStatus.ARCHIVED.value)

        query = query.where(Child.status.in_(status_filter))
        query = query.order_by(Child.date_of_birth)

        result = await self.db.execute(query)
        children = result.scalars().all()

        # Apply restrictions if needed
        processed_children = []
        for child in children:
            if child.restricted_parent_id == user.id:
                child = self._apply_restrictions(child)
            processed_children.append(child)

        return processed_children

    # === PROFILE UPDATES ===

    async def update_basic_info(
        self,
        child_id: str,
        update_data: ChildUpdateBasic,
        user: User,
    ) -> Child:
        """Update basic child information."""
        child = await self._get_editable_child(child_id, user)

        # Update fields
        updates = update_data.model_dump(exclude_unset=True)
        contributors = self._get_contributors(child)

        for field, value in updates.items():
            setattr(child, field, value)
            contributors[field] = user.id

        child.field_contributors = json.dumps(contributors)
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    async def update_medical_info(
        self,
        child_id: str,
        update_data: ChildUpdateMedical,
        user: User,
    ) -> Child:
        """Update medical information."""
        child = await self._get_editable_child(child_id, user)

        # Update fields
        updates = update_data.model_dump(exclude_unset=True)
        contributors = self._get_contributors(child)

        for field, value in updates.items():
            setattr(child, field, value)
            contributors[field] = user.id

        child.field_contributors = json.dumps(contributors)
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    async def update_education_info(
        self,
        child_id: str,
        update_data: ChildUpdateEducation,
        user: User,
    ) -> Child:
        """Update education information."""
        child = await self._get_editable_child(child_id, user)

        # Update fields
        updates = update_data.model_dump(exclude_unset=True)
        contributors = self._get_contributors(child)

        for field, value in updates.items():
            setattr(child, field, value)
            contributors[field] = user.id

        child.field_contributors = json.dumps(contributors)
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    async def update_preferences(
        self,
        child_id: str,
        update_data: ChildUpdatePreferences,
        user: User,
    ) -> Child:
        """Update preferences and favorites."""
        child = await self._get_editable_child(child_id, user)

        # Update fields
        updates = update_data.model_dump(exclude_unset=True)
        contributors = self._get_contributors(child)

        for field, value in updates.items():
            setattr(child, field, value)
            contributors[field] = user.id

        # Track size updates separately
        if "clothing_size" in updates or "shoe_size" in updates:
            child.sizes_updated_at = datetime.utcnow()

        child.field_contributors = json.dumps(contributors)
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    async def update_emergency_contacts(
        self,
        child_id: str,
        update_data: ChildUpdateEmergencyContacts,
        user: User,
    ) -> Child:
        """Update emergency contacts."""
        child = await self._get_editable_child(child_id, user)

        # Store contacts as JSON
        contacts = [c.model_dump() for c in update_data.emergency_contacts]
        child.emergency_contacts = json.dumps(contacts)

        contributors = self._get_contributors(child)
        contributors["emergency_contacts"] = user.id
        child.field_contributors = json.dumps(contributors)
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    async def update_photo(
        self,
        child_id: str,
        photo_url: str,
        user: User,
    ) -> Child:
        """Update child profile photo."""
        child = await self._get_editable_child(child_id, user)

        child.photo_url = photo_url

        contributors = self._get_contributors(child)
        contributors["photo_url"] = user.id
        child.field_contributors = json.dumps(contributors)
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    # === ARCHIVE ===

    async def archive_child(
        self,
        child_id: str,
        user: User,
    ) -> Child:
        """
        Archive a child profile (soft delete).

        Only active profiles can be archived.
        Both parents must have access.
        """
        child = await self.get_child(child_id, user)

        if child.status == ChildProfileStatus.ARCHIVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile is already archived",
            )

        child.status = ChildProfileStatus.ARCHIVED.value
        child.is_active = False
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    # === COURT RESTRICTIONS ===

    async def set_court_restrictions(
        self,
        child_id: str,
        restriction_data: CourtRestrictionUpdate,
        admin_user: User,  # Should be verified as admin/court
    ) -> Child:
        """
        Set court-mandated field restrictions.

        This is typically called by court staff or system admin.
        Restricts specific fields from being visible to one parent.

        Args:
            child_id: Child profile ID
            restriction_data: Restriction configuration
            admin_user: User applying restrictions (should be verified)

        Returns:
            Updated Child with restrictions
        """
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child profile not found",
            )

        # Set restrictions
        child.restricted_parent_id = restriction_data.restricted_parent_id
        child.court_restricted_fields = json.dumps(restriction_data.restricted_fields)
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    async def remove_court_restrictions(
        self,
        child_id: str,
        admin_user: User,
    ) -> Child:
        """Remove all court restrictions from a child profile."""
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child profile not found",
            )

        child.restricted_parent_id = None
        child.court_restricted_fields = None
        child.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(child)

        return child

    # === HELPER METHODS ===

    async def _get_editable_child(
        self,
        child_id: str,
        user: User,
    ) -> Child:
        """
        Get a child profile that is editable by the user.

        Profile must be active and user must have access.
        """
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child profile not found",
            )

        # Verify access (checks both case_id and family_file_id)
        await self._verify_child_access(child, user.id)

        # Check if editable
        if child.status == ChildProfileStatus.ARCHIVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit archived profile",
            )

        # Both parents can edit pending profiles (they may need to add info before approving)

        # Check court restrictions on fields
        if child.restricted_parent_id == user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Court restrictions prevent editing this profile",
            )

        return child

    def _get_contributors(self, child: Child) -> Dict[str, str]:
        """Parse field contributors from JSON."""
        if child.field_contributors:
            try:
                return json.loads(child.field_contributors)
            except:
                return {}
        return {}

    def _apply_restrictions(self, child: Child) -> Child:
        """
        Apply court restrictions to a child profile.

        Replaces restricted field values with placeholder text.
        """
        if not child.court_restricted_fields:
            return child

        try:
            restricted_fields = json.loads(child.court_restricted_fields)
        except:
            return child

        for field in restricted_fields:
            if hasattr(child, field):
                setattr(child, field, "[RESTRICTED BY COURT]")

        return child

    # === STATISTICS ===

    async def get_case_child_counts(
        self,
        case_id: str,
        user: User,
    ) -> Dict[str, int]:
        """
        Get child profile counts for a case.

        Returns:
            Dict with counts: pending_approval, active, archived, total
        """
        await self._verify_case_access(case_id, user.id)

        result = await self.db.execute(
            select(Child).where(Child.case_id == case_id)
        )
        children = result.scalars().all()

        counts = {
            "pending_approval": 0,
            "active": 0,
            "archived": 0,
            "total": len(children),
        }

        for child in children:
            if child.status == ChildProfileStatus.PENDING_APPROVAL.value:
                counts["pending_approval"] += 1
            elif child.status == ChildProfileStatus.ACTIVE.value:
                counts["active"] += 1
            elif child.status == ChildProfileStatus.ARCHIVED.value:
                counts["archived"] += 1

        return counts
