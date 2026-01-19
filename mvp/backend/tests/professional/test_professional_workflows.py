"""
Professional Portal Integration Tests.

End-to-end workflow tests for the professional portal.
"""

import pytest
from datetime import datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.professional import (
    FirmService,
    ProfessionalProfileService,
    CaseAssignmentService,
    ProfessionalAccessService,
    ProfessionalDashboardService,
)
from app.models.professional import (
    ProfessionalProfile,
    Firm,
    FirmMembership,
    CaseAssignment,
    ProfessionalAccessRequest,
    ProfessionalType,
    FirmType,
    FirmRole,
    MembershipStatus,
    AssignmentRole,
    AccessRequestStatus,
)
from app.schemas.professional import (
    ProfessionalProfileCreate,
    FirmCreate,
    FirmMemberInvite,
    CaseAssignmentCreate,
    AccessRequestCreate,
)


# =============================================================================
# Onboarding Workflow Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestOnboardingWorkflow:
    """Tests for the professional onboarding workflow."""

    async def test_complete_onboarding_flow(self, db: AsyncSession, test_user):
        """Test the complete onboarding workflow: profile -> firm -> ready."""
        profile_service = ProfessionalProfileService(db)
        firm_service = FirmService(db)

        # Step 1: Create professional profile
        profile_data = ProfessionalProfileCreate(
            professional_type=ProfessionalType.ATTORNEY,
            license_number="CA789012",
            license_state="CA",
            practice_areas=["custody", "divorce"],
        )

        profile = await profile_service.create_profile(
            user_id=test_user.id,
            data=profile_data,
        )

        assert profile is not None
        assert profile.user_id == test_user.id
        assert profile.is_active is True

        # Step 2: Create solo practice firm
        firm_data = FirmCreate(
            name=f"{test_user.first_name} {test_user.last_name} Law",
            firm_type=FirmType.SOLO_PRACTICE,
            email=test_user.email,
            state="CA",
        )

        firm = await firm_service.create_firm(
            user_id=test_user.id,
            professional_id=profile.id,
            data=firm_data,
        )

        assert firm is not None
        assert firm.created_by == test_user.id

        # Verify profile is owner of firm
        membership = await firm_service.get_membership(profile.id, firm.id)
        assert membership is not None
        assert membership.role == FirmRole.OWNER.value
        assert membership.status == MembershipStatus.ACTIVE.value

        # Step 3: Verify onboarding complete
        is_onboarded = await profile_service.is_onboarded(profile.id)
        assert is_onboarded is True

    async def test_join_existing_firm_flow(
        self, db: AsyncSession, test_firm, test_user, second_user
    ):
        """Test joining an existing firm via invitation."""
        profile_service = ProfessionalProfileService(db)
        firm_service = FirmService(db)

        # Step 1: Create profile for new user
        profile_data = ProfessionalProfileCreate(
            professional_type=ProfessionalType.PARALEGAL,
        )

        profile = await profile_service.create_profile(
            user_id=second_user.id,
            data=profile_data,
        )

        # Step 2: Firm owner invites new member
        invite_data = FirmMemberInvite(
            email=second_user.email,
            role=FirmRole.PARALEGAL,
        )

        invitation = await firm_service.invite_member(
            firm_id=test_firm.id,
            inviter_user_id=test_user.id,
            data=invite_data,
        )

        assert invitation is not None
        assert invitation.status == MembershipStatus.INVITED.value

        # Step 3: New user accepts invitation
        accepted = await firm_service.accept_invite(
            invite_token=invitation.invite_token,
            professional_id=profile.id,
        )

        assert accepted is not None
        assert accepted.status == MembershipStatus.ACTIVE.value
        assert accepted.professional_id == profile.id

        # Verify firm membership
        is_member = await firm_service.is_firm_member(profile.id, test_firm.id)
        assert is_member is True


# =============================================================================
# Case Access Workflow Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestCaseAccessWorkflow:
    """Tests for the case access request and assignment workflow."""

    async def test_parent_invites_professional_flow(
        self,
        db: AsyncSession,
        test_profile,
        test_firm,
        test_membership,
        test_family_file,
        parent_user_a,
    ):
        """Test parent inviting a professional to access their case."""
        access_service = ProfessionalAccessService(db)
        assignment_service = CaseAssignmentService(db)

        # Step 1: Parent creates access request/invitation
        request_data = AccessRequestCreate(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
            requested_scopes=["agreement", "schedule", "messages"],
        )

        access_request = await access_service.create_access_request(
            family_file_id=test_family_file.id,
            requested_by="parent",
            requested_by_user_id=parent_user_a.id,
            data=request_data,
        )

        assert access_request is not None
        assert access_request.status == AccessRequestStatus.PENDING.value

        # Step 2: Professional accepts the request
        accepted = await access_service.accept_request(
            request_id=access_request.id,
            professional_id=test_profile.id,
        )

        assert accepted is not None
        assert accepted.status == AccessRequestStatus.APPROVED.value

        # Step 3: Create assignment from approved request
        assignment_data = CaseAssignmentCreate(
            family_file_id=test_family_file.id,
            assignment_role=AssignmentRole.LEAD_ATTORNEY,
            representing="parent_a",
            access_scopes=access_request.requested_scopes,
            can_control_aria=True,
            can_message_client=True,
        )

        assignment = await assignment_service.create_assignment(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
            data=assignment_data,
        )

        assert assignment is not None
        assert assignment.status == "active"

        # Verify access
        has_access = await assignment_service.has_case_access(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
        )
        assert has_access is True

    async def test_professional_requests_access_flow(
        self,
        db: AsyncSession,
        test_profile,
        test_firm,
        test_membership,
        test_family_file,
        parent_user_a,
        parent_user_b,
    ):
        """Test professional requesting access to a case."""
        access_service = ProfessionalAccessService(db)

        # Step 1: Professional requests access
        request_data = AccessRequestCreate(
            requested_scopes=["agreement", "schedule"],
        )

        access_request = await access_service.create_access_request(
            family_file_id=test_family_file.id,
            requested_by="professional",
            requested_by_user_id=None,
            data=request_data,
            professional_id=test_profile.id,
            firm_id=test_firm.id,
        )

        assert access_request is not None
        assert access_request.status == AccessRequestStatus.PENDING.value

        # Step 2: Parent A approves
        await access_service.parent_approve_request(
            request_id=access_request.id,
            parent_user_id=parent_user_a.id,
            parent_side="a",
        )

        # Step 3: Parent B approves
        approved = await access_service.parent_approve_request(
            request_id=access_request.id,
            parent_user_id=parent_user_b.id,
            parent_side="b",
        )

        # Should be fully approved after both parents approve
        assert approved.status == AccessRequestStatus.APPROVED.value
        assert approved.parent_a_approved is True
        assert approved.parent_b_approved is True


# =============================================================================
# Dashboard Workflow Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestDashboardWorkflow:
    """Tests for the professional dashboard."""

    async def test_dashboard_aggregation(
        self,
        db: AsyncSession,
        test_profile,
        test_firm,
        test_membership,
        test_assignment,
    ):
        """Test dashboard data aggregation."""
        dashboard_service = ProfessionalDashboardService(db)

        dashboard = await dashboard_service.get_dashboard(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
        )

        assert dashboard is not None
        assert dashboard.case_count >= 1
        assert hasattr(dashboard, 'recent_activity')
        assert hasattr(dashboard, 'alerts')

    async def test_dashboard_pending_actions(
        self,
        db: AsyncSession,
        test_profile,
        test_firm,
        test_membership,
    ):
        """Test getting pending actions for dashboard."""
        dashboard_service = ProfessionalDashboardService(db)

        pending = await dashboard_service.get_pending_actions(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
        )

        assert pending is not None
        assert isinstance(pending, list)


# =============================================================================
# Multi-Professional Case Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestMultiProfessionalCase:
    """Tests for cases with multiple professionals."""

    async def test_multiple_professionals_same_case(
        self,
        db: AsyncSession,
        test_profile,
        second_profile,
        test_firm,
        test_family_file,
    ):
        """Test multiple professionals assigned to the same case."""
        assignment_service = CaseAssignmentService(db)

        # Assign first professional (parent A's attorney)
        assignment1 = await assignment_service.create_assignment(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
            data=CaseAssignmentCreate(
                family_file_id=test_family_file.id,
                assignment_role=AssignmentRole.LEAD_ATTORNEY,
                representing="parent_a",
                access_scopes=["agreement", "schedule", "messages"],
                can_control_aria=True,
            ),
        )

        # Create a second firm for parent B's attorney
        firm_service = FirmService(db)
        firm2 = Firm(
            id=str(uuid4()),
            name="Other Law Firm",
            slug="other-law-firm",
            firm_type=FirmType.LAW_FIRM.value,
            email="other@lawfirm.com",
            state="CA",
            is_active=True,
            created_by=second_profile.user_id,
        )
        db.add(firm2)

        membership2 = FirmMembership(
            id=str(uuid4()),
            professional_id=second_profile.id,
            firm_id=firm2.id,
            role=FirmRole.OWNER.value,
            status=MembershipStatus.ACTIVE.value,
            joined_at=datetime.utcnow(),
            invited_by=second_profile.user_id,
        )
        db.add(membership2)
        await db.commit()

        # Assign second professional (parent B's attorney)
        assignment2 = await assignment_service.create_assignment(
            professional_id=second_profile.id,
            firm_id=firm2.id,
            data=CaseAssignmentCreate(
                family_file_id=test_family_file.id,
                assignment_role=AssignmentRole.LEAD_ATTORNEY,
                representing="parent_b",
                access_scopes=["agreement", "schedule", "messages"],
                can_control_aria=False,  # Only one can control ARIA
            ),
        )

        # Verify both are assigned
        assignments = await assignment_service.list_assignments_for_family_file(
            family_file_id=test_family_file.id,
        )

        assert len(assignments) == 2
        assert any(a.representing == "parent_a" for a in assignments)
        assert any(a.representing == "parent_b" for a in assignments)

        # Verify each has access
        assert await assignment_service.has_case_access(
            test_profile.id, test_family_file.id
        )
        assert await assignment_service.has_case_access(
            second_profile.id, test_family_file.id
        )


# =============================================================================
# Case Lifecycle Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestCaseLifecycle:
    """Tests for case lifecycle with professional involvement."""

    async def test_complete_case_workflow(
        self,
        db: AsyncSession,
        test_profile,
        test_firm,
        test_membership,
        test_family_file,
    ):
        """Test complete case workflow from assignment to completion."""
        assignment_service = CaseAssignmentService(db)

        # Step 1: Create assignment
        assignment = await assignment_service.create_assignment(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
            data=CaseAssignmentCreate(
                family_file_id=test_family_file.id,
                assignment_role=AssignmentRole.MEDIATOR,
                representing="both",
                access_scopes=["agreement", "schedule", "messages", "compliance"],
                can_control_aria=True,
                can_message_client=True,
            ),
        )

        assert assignment.status == "active"

        # Step 2: Update assignment during case
        updated = await assignment_service.update_assignment(
            assignment_id=assignment.id,
            data=CaseAssignmentUpdate(
                internal_notes="Case progressing well. Agreement nearly finalized.",
            ),
        )

        assert updated.internal_notes is not None

        # Step 3: Complete assignment when case concludes
        completed = await assignment_service.complete_assignment(assignment.id)

        assert completed.status == "completed"
        assert completed.completed_at is not None

        # Verify no longer shows in active assignments
        active = await assignment_service.list_assignments_for_professional(
            professional_id=test_profile.id,
            status="active",
        )

        assert not any(a.id == assignment.id for a in active)

    async def test_withdraw_from_case(
        self,
        db: AsyncSession,
        test_profile,
        test_firm,
        test_family_file,
    ):
        """Test withdrawing from a case."""
        assignment_service = CaseAssignmentService(db)

        # Create assignment
        assignment = await assignment_service.create_assignment(
            professional_id=test_profile.id,
            firm_id=test_firm.id,
            data=CaseAssignmentCreate(
                family_file_id=test_family_file.id,
                assignment_role=AssignmentRole.ASSOCIATE,
                representing="parent_a",
                access_scopes=["agreement"],
            ),
        )

        # Withdraw
        withdrawn = await assignment_service.withdraw_assignment(assignment.id)

        assert withdrawn.status == "withdrawn"

        # Verify no longer has access
        has_access = await assignment_service.has_case_access(
            professional_id=test_profile.id,
            family_file_id=test_family_file.id,
        )

        assert has_access is False


# Import for CaseAssignmentUpdate
from app.schemas.professional import CaseAssignmentUpdate
