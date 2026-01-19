"""
Case Assignment Service Unit Tests.

Tests for case assignment creation, management, and access control.
"""

import pytest
from datetime import datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.professional.assignment_service import CaseAssignmentService
from app.models.professional import (
    CaseAssignment,
    AssignmentRole,
    AssignmentStatus,
)
from app.schemas.professional import (
    CaseAssignmentCreate,
    CaseAssignmentUpdate,
)


# =============================================================================
# Assignment CRUD Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestAssignmentCRUD:
    """Tests for case assignment CRUD operations."""

    async def test_create_assignment(
        self, db: AsyncSession, test_profile, test_firm, test_family_file
    ):
        """Test creating a new case assignment."""
        service = CaseAssignmentService(db)

        assignment_data = CaseAssignmentCreate(
            family_file_id=test_family_file.id,
            assignment_role=AssignmentRole.LEAD_ATTORNEY,
            representing="parent_a",
            access_scopes=["agreement", "schedule", "messages"],
            can_control_aria=True,
            can_message_client=True,
        )

        assignment = await service.create_assignment(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
            data=assignment_data,
        )

        assert assignment is not None
        assert assignment.professional_id == test_profile.id
        assert assignment.firm_id == test_firm.id
        assert assignment.family_file_id == test_family_file.id
        assert assignment.assignment_role == AssignmentRole.LEAD_ATTORNEY.value
        assert assignment.representing == "parent_a"
        assert assignment.status == AssignmentStatus.ACTIVE.value
        assert assignment.can_control_aria is True

    async def test_get_assignment(self, db: AsyncSession, test_assignment):
        """Test getting an assignment by ID."""
        service = CaseAssignmentService(db)

        assignment = await service.get_assignment(test_assignment.id)

        assert assignment is not None
        assert assignment.id == test_assignment.id

    async def test_get_assignment_not_found(self, db: AsyncSession):
        """Test getting a non-existent assignment."""
        service = CaseAssignmentService(db)

        assignment = await service.get_assignment(str(uuid4()))

        assert assignment is None

    async def test_update_assignment(self, db: AsyncSession, test_assignment):
        """Test updating an assignment."""
        service = CaseAssignmentService(db)

        update_data = CaseAssignmentUpdate(
            access_scopes=["agreement", "schedule"],
            can_control_aria=False,
            internal_notes="Updated notes",
        )

        updated = await service.update_assignment(test_assignment.id, update_data)

        assert updated is not None
        assert updated.access_scopes == ["agreement", "schedule"]
        assert updated.can_control_aria is False
        assert updated.internal_notes == "Updated notes"

    async def test_complete_assignment(self, db: AsyncSession, test_assignment):
        """Test completing an assignment."""
        service = CaseAssignmentService(db)

        completed = await service.complete_assignment(test_assignment.id)

        assert completed is not None
        assert completed.status == AssignmentStatus.COMPLETED.value
        assert completed.completed_at is not None

    async def test_withdraw_assignment(self, db: AsyncSession, test_assignment):
        """Test withdrawing from an assignment."""
        service = CaseAssignmentService(db)

        withdrawn = await service.withdraw_assignment(test_assignment.id)

        assert withdrawn is not None
        assert withdrawn.status == AssignmentStatus.WITHDRAWN.value


# =============================================================================
# Assignment Listing Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestAssignmentListing:
    """Tests for listing assignments."""

    async def test_list_assignments_for_professional(
        self, db: AsyncSession, test_profile, test_assignment
    ):
        """Test listing assignments for a professional."""
        service = CaseAssignmentService(db)

        assignments = await service.list_assignments_for_professional(
            professional_id=test_profile.id,
        )

        assert len(assignments) >= 1
        assert any(a.id == test_assignment.id for a in assignments)

    async def test_list_assignments_filter_by_status(
        self, db: AsyncSession, test_profile, test_assignment
    ):
        """Test filtering assignments by status."""
        service = CaseAssignmentService(db)

        # Active assignments
        active = await service.list_assignments_for_professional(
            professional_id=test_profile.id,
            status=AssignmentStatus.ACTIVE,
        )
        assert len(active) >= 1

        # Completed assignments (none yet)
        completed = await service.list_assignments_for_professional(
            professional_id=test_profile.id,
            status=AssignmentStatus.COMPLETED,
        )
        assert len(completed) == 0

    async def test_list_assignments_for_family_file(
        self, db: AsyncSession, test_family_file, test_assignment
    ):
        """Test listing assignments for a family file."""
        service = CaseAssignmentService(db)

        assignments = await service.list_assignments_for_family_file(
            family_file_id=test_family_file.id,
        )

        assert len(assignments) >= 1
        assert any(a.id == test_assignment.id for a in assignments)

    async def test_list_assignments_for_firm(
        self, db: AsyncSession, test_firm, test_assignment
    ):
        """Test listing assignments for a firm."""
        service = CaseAssignmentService(db)

        assignments = await service.list_assignments_for_firm(
            firm_id=test_firm.id,
        )

        assert len(assignments) >= 1
        assert any(a.id == test_assignment.id for a in assignments)


# =============================================================================
# Assignment Access Control Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestAssignmentAccessControl:
    """Tests for assignment access control."""

    async def test_get_assignment_for_professional(
        self, db: AsyncSession, test_profile, test_family_file, test_assignment
    ):
        """Test getting a professional's assignment for a case."""
        service = CaseAssignmentService(db)

        assignment = await service.get_assignment_for_professional(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
        )

        assert assignment is not None
        assert assignment.id == test_assignment.id

    async def test_has_case_access(
        self, db: AsyncSession, test_profile, test_family_file, test_assignment
    ):
        """Test checking case access."""
        service = CaseAssignmentService(db)

        has_access = await service.has_case_access(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
        )

        assert has_access is True

    async def test_has_no_case_access(
        self, db: AsyncSession, second_profile, test_family_file
    ):
        """Test checking no case access."""
        service = CaseAssignmentService(db)

        has_access = await service.has_case_access(
            professional_id=second_profile.id,
            family_file_id=test_family_file.id,
        )

        assert has_access is False

    async def test_has_scope_access(
        self, db: AsyncSession, test_profile, test_family_file, test_assignment
    ):
        """Test checking scope access."""
        service = CaseAssignmentService(db)

        # Has agreement scope
        has_agreement = await service.has_scope_access(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
            scope="agreement",
        )
        assert has_agreement is True

        # Has schedule scope
        has_schedule = await service.has_scope_access(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
            scope="schedule",
        )
        assert has_schedule is True

    async def test_can_control_aria(
        self, db: AsyncSession, test_profile, test_family_file, test_assignment
    ):
        """Test checking ARIA control permission."""
        service = CaseAssignmentService(db)

        can_control = await service.can_control_aria(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
        )

        assert can_control is True

    async def test_can_message_client(
        self, db: AsyncSession, test_profile, test_family_file, test_assignment
    ):
        """Test checking client messaging permission."""
        service = CaseAssignmentService(db)

        can_message = await service.can_message_client(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
        )

        assert can_message is True


# =============================================================================
# Assignment Statistics Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestAssignmentStatistics:
    """Tests for assignment statistics."""

    async def test_count_assignments_for_professional(
        self, db: AsyncSession, test_profile, test_assignment
    ):
        """Test counting assignments for a professional."""
        service = CaseAssignmentService(db)

        count = await service.count_assignments_for_professional(
            professional_id=test_profile.id,
        )

        assert count >= 1

    async def test_count_assignments_by_status(
        self, db: AsyncSession, test_profile, test_assignment
    ):
        """Test counting assignments by status."""
        service = CaseAssignmentService(db)

        # Count active
        active_count = await service.count_assignments_for_professional(
            professional_id=test_profile.id,
            status=AssignmentStatus.ACTIVE,
        )
        assert active_count >= 1

        # Count completed
        completed_count = await service.count_assignments_for_professional(
            professional_id=test_profile.id,
            status=AssignmentStatus.COMPLETED,
        )
        assert completed_count == 0


# =============================================================================
# Edge Cases and Validation Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestAssignmentEdgeCases:
    """Tests for edge cases and validation."""

    async def test_duplicate_assignment_prevented(
        self, db: AsyncSession, test_profile, test_firm, test_family_file, test_assignment
    ):
        """Test that duplicate assignments are prevented."""
        service = CaseAssignmentService(db)

        assignment_data = CaseAssignmentCreate(
            family_file_id=test_family_file.id,
            assignment_role=AssignmentRole.ASSOCIATE,
            representing="parent_a",
            access_scopes=["agreement"],
        )

        # Should raise an error for duplicate assignment
        with pytest.raises(ValueError, match="already assigned"):
            await service.create_assignment(
                professional_id=test_profile.id,
                firm_id=test_firm.id,
                data=assignment_data,
            )

    async def test_cannot_update_completed_assignment(
        self, db: AsyncSession, test_assignment
    ):
        """Test that completed assignments cannot be updated."""
        service = CaseAssignmentService(db)

        # Complete the assignment first
        await service.complete_assignment(test_assignment.id)

        # Try to update
        update_data = CaseAssignmentUpdate(
            access_scopes=["agreement"],
        )

        with pytest.raises(ValueError, match="Cannot update"):
            await service.update_assignment(test_assignment.id, update_data)
