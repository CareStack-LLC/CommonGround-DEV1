"""
Professional access request service layer.

Business logic for parent-to-professional invitation flows
and professional access request management.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    ProfessionalProfile,
    ProfessionalAccessRequest,
    CaseAssignment,
    Firm,
    FirmMembership,
    AccessRequestStatus,
    AssignmentStatus,
    AssignmentRole,
    MembershipStatus,
)
from app.models.family_file import FamilyFile
from app.models.user import User
from app.schemas.professional import (
    AccessRequestCreate,
    InviteProfessionalRequest,
    CaseAssignmentCreate,
)


# =============================================================================
# Access Service
# =============================================================================

class ProfessionalAccessService:
    """Service for managing professional access requests and invitations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Parent Invites Professional
    # -------------------------------------------------------------------------

    async def invite_professional_by_email(
        self,
        family_file_id: str,
        email: str,
        inviter_id: str,
        requested_role: str = "lead_attorney",
        requested_scopes: list[str] = None,
        representing: Optional[str] = None,
        message: Optional[str] = None,
    ) -> ProfessionalAccessRequest:
        """
        Parent invites a professional by email.

        If the email matches an existing professional, link them.
        Otherwise, create a pending invitation.
        """
        # Default scopes if not provided
        if requested_scopes is None:
            requested_scopes = ["agreement", "schedule", "messages", "compliance"]

        # Validate family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Validate inviter is a participant
        if not await self._is_family_file_participant(family_file_id, inviter_id):
            raise ValueError("User is not a participant in this family file")

        # Check if professional exists
        professional = await self._get_professional_by_email(email)

        # Check for existing pending request
        existing = await self._get_pending_request(
            family_file_id,
            professional_id=professional.id if professional else None,
            email=email if not professional else None,
        )
        if existing:
            raise ValueError("An invitation is already pending for this professional")

        request = ProfessionalAccessRequest(
            id=str(uuid4()),
            family_file_id=family_file_id,
            professional_id=professional.id if professional else None,
            professional_email=email if not professional else None,
            requested_by="parent",
            requested_by_user_id=inviter_id,
            requested_role=requested_role,
            requested_scopes=requested_scopes,
            representing=representing,
            message=message,
            status=AccessRequestStatus.PENDING.value,
            # Auto-approve for the inviting parent
            **self._get_auto_approval(family_file, inviter_id),
            expires_at=datetime.utcnow() + timedelta(days=14),
        )

        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)

        return request

    async def invite_professional_by_id(
        self,
        family_file_id: str,
        professional_id: str,
        inviter_id: str,
        firm_id: Optional[str] = None,
        requested_role: str = "lead_attorney",
        requested_scopes: list[str] = None,
        representing: Optional[str] = None,
        message: Optional[str] = None,
    ) -> ProfessionalAccessRequest:
        """
        Parent invites a specific professional (from directory or firm).
        """
        # Default scopes if not provided
        if requested_scopes is None:
            requested_scopes = ["agreement", "schedule", "messages", "compliance"]

        # Validate family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Validate inviter is a participant
        if not await self._is_family_file_participant(family_file_id, inviter_id):
            raise ValueError("User is not a participant in this family file")

        # Validate professional exists
        professional = await self._get_professional(professional_id)
        if not professional:
            raise ValueError("Professional not found")

        # Check for existing pending request
        existing = await self._get_pending_request(family_file_id, professional_id=professional_id)
        if existing:
            raise ValueError("An invitation is already pending for this professional")

        request = ProfessionalAccessRequest(
            id=str(uuid4()),
            family_file_id=family_file_id,
            professional_id=professional_id,
            firm_id=firm_id,
            requested_by="parent",
            requested_by_user_id=inviter_id,
            requested_role=requested_role,
            requested_scopes=requested_scopes,
            representing=representing,
            message=message,
            status=AccessRequestStatus.PENDING.value,
            **self._get_auto_approval(family_file, inviter_id),
            expires_at=datetime.utcnow() + timedelta(days=14),
        )

        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)

        return request

    # -------------------------------------------------------------------------
    # Professional Requests Access
    # -------------------------------------------------------------------------

    async def request_access_to_case(
        self,
        family_file_id: str,
        professional_id: str,
        firm_id: Optional[str],
        requested_scopes: list[str],
        message: Optional[str] = None,
    ) -> ProfessionalAccessRequest:
        """
        Professional requests access to a family file.

        Requires approval from both parents.
        """
        # Validate family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Validate professional exists
        professional = await self._get_professional(professional_id)
        if not professional:
            raise ValueError("Professional not found")

        # If firm specified, validate membership
        if firm_id:
            membership = await self._get_firm_membership(professional_id, firm_id)
            if not membership or membership.status != MembershipStatus.ACTIVE.value:
                raise ValueError("Professional is not an active member of this firm")

        # Check for existing pending request
        existing = await self._get_pending_request(family_file_id, professional_id=professional_id)
        if existing:
            raise ValueError("Access request already pending")

        request = ProfessionalAccessRequest(
            id=str(uuid4()),
            family_file_id=family_file_id,
            professional_id=professional_id,
            firm_id=firm_id,
            requested_by="professional",
            requested_by_user_id=professional.user_id,
            requested_scopes=requested_scopes,
            message=message,
            status=AccessRequestStatus.PENDING.value,
            expires_at=datetime.utcnow() + timedelta(days=14),
        )

        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)

        return request

    async def invite_firm_from_directory(
        self,
        family_file_id: str,
        firm_id: str,
        inviter_user_id: str,
        message: Optional[str] = None,
    ) -> ProfessionalAccessRequest:
        """
        Parent invites a firm from the directory to represent them.

        Creates an access request with requested_by="parent" that the firm
        can accept. The firm will then assign a specific professional.
        """
        # Validate family file
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Verify inviter is a parent on the case
        if str(family_file.parent_a_id) != inviter_user_id and str(family_file.parent_b_id) != inviter_user_id:
            raise ValueError("You are not a parent on this family file")

        # Validate firm exists and is public
        from app.services.professional.firm_service import FirmService
        firm_service = FirmService(self.db)
        firm = await firm_service.get_firm(firm_id)
        if not firm:
            raise ValueError("Firm not found")
        if not firm.is_public or not firm.is_active:
            raise ValueError("Firm is not available in the directory")

        # Check for existing pending request to this firm
        existing = await self._get_pending_request(family_file_id, firm_id=firm_id)
        if existing:
            raise ValueError("Invitation already pending for this firm")

        # Determine which parent is inviting
        is_parent_a = str(family_file.parent_a_id) == inviter_user_id

        request = ProfessionalAccessRequest(
            id=str(uuid4()),
            family_file_id=family_file_id,
            firm_id=firm_id,
            professional_id=None,  # Firm will assign a professional later
            requested_by="parent",
            requested_by_user_id=inviter_user_id,
            requested_scopes=["read", "message"],  # Default scopes for invited firms
            message=message,
            status=AccessRequestStatus.PENDING.value,
            # Parent who invites auto-approves
            parent_a_approved=is_parent_a,
            parent_b_approved=not is_parent_a,
            parent_a_approved_at=datetime.utcnow() if is_parent_a else None,
            parent_b_approved_at=datetime.utcnow() if not is_parent_a else None,
            expires_at=datetime.utcnow() + timedelta(days=30),  # Longer expiry for directory invites
        )

        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)

        return request

    # -------------------------------------------------------------------------
    # Approval Flow
    # -------------------------------------------------------------------------

    async def approve_request(
        self,
        request_id: str,
        approver_user_id: str,
    ) -> ProfessionalAccessRequest:
        """
        Parent approves an access request.

        If both parents have approved, the request becomes fully approved.
        """
        request = await self.get_request(request_id)
        if not request:
            raise ValueError("Access request not found")

        if request.status != AccessRequestStatus.PENDING.value:
            raise ValueError(f"Request is not pending (status: {request.status})")

        # Check expiry
        if request.expires_at and datetime.utcnow() > request.expires_at:
            request.status = AccessRequestStatus.EXPIRED.value
            await self.db.commit()
            raise ValueError("Access request has expired")

        # Get family file to determine parent roles
        family_file = await self._get_family_file(request.family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        # Determine which parent is approving
        is_parent_a = approver_user_id == family_file.parent_a_id
        is_parent_b = approver_user_id == family_file.parent_b_id

        if not is_parent_a and not is_parent_b:
            raise ValueError("User is not a parent on this family file")

        # Record approval
        now = datetime.utcnow()
        if is_parent_a:
            request.parent_a_approved = True
            request.parent_a_approved_at = now
        if is_parent_b:
            request.parent_b_approved = True
            request.parent_b_approved_at = now

        # Only one parent needs to approve - professional represents one side
        if request.parent_a_approved or request.parent_b_approved:
            request.status = AccessRequestStatus.APPROVED.value
            request.approved_at = now

        request.updated_at = now
        await self.db.commit()
        await self.db.refresh(request)

        return request

    async def decline_request(
        self,
        request_id: str,
        decliner_user_id: str,
        reason: Optional[str] = None,
    ) -> ProfessionalAccessRequest:
        """
        Parent declines an access request.
        """
        request = await self.get_request(request_id)
        if not request:
            raise ValueError("Access request not found")

        if request.status != AccessRequestStatus.PENDING.value:
            raise ValueError(f"Request is not pending (status: {request.status})")

        # Validate decliner is a parent
        family_file = await self._get_family_file(request.family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        is_parent = (
            decliner_user_id == family_file.parent_a_id or
            decliner_user_id == family_file.parent_b_id
        )
        if not is_parent:
            raise ValueError("User is not a parent on this family file")

        now = datetime.utcnow()
        request.status = AccessRequestStatus.DECLINED.value
        request.declined_at = now
        request.decline_reason = reason
        request.updated_at = now

        await self.db.commit()
        await self.db.refresh(request)

        return request

    # -------------------------------------------------------------------------
    # Professional Accepts/Declines Invitation
    # -------------------------------------------------------------------------

    async def professional_accept_invitation(
        self,
        request_id: str,
        professional_id: str,
    ) -> ProfessionalAccessRequest:
        """
        Professional accepts a parent's invitation.

        Creates the case assignment immediately so the professional can see the case
        on their dashboard. The assignment is created even if only one parent has
        approved - dual-parent approval status can be tracked separately.
        """
        request = await self.get_request(request_id)
        if not request:
            raise ValueError("Access request not found")

        # Verify the professional
        if request.professional_id and request.professional_id != professional_id:
            raise ValueError("This invitation was sent to a different professional")

        # Check if already has an assignment
        if request.case_assignment_id:
            raise ValueError("This invitation has already been accepted")

        # Link professional if not already linked (email invite)
        if not request.professional_id:
            request.professional_id = professional_id

        # Mark as accepted by professional
        request.professional_accepted = True
        request.professional_accepted_at = datetime.utcnow()
        request.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(request)

        # Create the assignment immediately when professional accepts
        # This allows the case to show on the professional's dashboard
        # Determine assignment role from requested_role or default
        assignment_role = AssignmentRole.LEAD_ATTORNEY
        if request.requested_role:
            try:
                assignment_role = AssignmentRole(request.requested_role)
            except ValueError:
                pass  # Use default

        assignment = await self._create_assignment_for_accepted_request(
            request=request,
            assignment_role=assignment_role,
            representing=request.representing or "both",
        )
        request.case_assignment_id = assignment.id
        request.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(request)

        return request

    async def professional_decline_invitation(
        self,
        request_id: str,
        professional_id: str,
        reason: Optional[str] = None,
    ) -> ProfessionalAccessRequest:
        """
        Professional declines a parent's invitation.
        """
        request = await self.get_request(request_id)
        if not request:
            raise ValueError("Access request not found")

        # Verify the professional
        if request.professional_id and request.professional_id != professional_id:
            raise ValueError("This invitation was sent to a different professional")

        now = datetime.utcnow()
        request.status = AccessRequestStatus.DECLINED.value
        request.declined_at = now
        request.decline_reason = reason
        request.updated_at = now

        await self.db.commit()
        await self.db.refresh(request)

        return request

    # -------------------------------------------------------------------------
    # Create Assignment from Approved Request
    # -------------------------------------------------------------------------

    async def create_assignment_from_request(
        self,
        request: ProfessionalAccessRequest,
        assignment_role: AssignmentRole = AssignmentRole.LEAD_ATTORNEY,
        representing: str = "both",
    ) -> CaseAssignment:
        """
        Create a case assignment from a fully approved access request.

        Inherits settings from the firm when available:
        - can_control_aria: Based on role and firm settings
        - aria_preferences: From firm's default aria settings
        - can_message_client: Based on role and firm settings
        """
        if request.status != AccessRequestStatus.APPROVED.value:
            raise ValueError("Request is not approved")

        if not request.professional_id:
            raise ValueError("Request has no linked professional")

        # Enforce case limit for the assigned professional
        from app.models.professional import TIER_CASE_LIMITS, ProfessionalTier
        prof_result = await self.db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.id == request.professional_id
            )
        )
        prof = prof_result.scalar_one_or_none()
        if prof:
            tier = prof.subscription_tier or ProfessionalTier.STARTER.value
            try:
                tier_enum = ProfessionalTier(tier)
            except ValueError:
                tier_enum = ProfessionalTier.STARTER
            max_cases = TIER_CASE_LIMITS.get(tier_enum, 3)
            if prof.active_case_count >= max_cases:
                raise ValueError(
                    f"Professional has reached the maximum of {max_cases} active cases "
                    f"for their {tier} tier. Upgrade required to accept more cases."
                )

        # Check for existing assignment
        existing = await self._get_existing_assignment(
            request.professional_id,
            request.family_file_id,
        )
        if existing:
            if existing.status == AssignmentStatus.ACTIVE.value:
                raise ValueError("Professional already has an active assignment to this case")
            # Reactivate existing assignment
            existing.status = AssignmentStatus.ACTIVE.value
            existing.access_scopes = request.requested_scopes
            existing.assigned_at = datetime.utcnow()
            existing.updated_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        # Load firm settings if firm is specified
        firm_settings = {}
        if request.firm_id:
            firm = await self.db.execute(
                select(Firm).where(Firm.id == request.firm_id)
            )
            firm = firm.scalar_one_or_none()
            if firm and firm.settings:
                firm_settings = firm.settings

        # Determine ARIA control permissions based on role
        # Lead attorneys, mediators, and parenting coordinators can control ARIA by default
        aria_control_roles = [
            AssignmentRole.LEAD_ATTORNEY.value,
            AssignmentRole.MEDIATOR.value,
            AssignmentRole.PARENTING_COORDINATOR.value,
        ]
        can_control_aria = assignment_role.value in aria_control_roles

        # Override with firm setting if specified
        if "can_control_aria_by_default" in firm_settings:
            can_control_aria = firm_settings["can_control_aria_by_default"]

        # Inherit ARIA preferences from firm
        aria_preferences = {}
        if "default_aria_settings" in firm_settings:
            aria_preferences = firm_settings["default_aria_settings"]

        # Determine messaging permissions
        # Most roles can message clients except read-only
        can_message = assignment_role.value != AssignmentRole.PARALEGAL.value
        if "can_message_by_default" in firm_settings:
            can_message = firm_settings["can_message_by_default"]

        # Determine if dual-parent consent is required (GAL = "court" representing)
        needs_dual_consent = representing == "court"
        has_dual_consent = (
            request.parent_a_approved and request.parent_b_approved
        )

        # Create new assignment with inherited settings
        assignment = CaseAssignment(
            id=str(uuid4()),
            professional_id=request.professional_id,
            firm_id=request.firm_id,
            family_file_id=request.family_file_id,
            assignment_role=assignment_role.value,
            representing=representing,
            access_scopes=request.requested_scopes,
            can_control_aria=can_control_aria,
            aria_preferences=aria_preferences if aria_preferences else None,
            can_message_client=can_message,
            status=AssignmentStatus.ACTIVE.value,
            assigned_at=datetime.utcnow(),
            # GAL dual-parent consent tracking
            consent_both_parents=needs_dual_consent,
            consent_parent_a_at=request.parent_a_approved_at if has_dual_consent else None,
            consent_parent_b_at=request.parent_b_approved_at if has_dual_consent else None,
        )

        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment

    # -------------------------------------------------------------------------
    # Query Methods
    # -------------------------------------------------------------------------

    async def get_case_assignments(
        self,
        family_file_id: str,
        status: Optional[str] = None,
    ) -> list[CaseAssignment]:
        """Get all case assignments for a family file."""
        query = (
            select(CaseAssignment)
            .options(
                selectinload(CaseAssignment.professional).selectinload(ProfessionalProfile.user),
                selectinload(CaseAssignment.firm),
            )
            .where(CaseAssignment.family_file_id == family_file_id)
        )

        if status:
            query = query.where(CaseAssignment.status == status)
        else:
            # By default, show active assignments
            query = query.where(CaseAssignment.status == AssignmentStatus.ACTIVE.value)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_pending_requests_for_case(
        self,
        family_file_id: str,
    ) -> list[ProfessionalAccessRequest]:
        """Get pending access requests for a family file."""
        return await self.list_requests_for_family_file(
            family_file_id=family_file_id,
            status=AccessRequestStatus.PENDING,
        )

    async def get_access_request(
        self,
        request_id: str,
    ) -> Optional[ProfessionalAccessRequest]:
        """Get an access request by ID with relations loaded."""
        return await self.get_request_with_relations(request_id)

    async def get_case_assignment(
        self,
        assignment_id: str,
    ) -> Optional[CaseAssignment]:
        """Get a case assignment by ID."""
        result = await self.db.execute(
            select(CaseAssignment)
            .options(
                selectinload(CaseAssignment.professional).selectinload(ProfessionalProfile.user),
                selectinload(CaseAssignment.firm),
            )
            .where(CaseAssignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    async def revoke_assignment(
        self,
        assignment_id: str,
        revoker_id: str,
        reason: Optional[str] = None,
    ) -> Optional[CaseAssignment]:
        """Revoke a professional's case assignment."""
        # Get the assignment
        assignment = await self.get_case_assignment(assignment_id)
        if not assignment:
            return None

        # Verify the revoker is a parent on this family file
        family_file = await self._get_family_file(assignment.family_file_id)
        if not family_file:
            return None

        is_parent = (
            revoker_id == family_file.parent_a_id or
            revoker_id == family_file.parent_b_id
        )
        if not is_parent:
            return None

        # Revoke the assignment
        assignment.status = AssignmentStatus.WITHDRAWN.value
        assignment.completed_at = datetime.utcnow()
        assignment.updated_at = datetime.utcnow()
        if reason:
            assignment.internal_notes = (assignment.internal_notes or "") + f"\nRevoked: {reason}"

        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment

    async def get_request(self, request_id: str) -> Optional[ProfessionalAccessRequest]:
        """Get an access request by ID."""
        result = await self.db.execute(
            select(ProfessionalAccessRequest)
            .where(ProfessionalAccessRequest.id == request_id)
        )
        return result.scalar_one_or_none()

    async def get_request_with_relations(
        self,
        request_id: str,
    ) -> Optional[ProfessionalAccessRequest]:
        """Get an access request with professional and family file."""
        result = await self.db.execute(
            select(ProfessionalAccessRequest)
            .options(
                selectinload(ProfessionalAccessRequest.professional),
                selectinload(ProfessionalAccessRequest.family_file),
                selectinload(ProfessionalAccessRequest.firm),
            )
            .where(ProfessionalAccessRequest.id == request_id)
        )
        return result.scalar_one_or_none()

    async def list_requests_for_professional(
        self,
        professional_id: str,
        status: Optional[AccessRequestStatus] = None,
    ) -> list[ProfessionalAccessRequest]:
        """List access requests for a professional."""
        query = (
            select(ProfessionalAccessRequest)
            .options(selectinload(ProfessionalAccessRequest.family_file))
            .where(ProfessionalAccessRequest.professional_id == professional_id)
        )

        if status:
            query = query.where(ProfessionalAccessRequest.status == status.value)

        query = query.order_by(ProfessionalAccessRequest.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_requests_for_family_file(
        self,
        family_file_id: str,
        status: Optional[AccessRequestStatus] = None,
    ) -> list[ProfessionalAccessRequest]:
        """List access requests for a family file."""
        query = (
            select(ProfessionalAccessRequest)
            .options(
                selectinload(ProfessionalAccessRequest.professional),
                selectinload(ProfessionalAccessRequest.firm),
            )
            .where(ProfessionalAccessRequest.family_file_id == family_file_id)
        )

        if status:
            query = query.where(ProfessionalAccessRequest.status == status.value)

        query = query.order_by(ProfessionalAccessRequest.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_invitations_for_firm(
        self,
        firm_id: str,
        status: Optional[AccessRequestStatus] = None,
    ) -> list[ProfessionalAccessRequest]:
        """List parent-initiated invitations sent to a firm from the directory."""
        query = (
            select(ProfessionalAccessRequest)
            .options(
                selectinload(ProfessionalAccessRequest.family_file).options(
                    selectinload(FamilyFile.parent_a),
                    selectinload(FamilyFile.parent_b),
                    selectinload(FamilyFile.children),
                ),
            )
            .where(
                and_(
                    ProfessionalAccessRequest.firm_id == firm_id,
                    ProfessionalAccessRequest.requested_by == "parent",
                )
            )
        )

        if status:
            query = query.where(ProfessionalAccessRequest.status == status.value)

        query = query.order_by(ProfessionalAccessRequest.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_pending_invitations_for_email(
        self,
        email: str,
    ) -> list[ProfessionalAccessRequest]:
        """Get pending invitations for an email (for onboarding)."""
        result = await self.db.execute(
            select(ProfessionalAccessRequest)
            .options(selectinload(ProfessionalAccessRequest.family_file))
            .where(
                and_(
                    ProfessionalAccessRequest.professional_email == email,
                    ProfessionalAccessRequest.status == AccessRequestStatus.PENDING.value,
                    or_(
                        ProfessionalAccessRequest.expires_at.is_(None),
                        ProfessionalAccessRequest.expires_at > datetime.utcnow(),
                    ),
                )
            )
        )
        return list(result.scalars().all())

    # -------------------------------------------------------------------------
    # Revoke Access
    # -------------------------------------------------------------------------

    async def revoke_professional_access(
        self,
        family_file_id: str,
        assignment_id: str,
        revoker_user_id: str,
    ) -> CaseAssignment:
        """
        Parent revokes a professional's access to their case.
        """
        # Validate family file and revoker
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            raise ValueError("Family file not found")

        is_parent = (
            revoker_user_id == family_file.parent_a_id or
            revoker_user_id == family_file.parent_b_id
        )
        if not is_parent:
            raise ValueError("User is not a parent on this family file")

        # Get and update assignment
        result = await self.db.execute(
            select(CaseAssignment).where(
                and_(
                    CaseAssignment.id == assignment_id,
                    CaseAssignment.family_file_id == family_file_id,
                )
            )
        )
        assignment = result.scalar_one_or_none()

        if not assignment:
            raise ValueError("Assignment not found")

        assignment.status = AssignmentStatus.WITHDRAWN.value
        assignment.completed_at = datetime.utcnow()
        assignment.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment

    # -------------------------------------------------------------------------
    # Private Helpers
    # -------------------------------------------------------------------------

    async def _get_family_file(self, family_file_id: str) -> Optional[FamilyFile]:
        """Get a family file by ID."""
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        return result.scalar_one_or_none()

    async def _is_family_file_participant(
        self,
        family_file_id: str,
        user_id: str,
    ) -> bool:
        """Check if a user is a participant in a family file."""
        family_file = await self._get_family_file(family_file_id)
        if not family_file:
            return False
        return user_id == family_file.parent_a_id or user_id == family_file.parent_b_id

    async def _get_professional(
        self,
        professional_id: str,
    ) -> Optional[ProfessionalProfile]:
        """Get a professional by ID."""
        result = await self.db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.id == professional_id)
        )
        return result.scalar_one_or_none()

    async def _get_professional_by_email(
        self,
        email: str,
    ) -> Optional[ProfessionalProfile]:
        """Get a professional by their user email."""
        result = await self.db.execute(
            select(ProfessionalProfile)
            .join(User, User.id == ProfessionalProfile.user_id)
            .where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def _get_firm_membership(
        self,
        professional_id: str,
        firm_id: str,
    ) -> Optional[FirmMembership]:
        """Get a firm membership."""
        result = await self.db.execute(
            select(FirmMembership).where(
                and_(
                    FirmMembership.professional_id == professional_id,
                    FirmMembership.firm_id == firm_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_pending_request(
        self,
        family_file_id: str,
        professional_id: Optional[str] = None,
        email: Optional[str] = None,
        firm_id: Optional[str] = None,
    ) -> Optional[ProfessionalAccessRequest]:
        """Check for existing pending request."""
        query = select(ProfessionalAccessRequest).where(
            and_(
                ProfessionalAccessRequest.family_file_id == family_file_id,
                ProfessionalAccessRequest.status == AccessRequestStatus.PENDING.value,
            )
        )

        if professional_id:
            query = query.where(ProfessionalAccessRequest.professional_id == professional_id)
        elif email:
            query = query.where(ProfessionalAccessRequest.professional_email == email)
        elif firm_id:
            query = query.where(ProfessionalAccessRequest.firm_id == firm_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_existing_assignment(
        self,
        professional_id: str,
        family_file_id: str,
    ) -> Optional[CaseAssignment]:
        """Get an existing assignment."""
        result = await self.db.execute(
            select(CaseAssignment).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.family_file_id == family_file_id,
                )
            )
        )
        return result.scalar_one_or_none()

    def _get_auto_approval(
        self,
        family_file: FamilyFile,
        inviter_user_id: str,
    ) -> dict:
        """Get auto-approval fields for inviting parent."""
        now = datetime.utcnow()

        if inviter_user_id == family_file.parent_a_id:
            return {
                "parent_a_approved": True,
                "parent_a_approved_at": now,
            }
        elif inviter_user_id == family_file.parent_b_id:
            return {
                "parent_b_approved": True,
                "parent_b_approved_at": now,
            }
        return {}

    async def _create_assignment_for_accepted_request(
        self,
        request: ProfessionalAccessRequest,
        assignment_role: AssignmentRole = AssignmentRole.LEAD_ATTORNEY,
        representing: str = "both",
    ) -> CaseAssignment:
        """
        Create a case assignment when a professional accepts an invitation.

        This is called regardless of parent approval status - the assignment is
        created so the professional can see the case on their dashboard. The
        dual-parent approval status is tracked on the access request.
        """
        if not request.professional_id:
            raise ValueError("Request has no linked professional")

        # Check for existing assignment
        existing = await self._get_existing_assignment(
            request.professional_id,
            request.family_file_id,
        )
        if existing:
            if existing.status == AssignmentStatus.ACTIVE.value:
                raise ValueError("Professional already has an active assignment to this case")
            # Reactivate existing assignment
            existing.status = AssignmentStatus.ACTIVE.value
            existing.access_scopes = request.requested_scopes
            existing.assigned_at = datetime.utcnow()
            existing.updated_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        # Load firm settings if firm is specified
        firm_settings = {}
        if request.firm_id:
            firm = await self.db.execute(
                select(Firm).where(Firm.id == request.firm_id)
            )
            firm = firm.scalar_one_or_none()
            if firm and firm.settings:
                firm_settings = firm.settings

        # Determine ARIA control permissions based on role
        aria_control_roles = [
            AssignmentRole.LEAD_ATTORNEY.value,
            AssignmentRole.MEDIATOR.value,
            AssignmentRole.PARENTING_COORDINATOR.value,
        ]
        can_control_aria = assignment_role.value in aria_control_roles

        # Override with firm setting if specified
        if "can_control_aria_by_default" in firm_settings:
            can_control_aria = firm_settings["can_control_aria_by_default"]

        # Inherit ARIA preferences from firm
        aria_preferences = {}
        if "default_aria_settings" in firm_settings:
            aria_preferences = firm_settings["default_aria_settings"]

        # Determine messaging permissions
        can_message = assignment_role.value != AssignmentRole.PARALEGAL.value
        if "can_message_by_default" in firm_settings:
            can_message = firm_settings["can_message_by_default"]

        # Create new assignment
        assignment = CaseAssignment(
            id=str(uuid4()),
            professional_id=request.professional_id,
            firm_id=request.firm_id,
            family_file_id=request.family_file_id,
            assignment_role=assignment_role.value,
            representing=representing,
            access_scopes=request.requested_scopes,
            can_control_aria=can_control_aria,
            aria_preferences=aria_preferences if aria_preferences else None,
            can_message_client=can_message,
            status=AssignmentStatus.ACTIVE.value,
            assigned_at=datetime.utcnow(),
        )

        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)

        return assignment
