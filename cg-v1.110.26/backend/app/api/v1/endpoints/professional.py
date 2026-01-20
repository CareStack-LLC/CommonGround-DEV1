"""
Professional Portal API endpoints.

Endpoints for professional profiles, firms, memberships,
case assignments, and related features.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.professional import (
    ProfessionalProfile,
    Firm,
    FirmMembership,
    ProfessionalAccessRequest,
    FirmRole,
    FirmType,
    MembershipStatus,
    ProfessionalType,
    AccessRequestStatus,
    AssignmentRole,
)
from app.schemas.professional import (
    # Profile
    ProfessionalProfileCreate,
    ProfessionalProfileUpdate,
    ProfessionalProfileResponse,
    ProfessionalProfileWithFirms,
    # Firm
    FirmCreate,
    FirmUpdate,
    FirmResponse,
    FirmPublicResponse,
    FirmDirectoryResponse,
    FirmWithMembers,
    # Membership
    FirmMemberInvite,
    FirmMembershipUpdate,
    FirmMembershipResponse,
    # Access Requests
    AccessRequestCreate,
    AccessRequestResponse,
    InviteProfessionalRequest,
)
from app.services.professional import (
    FirmService,
    ProfessionalProfileService,
    ProfessionalAccessService,
    CaseAssignmentService,
    ProfessionalDashboardService,
    CaseTimelineService,
    ARIAControlService,
    ProfessionalMessagingService,
    ProfessionalIntakeService,
    CommunicationsService,
    ProfessionalComplianceService,
)
from app.schemas.professional import (
    # Case Assignment
    CaseAssignmentResponse,
    CaseAssignmentUpdate,
    # Timeline
    TimelineFilters,
    CaseTimeline,
    # ARIA
    ARIASettingsUpdate,
    ARIASettings,
    ARIAInterventionResponse,
    ARIAMetrics,
    # Messaging
    ProfessionalMessageCreate,
    ProfessionalMessageResponse,
    ProfessionalMessageThread,
    # Intake
    IntakeSessionCreate,
    IntakeSessionUpdate,
    IntakeSessionListItem,
    IntakeSessionDetail,
    IntakeTranscriptResponse,
    IntakeOutputsResponse,
    IntakeClarificationRequest,
    IntakeSessionListResponse,
)


router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

async def get_current_professional(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfessionalProfile:
    """Get the current user's professional profile or raise 403."""
    service = ProfessionalProfileService(db)
    profile = await service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional profile required. Please complete onboarding.",
        )
    if not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional profile is deactivated.",
        )
    return profile


def _profile_to_response(
    profile: ProfessionalProfile,
    user: Optional[User] = None,
) -> ProfessionalProfileResponse:
    """Convert a profile model to response schema."""
    user = user or profile.user
    return ProfessionalProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        professional_type=ProfessionalType(profile.professional_type),
        license_number=profile.license_number,
        license_state=profile.license_state,
        license_verified=profile.license_verified,
        license_verified_at=profile.license_verified_at,
        credentials=profile.credentials,
        practice_areas=profile.practice_areas,
        professional_email=profile.professional_email,
        professional_phone=profile.professional_phone,
        default_intake_template=profile.default_intake_template,
        notification_preferences=profile.notification_preferences,
        is_active=profile.is_active,
        onboarded_at=profile.onboarded_at,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        user_first_name=user.first_name if user else None,
        user_last_name=user.last_name if user else None,
        user_email=user.email if user else None,
    )


def _firm_to_response(
    firm: Firm,
    member_count: Optional[int] = None,
) -> FirmResponse:
    """Convert a firm model to response schema."""
    return FirmResponse(
        id=firm.id,
        name=firm.name,
        slug=firm.slug,
        firm_type=FirmType(firm.firm_type),
        email=firm.email,
        phone=firm.phone,
        website=firm.website,
        address_line1=firm.address_line1,
        address_line2=firm.address_line2,
        city=firm.city,
        state=firm.state,
        zip_code=firm.zip_code,
        logo_url=firm.logo_url,
        primary_color=firm.primary_color,
        is_public=firm.is_public,
        settings=firm.settings,
        subscription_tier=firm.subscription_tier,
        subscription_status=firm.subscription_status,
        is_active=firm.is_active,
        created_by=firm.created_by,
        created_at=firm.created_at,
        updated_at=firm.updated_at,
        member_count=member_count,
    )


def _membership_to_response(
    membership: FirmMembership,
) -> FirmMembershipResponse:
    """Convert a membership model to response schema."""
    return FirmMembershipResponse(
        id=membership.id,
        professional_id=membership.professional_id,
        firm_id=membership.firm_id,
        role=FirmRole(membership.role),
        custom_permissions=membership.custom_permissions,
        status=MembershipStatus(membership.status),
        invited_at=membership.invited_at,
        joined_at=membership.joined_at,
        invited_by=membership.invited_by,
        invite_email=membership.invite_email,
        professional_name=None,
        professional_email=None,
    )


# =============================================================================
# PROFILE MANAGEMENT
# =============================================================================

@router.get(
    "/profile",
    response_model=ProfessionalProfileWithFirms,
    summary="Get current professional profile",
)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's professional profile with firm memberships."""
    service = ProfessionalProfileService(db)
    profile = await service.get_profile_by_user_id(current_user.id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional profile not found. Please complete onboarding.",
        )

    # Get profile with firms
    profile_with_firms = await service.get_profile_with_firms(profile.id)

    # Build response
    response = _profile_to_response(profile_with_firms, current_user)

    # Add firm memberships
    firms = []
    if profile_with_firms.firm_memberships:
        for membership in profile_with_firms.firm_memberships:
            if membership.status in [MembershipStatus.ACTIVE.value, MembershipStatus.INVITED.value]:
                firm_service = FirmService(db)
                member_count = await firm_service.get_firm_member_count(membership.firm_id)
                firms.append(
                    FirmMembershipResponse(
                        id=membership.id,
                        professional_id=membership.professional_id,
                        firm_id=membership.firm_id,
                        role=FirmRole(membership.role),
                        custom_permissions=membership.custom_permissions,
                        status=MembershipStatus(membership.status),
                        invited_at=membership.invited_at,
                        joined_at=membership.joined_at,
                        invited_by=membership.invited_by,
                        invite_email=membership.invite_email,
                        firm_name=membership.firm.name if membership.firm else None,
                        firm_slug=membership.firm.slug if membership.firm else None,
                    )
                )

    return ProfessionalProfileWithFirms(
        **response.model_dump(),
        firms=firms,
    )


@router.post(
    "/profile",
    response_model=ProfessionalProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create professional profile (onboarding)",
)
async def create_profile(
    data: ProfessionalProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a professional profile for the current user (onboarding)."""
    service = ProfessionalProfileService(db)

    # Check if already has profile
    existing = await service.get_profile_by_user_id(current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Professional profile already exists for this user.",
        )

    profile = await service.create_profile(current_user.id, data)
    return _profile_to_response(profile, current_user)


@router.patch(
    "/profile",
    response_model=ProfessionalProfileResponse,
    summary="Update professional profile",
)
async def update_profile(
    data: ProfessionalProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Update the current user's professional profile."""
    service = ProfessionalProfileService(db)
    updated = await service.update_profile(profile.id, data)
    return _profile_to_response(updated, current_user)


@router.post(
    "/profile/verify-license",
    response_model=ProfessionalProfileResponse,
    summary="Submit license for verification",
)
async def verify_license(
    license_number: str,
    license_state: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Submit a license for verification."""
    service = ProfessionalProfileService(db)
    updated = await service.submit_license_verification(
        profile.id,
        license_number,
        license_state,
    )
    return _profile_to_response(updated, current_user)


@router.get(
    "/profile/stats",
    summary="Get profile statistics",
)
async def get_profile_stats(
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get statistics for the current professional's profile."""
    service = ProfessionalProfileService(db)
    return await service.get_profile_stats(profile.id)


# =============================================================================
# FIRM MANAGEMENT
# =============================================================================

@router.post(
    "/firms",
    response_model=FirmResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a firm",
)
async def create_firm(
    data: FirmCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Create a new firm. The creator becomes the owner."""
    service = FirmService(db)
    firm = await service.create_firm(current_user.id, profile.id, data)
    return _firm_to_response(firm, member_count=1)


@router.get(
    "/firms",
    response_model=list[FirmResponse],
    summary="List my firms",
)
async def list_my_firms(
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """List all firms the current professional belongs to."""
    service = FirmService(db)
    firms = await service.list_firms_for_professional(profile.id)

    result = []
    for firm in firms:
        member_count = await service.get_firm_member_count(firm.id)
        result.append(_firm_to_response(firm, member_count=member_count))

    return result


@router.get(
    "/firms/{firm_id}",
    response_model=FirmWithMembers,
    summary="Get firm details",
)
async def get_firm(
    firm_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get details of a firm the professional belongs to."""
    service = FirmService(db)

    # Check membership
    if not await service.is_firm_member(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this firm.",
        )

    firm = await service.get_firm(firm_id)
    if not firm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firm not found.",
        )

    members = await service.list_firm_members(firm_id)
    member_count = await service.get_firm_member_count(firm_id)

    # Convert members
    member_responses = []
    for m in members:
        resp = _membership_to_response(m)
        if m.professional:
            user = m.professional.user if hasattr(m.professional, 'user') else None
            resp.professional_name = f"{user.first_name} {user.last_name}" if user else None
            resp.professional_email = user.email if user else m.invite_email
        else:
            resp.professional_email = m.invite_email
        member_responses.append(resp)

    firm_response = _firm_to_response(firm, member_count=member_count)
    return FirmWithMembers(
        **firm_response.model_dump(),
        members=member_responses,
    )


@router.patch(
    "/firms/{firm_id}",
    response_model=FirmResponse,
    summary="Update firm",
)
async def update_firm(
    firm_id: str,
    data: FirmUpdate,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Update a firm. Requires admin or owner role."""
    service = FirmService(db)

    if not await service.can_manage_firm(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update firm settings.",
        )

    firm = await service.update_firm(firm_id, data)
    if not firm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firm not found.",
        )

    member_count = await service.get_firm_member_count(firm_id)
    return _firm_to_response(firm, member_count=member_count)


@router.delete(
    "/firms/{firm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate firm",
)
async def deactivate_firm(
    firm_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Deactivate a firm. Requires owner role."""
    service = FirmService(db)

    membership = await service.get_membership(profile.id, firm_id)
    if not membership or membership.role != FirmRole.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can deactivate a firm.",
        )

    await service.deactivate_firm(firm_id)
    return None


# =============================================================================
# FIRM MEMBERS
# =============================================================================

@router.get(
    "/firms/{firm_id}/members",
    response_model=list[FirmMembershipResponse],
    summary="List firm members",
)
async def list_firm_members(
    firm_id: str,
    include_invited: bool = True,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """List all members of a firm."""
    service = FirmService(db)

    if not await service.is_firm_member(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this firm.",
        )

    members = await service.list_firm_members(firm_id, include_invited)

    result = []
    for m in members:
        resp = _membership_to_response(m)
        if m.professional:
            user = m.professional.user if hasattr(m.professional, 'user') else None
            resp.professional_name = f"{user.first_name} {user.last_name}" if user else None
            resp.professional_email = user.email if user else m.invite_email
        else:
            resp.professional_email = m.invite_email
        result.append(resp)

    return result


@router.post(
    "/firms/{firm_id}/members/invite",
    response_model=FirmMembershipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite member to firm",
)
async def invite_firm_member(
    firm_id: str,
    data: FirmMemberInvite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Invite a member to the firm by email."""
    service = FirmService(db)

    if not await service.can_invite_members(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to invite members to this firm.",
        )

    try:
        membership = await service.invite_member(firm_id, current_user.id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

    resp = _membership_to_response(membership)
    resp.professional_email = data.email
    return resp


@router.patch(
    "/firms/{firm_id}/members/{membership_id}",
    response_model=FirmMembershipResponse,
    summary="Update member role",
)
async def update_firm_member(
    firm_id: str,
    membership_id: str,
    data: FirmMembershipUpdate,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Update a member's role or permissions."""
    service = FirmService(db)

    if not await service.can_manage_firm(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update member roles.",
        )

    membership = await service.update_membership(membership_id, data)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found.",
        )

    return _membership_to_response(membership)


@router.delete(
    "/firms/{firm_id}/members/{membership_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove member from firm",
)
async def remove_firm_member(
    firm_id: str,
    membership_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Remove a member from the firm."""
    service = FirmService(db)

    if not await service.can_manage_firm(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can remove members.",
        )

    try:
        await service.remove_member(membership_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return None


@router.post(
    "/firms/{firm_id}/members/{membership_id}/resend",
    response_model=FirmMembershipResponse,
    summary="Resend invite",
)
async def resend_invite(
    firm_id: str,
    membership_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Resend an invitation to a pending member."""
    service = FirmService(db)

    if not await service.can_invite_members(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to resend invitations.",
        )

    membership = await service.resend_invite(membership_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending invitation not found.",
        )

    return _membership_to_response(membership)


# =============================================================================
# FIRM DIRECTORY (Public)
# =============================================================================

@router.get(
    "/directory",
    response_model=FirmDirectoryResponse,
    summary="Search public firms",
)
async def search_directory(
    query: Optional[str] = Query(None, description="Search query"),
    state: Optional[str] = Query(None, max_length=2, description="State filter"),
    firm_type: Optional[FirmType] = Query(None, description="Firm type filter"),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Search public firms for directory listing. Does not require authentication."""
    service = FirmService(db)
    firms, total = await service.search_public_firms_with_count(
        query=query,
        state=state,
        firm_type=firm_type,
        limit=limit,
        offset=skip,
    )

    items = [
        FirmPublicResponse(
            id=f['id'],
            name=f['name'],
            slug=f['slug'],
            firm_type=FirmType(f['firm_type']),
            city=f['city'],
            state=f['state'],
            logo_url=f['logo_url'],
            website=f['website'],
            email=f['email'],
            phone=f['phone'],
            primary_color=f['primary_color'],
            practice_areas=f['practice_areas'] or [],
            professional_count=f['professional_count'] or 0,
            description=f['description'],
        )
        for f in firms
    ]

    return FirmDirectoryResponse(items=items, total=total)


@router.get(
    "/directory/{firm_slug}",
    response_model=FirmPublicResponse,
    summary="Get firm public profile",
)
async def get_directory_firm(
    firm_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a firm's public profile by slug. Does not require authentication."""
    service = FirmService(db)
    firm = await service.get_public_firm_by_slug(firm_slug)

    if not firm or not firm['is_public'] or not firm['is_active']:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firm not found.",
        )

    # Get professional count
    professional_count = await service.get_firm_member_count(firm['id'])

    return FirmPublicResponse(
        id=firm['id'],
        name=firm['name'],
        slug=firm['slug'],
        firm_type=FirmType(firm['firm_type']),
        city=firm['city'],
        state=firm['state'],
        logo_url=firm['logo_url'],
        website=firm['website'],
        email=firm['email'],
        phone=firm['phone'],
        primary_color=firm['primary_color'],
        practice_areas=firm['practice_areas'] or [],
        professional_count=professional_count,
        description=firm['description'],
    )


# =============================================================================
# DIRECTORY INVITATIONS (Parent-initiated)
# =============================================================================

@router.get(
    "/firms/{firm_id}/invitations",
    summary="List parent invitations to firm",
)
async def list_firm_invitations(
    firm_id: str,
    status_filter: Optional[AccessRequestStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    List invitations from parents to this firm (from directory search).

    Only firm members can view invitations. Shows cases where parents
    reached out through the directory looking for representation.
    """
    firm_service = FirmService(db)
    membership = await firm_service.get_membership(profile.id, firm_id)
    if not membership or membership.status != MembershipStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an active member of this firm",
        )

    access_service = ProfessionalAccessService(db)
    invitations = await access_service.list_invitations_for_firm(
        firm_id=firm_id,
        status=status_filter,
    )

    def build_invitation_response(inv):
        ff = inv.family_file
        parent_a = ff.parent_a if ff else None
        parent_b = ff.parent_b if ff else None
        return {
            "id": inv.id,
            "family_file_id": inv.family_file_id,
            "family_file_number": ff.family_file_number if ff else None,
            "family_file_title": ff.title if ff else None,
            "state": ff.state if ff else None,
            "county": ff.county if ff else None,
            "children_count": len(ff.children) if ff and ff.children else 0,
            "parent_a_name": f"{parent_a.first_name} {parent_a.last_name}" if parent_a else None,
            "parent_b_name": f"{parent_b.first_name} {parent_b.last_name}" if parent_b else None,
            "requested_by_user_id": inv.requested_by_user_id,
            "requested_scopes": inv.requested_scopes or [],
            "requested_role": inv.requested_role,
            "representing": inv.representing,
            "message": inv.message,
            "status": inv.status,
            "parent_a_approved": inv.parent_a_approved,
            "parent_b_approved": inv.parent_b_approved,
            "parent_a_approved_at": inv.parent_a_approved_at,
            "parent_b_approved_at": inv.parent_b_approved_at,
            "professional_id": inv.professional_id,
            "case_assignment_id": inv.case_assignment_id,
            "created_at": inv.created_at,
            "expires_at": inv.expires_at,
        }

    return {
        "items": [build_invitation_response(inv) for inv in invitations],
        "total": len(invitations),
    }


@router.post(
    "/firms/{firm_id}/invitations/{invitation_id}/accept",
    summary="Accept parent invitation and assign professional",
)
async def accept_firm_invitation(
    firm_id: str,
    invitation_id: str,
    assigned_professional_id: str = Body(..., embed=True, description="Professional from firm to assign"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Accept a parent's invitation and assign a professional from the firm.

    Only firm admins/partners can accept invitations. This assigns a specific
    professional to the case and creates the case assignment once both parents
    have approved.
    """
    firm_service = FirmService(db)
    membership = await firm_service.get_membership(profile.id, firm_id)
    if not membership or membership.status != MembershipStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an active member of this firm",
        )

    # Check if user has permission to accept (owner/admin/attorney roles)
    if membership.role not in [FirmRole.OWNER.value, FirmRole.ADMIN.value, FirmRole.ATTORNEY.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm owners, admins, or attorneys can accept invitations",
        )

    # Verify assigned professional is a member of the firm
    assigned_membership = await firm_service.get_membership(assigned_professional_id, firm_id)
    if not assigned_membership or assigned_membership.status != MembershipStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned professional is not an active member of this firm",
        )

    access_service = ProfessionalAccessService(db)
    invitation = await access_service.get_request(invitation_id)

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    if invitation.firm_id != firm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is not for this firm",
        )

    if invitation.status != AccessRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is not pending (status: {invitation.status})",
        )

    # Update invitation with assigned professional
    try:
        invitation.professional_id = assigned_professional_id

        # Only one parent needs to approve - professional represents one side
        # The requesting parent has already approved when creating the invitation
        if invitation.parent_a_approved or invitation.parent_b_approved:
            invitation.status = AccessRequestStatus.APPROVED.value
            invitation.approved_at = datetime.utcnow()

            # Create case assignment
            assignment = await access_service.create_assignment_from_request(invitation)
            invitation.case_assignment_id = str(assignment.id)

        await db.commit()
        await db.refresh(invitation)

        return {
            "id": str(invitation.id),
            "status": invitation.status,
            "professional_id": invitation.professional_id,
            "case_assignment_id": invitation.case_assignment_id,
            "message": "Professional assigned" if invitation.status == AccessRequestStatus.PENDING.value else "Invitation accepted and access granted",
        }
    except Exception as e:
        import traceback
        error_detail = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail,
        )


@router.post(
    "/firms/{firm_id}/invitations/{invitation_id}/decline",
    summary="Decline parent invitation to firm",
)
async def decline_firm_invitation(
    firm_id: str,
    invitation_id: str,
    reason: Optional[str] = Body(None, embed=True, description="Optional reason for declining"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Decline a parent's invitation.

    Only firm owners, partners, or admins can decline invitations.
    """
    firm_service = FirmService(db)
    membership = await firm_service.get_membership(profile.id, firm_id)
    if not membership or membership.status != MembershipStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an active member of this firm",
        )

    # Check if user has permission to decline (owner/admin/attorney roles)
    if membership.role not in [FirmRole.OWNER.value, FirmRole.ADMIN.value, FirmRole.ATTORNEY.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm owners, admins, or attorneys can decline invitations",
        )

    access_service = ProfessionalAccessService(db)
    invitation = await access_service.get_request(invitation_id)

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    if invitation.firm_id != firm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is not for this firm",
        )

    if invitation.status != AccessRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is not pending (status: {invitation.status})",
        )

    # Update invitation status to declined
    invitation.status = AccessRequestStatus.DECLINED.value
    invitation.declined_at = datetime.utcnow()
    invitation.decline_reason = reason

    await db.commit()
    await db.refresh(invitation)

    return {
        "id": invitation.id,
        "status": invitation.status,
        "decline_reason": invitation.decline_reason,
        "message": "Invitation declined",
    }


@router.get(
    "/firms/{firm_id}/invitations/{invitation_id}/preview",
    summary="Get case preview for invitation",
)
async def get_invitation_case_preview(
    firm_id: str,
    invitation_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get detailed case preview for an invitation before accepting.

    Returns agreement summary, compliance metrics, message trends,
    and ClearFund overview to help professional evaluate the case.
    """
    from datetime import timedelta
    from sqlalchemy import select, func, and_
    from app.models.agreement import Agreement
    from app.models.message import Message, MessageFlag
    from app.models.clearfund import Obligation
    from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance

    # Verify firm membership
    firm_service = FirmService(db)
    membership = await firm_service.get_membership(profile.id, firm_id)
    if not membership or membership.status != MembershipStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an active member of this firm",
        )

    # Get invitation with family file and nested relationships
    from sqlalchemy.orm import selectinload
    from app.models.family_file import FamilyFile
    from app.models.professional import ProfessionalAccessRequest

    result = await db.execute(
        select(ProfessionalAccessRequest)
        .options(
            selectinload(ProfessionalAccessRequest.family_file).options(
                selectinload(FamilyFile.parent_a),
                selectinload(FamilyFile.parent_b),
                selectinload(FamilyFile.children),
            )
        )
        .where(ProfessionalAccessRequest.id == invitation_id)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    if str(invitation.firm_id) != firm_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is not for this firm",
        )

    # Get family file with relationships
    ff = invitation.family_file
    if not ff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found",
        )

    parent_a = ff.parent_a
    parent_b = ff.parent_b

    # Build children preview
    children_preview = []
    if ff.children:
        from datetime import date
        for child in ff.children:
            age = None
            if child.date_of_birth:
                today = date.today()
                age = today.year - child.date_of_birth.year - (
                    (today.month, today.day) < (child.date_of_birth.month, child.date_of_birth.day)
                )
            children_preview.append({
                "id": str(child.id),
                "first_name": child.first_name,
                "age": age,
                "has_special_needs": bool(child.has_special_needs),
            })

    # Get agreement info
    agreement_preview = {
        "has_active_agreement": False,
        "agreement_title": None,
        "total_sections": 0,
        "completed_sections": 0,
        "last_updated": None,
        "key_sections": [],
    }

    try:
        agreement_result = await db.execute(
            select(Agreement)
            .where(Agreement.family_file_id == ff.id)
            .where(Agreement.status.in_(["active", "pending_approval", "draft"]))
            .order_by(Agreement.updated_at.desc())
            .limit(1)
        )
        agreement = agreement_result.scalar_one_or_none()
        if agreement:
            agreement_preview["has_active_agreement"] = True
            agreement_preview["agreement_title"] = agreement.title
            agreement_preview["last_updated"] = agreement.updated_at

            # Count sections from agreement_data
            if agreement.agreement_data:
                sections = agreement.agreement_data.get("sections", {})
                total = 0
                completed = 0
                key_sections = []
                for section_name, section_data in sections.items():
                    total += 1
                    if section_data and section_data.get("data"):
                        completed += 1
                        key_sections.append(section_name.replace("_", " ").title())
                agreement_preview["total_sections"] = total
                agreement_preview["completed_sections"] = completed
                agreement_preview["key_sections"] = key_sections[:5]  # Top 5
    except Exception:
        pass  # Agreement data not critical

    # Get message trends (last 30 days)
    message_preview = {
        "total_messages_30d": 0,
        "flagged_messages_30d": 0,
        "flag_rate": 0.0,
        "parent_a_messages": 0,
        "parent_b_messages": 0,
        "last_message_at": None,
    }

    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Total messages
        msg_count_result = await db.execute(
            select(func.count(Message.id))
            .where(Message.family_file_id == ff.id)
            .where(Message.created_at >= thirty_days_ago)
        )
        message_preview["total_messages_30d"] = msg_count_result.scalar() or 0

        # Flagged messages
        flagged_result = await db.execute(
            select(func.count(Message.id))
            .where(Message.family_file_id == ff.id)
            .where(Message.created_at >= thirty_days_ago)
            .where(Message.was_flagged == True)
        )
        message_preview["flagged_messages_30d"] = flagged_result.scalar() or 0

        if message_preview["total_messages_30d"] > 0:
            message_preview["flag_rate"] = round(
                message_preview["flagged_messages_30d"] / message_preview["total_messages_30d"], 3
            )

        # Messages by parent
        if parent_a:
            pa_result = await db.execute(
                select(func.count(Message.id))
                .where(Message.family_file_id == ff.id)
                .where(Message.sender_id == str(parent_a.id))
                .where(Message.created_at >= thirty_days_ago)
            )
            message_preview["parent_a_messages"] = pa_result.scalar() or 0

        if parent_b:
            pb_result = await db.execute(
                select(func.count(Message.id))
                .where(Message.family_file_id == ff.id)
                .where(Message.sender_id == str(parent_b.id))
                .where(Message.created_at >= thirty_days_ago)
            )
            message_preview["parent_b_messages"] = pb_result.scalar() or 0

        # Last message
        last_msg_result = await db.execute(
            select(Message.created_at)
            .where(Message.family_file_id == ff.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        if last_msg:
            message_preview["last_message_at"] = last_msg
    except Exception:
        pass  # Message data not critical

    # Get compliance/exchange metrics
    compliance_preview = {
        "exchange_completion_rate": None,
        "on_time_rate": None,
        "total_exchanges_30d": 0,
        "completed_exchanges_30d": 0,
        "communication_flag_rate": message_preview["flag_rate"],
        "overall_health": "unknown",
    }

    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Exchange instances in last 30 days (join through CustodyExchange for family_file_id)
        exchange_result = await db.execute(
            select(func.count(CustodyExchangeInstance.id))
            .join(CustodyExchange, CustodyExchangeInstance.exchange_id == CustodyExchange.id)
            .where(CustodyExchange.family_file_id == str(ff.id))
            .where(CustodyExchangeInstance.scheduled_time >= thirty_days_ago)
        )
        compliance_preview["total_exchanges_30d"] = exchange_result.scalar() or 0

        # Completed exchanges
        completed_result = await db.execute(
            select(func.count(CustodyExchangeInstance.id))
            .join(CustodyExchange, CustodyExchangeInstance.exchange_id == CustodyExchange.id)
            .where(CustodyExchange.family_file_id == str(ff.id))
            .where(CustodyExchangeInstance.scheduled_time >= thirty_days_ago)
            .where(CustodyExchangeInstance.status == "completed")
        )
        compliance_preview["completed_exchanges_30d"] = completed_result.scalar() or 0

        if compliance_preview["total_exchanges_30d"] > 0:
            compliance_preview["exchange_completion_rate"] = round(
                compliance_preview["completed_exchanges_30d"] / compliance_preview["total_exchanges_30d"], 3
            )

            # Determine overall health (thresholds are now decimals: 0.9 = 90%, 0.1 = 10%)
            rate = compliance_preview["exchange_completion_rate"]
            flag_rate = compliance_preview["communication_flag_rate"]
            if rate >= 0.9 and flag_rate <= 0.1:
                compliance_preview["overall_health"] = "excellent"
            elif rate >= 0.75 and flag_rate <= 0.2:
                compliance_preview["overall_health"] = "good"
            elif rate >= 0.5 and flag_rate <= 0.35:
                compliance_preview["overall_health"] = "fair"
            else:
                compliance_preview["overall_health"] = "concerning"
    except Exception:
        pass  # Compliance data not critical

    # Get ClearFund overview
    clearfund_preview = {
        "total_obligations": 0,
        "pending_obligations": 0,
        "total_amount": 0.0,
        "paid_amount": 0.0,
        "overdue_amount": 0.0,
        "categories": [],
    }

    try:
        # Get all obligations
        obligations_result = await db.execute(
            select(Obligation)
            .where(Obligation.family_file_id == ff.id)
        )
        obligations = obligations_result.scalars().all()

        categories_set = set()
        for obl in obligations:
            clearfund_preview["total_obligations"] += 1
            clearfund_preview["total_amount"] += float(obl.amount or 0)

            if obl.status == "pending":
                clearfund_preview["pending_obligations"] += 1
            elif obl.status == "funded" or obl.status == "completed":
                clearfund_preview["paid_amount"] += float(obl.amount or 0)
            elif obl.status == "overdue":
                clearfund_preview["overdue_amount"] += float(obl.amount or 0)

            if obl.category:
                categories_set.add(obl.category)

        clearfund_preview["categories"] = list(categories_set)[:5]
    except Exception:
        pass  # ClearFund data not critical

    return {
        "family_file_id": str(ff.id),
        "family_file_number": ff.family_file_number,
        "family_file_title": ff.title,
        "state": ff.state,
        "county": ff.county,
        "created_at": ff.created_at,
        "parent_a_name": f"{parent_a.first_name} {parent_a.last_name}" if parent_a else None,
        "parent_b_name": f"{parent_b.first_name} {parent_b.last_name}" if parent_b else None,
        "children": children_preview,
        "agreement": agreement_preview,
        "compliance": compliance_preview,
        "messages": message_preview,
        "clearfund": clearfund_preview,
        "requested_role": invitation.requested_role,
        "requested_scopes": invitation.requested_scopes or [],
        "representing": invitation.representing,
        "message": invitation.message,
    }


# =============================================================================
# INVITATIONS (Accept flow)
# =============================================================================

@router.post(
    "/invitations/{invite_token}/accept",
    response_model=FirmMembershipResponse,
    summary="Accept firm invitation by token",
)
async def accept_invitation_by_token(
    invite_token: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Accept a firm membership invitation using the invite token."""
    service = FirmService(db)
    membership = await service.accept_invite(invite_token, profile.id)

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or expired.",
        )

    return _membership_to_response(membership)


@router.get(
    "/invitations/pending",
    response_model=list[FirmMembershipResponse],
    summary="Get pending invitations",
)
async def get_pending_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pending firm invitations for the current user's email."""
    service = FirmService(db)
    memberships = await service.get_pending_invites_for_email(current_user.email)

    result = []
    for m in memberships:
        resp = _membership_to_response(m)
        if m.firm:
            resp.firm_name = m.firm.name
            resp.firm_slug = m.firm.slug
        result.append(resp)

    return result


# =============================================================================
# ACCESS REQUESTS (Professional-initiated)
# =============================================================================

def _access_request_to_response(
    request: ProfessionalAccessRequest,
) -> AccessRequestResponse:
    """Convert an access request model to response schema."""
    return AccessRequestResponse(
        id=request.id,
        family_file_id=request.family_file_id,
        professional_id=request.professional_id,
        professional_email=request.professional_email,
        firm_id=request.firm_id,
        requested_by=request.requested_by,
        requested_by_user_id=request.requested_by_user_id,
        requested_role=AssignmentRole(request.requested_role),
        requested_scopes=request.requested_scopes or [],
        representing=request.representing,
        status=AccessRequestStatus(request.status),
        parent_a_approved=request.parent_a_approved,
        parent_b_approved=request.parent_b_approved,
        parent_a_approved_at=request.parent_a_approved_at,
        parent_b_approved_at=request.parent_b_approved_at,
        approved_at=request.approved_at,
        declined_at=request.declined_at,
        decline_reason=request.decline_reason,
        case_assignment_id=request.case_assignment_id,
        expires_at=request.expires_at,
        message=request.message,
        created_at=request.created_at,
        updated_at=request.updated_at,
        # Related info - only populate if already loaded to avoid lazy loading issues
        family_file_title=None,  # Relationship not eager loaded
        professional_name=None,  # Would need user relationship
        firm_name=None,  # Relationship not eager loaded
    )


@router.get(
    "/access-requests",
    response_model=list[AccessRequestResponse],
    summary="List my access requests",
)
async def list_my_access_requests(
    status_filter: Optional[AccessRequestStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """List access requests for the current professional."""
    service = ProfessionalAccessService(db)
    requests = await service.list_requests_for_professional(
        profile.id,
        status=status_filter,
    )
    return [_access_request_to_response(r) for r in requests]


@router.post(
    "/access-requests",
    response_model=AccessRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request access to a case",
)
async def request_case_access(
    data: AccessRequestCreate,
    firm_id: Optional[str] = Query(None, description="Firm to request on behalf of"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Professional requests access to a family file."""
    service = ProfessionalAccessService(db)

    try:
        request = await service.request_access_to_case(
            family_file_id=data.family_file_id,
            professional_id=profile.id,
            firm_id=firm_id,
            requested_scopes=data.requested_scopes,
            message=data.message,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return _access_request_to_response(request)


@router.get(
    "/access-requests/{request_id}",
    response_model=AccessRequestResponse,
    summary="Get access request details",
)
async def get_access_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get details of an access request."""
    service = ProfessionalAccessService(db)
    request = await service.get_request_with_relations(request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found.",
        )

    # Verify professional owns this request
    if request.professional_id != profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request.",
        )

    return _access_request_to_response(request)


@router.post(
    "/access-requests/{request_id}/accept",
    response_model=AccessRequestResponse,
    summary="Accept a case invitation",
)
async def accept_case_invitation(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Professional accepts a parent's invitation to access their case."""
    service = ProfessionalAccessService(db)

    try:
        request = await service.professional_accept_invitation(request_id, profile.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return _access_request_to_response(request)


@router.post(
    "/access-requests/{request_id}/decline",
    response_model=AccessRequestResponse,
    summary="Decline a case invitation",
)
async def decline_case_invitation(
    request_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Professional declines a parent's invitation."""
    service = ProfessionalAccessService(db)

    try:
        request = await service.professional_decline_invitation(
            request_id,
            profile.id,
            reason=reason,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return _access_request_to_response(request)


@router.get(
    "/case-invitations/pending",
    response_model=list[AccessRequestResponse],
    summary="Get pending case invitations",
)
async def get_pending_case_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get pending case invitations for the current user's email.

    This is for professionals who haven't onboarded yet but received
    an invitation from a parent.
    """
    service = ProfessionalAccessService(db)
    requests = await service.list_pending_invitations_for_email(current_user.email)
    return [_access_request_to_response(r) for r in requests]


# =============================================================================
# DASHBOARD
# =============================================================================

@router.get(
    "/dashboard",
    summary="Get professional dashboard",
)
async def get_dashboard(
    firm_id: Optional[str] = Query(None, description="Filter by firm"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get aggregated dashboard data for the professional."""
    service = ProfessionalDashboardService(db)
    return await service.get_dashboard(profile.id, firm_id)


@router.get(
    "/dashboard/alerts",
    summary="Get dashboard alerts",
)
async def get_dashboard_alerts(
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get active alerts for the professional."""
    service = ProfessionalDashboardService(db)
    return await service.get_alerts(profile.id)


@router.get(
    "/dashboard/pending-actions",
    summary="Get pending actions",
)
async def get_pending_actions(
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get items requiring the professional's attention."""
    service = ProfessionalDashboardService(db)
    return await service.get_pending_actions(profile.id)


@router.get(
    "/dashboard/upcoming-events",
    summary="Get upcoming events",
)
async def get_upcoming_events(
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get upcoming events across all assigned cases."""
    service = ProfessionalDashboardService(db)
    return await service.get_upcoming_events(profile.id, days=days)


# =============================================================================
# CASE MANAGEMENT
# =============================================================================

@router.get(
    "/cases",
    response_model=list[CaseAssignmentResponse],
    summary="List assigned cases",
)
async def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    firm_id: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """List all cases assigned to the professional."""
    from app.models.professional import AssignmentStatus

    service = CaseAssignmentService(db)

    status = None
    if status_filter:
        try:
            status = AssignmentStatus(status_filter)
        except ValueError:
            pass

    assignments = await service.list_assignments_for_professional(
        profile.id,
        status=status,
        firm_id=firm_id,
        include_inactive=include_inactive,
    )

    result = []
    for a in assignments:
        result.append(CaseAssignmentResponse(
            id=a.id,
            professional_id=a.professional_id,
            firm_id=a.firm_id,
            family_file_id=a.family_file_id,
            assignment_role=AssignmentRole(a.assignment_role),
            representing=a.representing,
            access_scopes=a.access_scopes or [],
            can_control_aria=a.can_control_aria,
            aria_preferences=a.aria_preferences,
            can_message_client=a.can_message_client,
            status=a.status,
            assigned_at=a.assigned_at,
            completed_at=a.completed_at,
            created_at=a.created_at,
            updated_at=a.updated_at,
            family_file_number=a.family_file.family_file_number if a.family_file else None,
            firm_name=a.firm.name if a.firm else None,
        ))

    return result


@router.get(
    "/cases/{family_file_id}",
    response_model=CaseAssignmentResponse,
    summary="Get case details",
)
async def get_case(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get details of a specific case assignment."""
    from app.models.professional import AssignmentStatus

    service = CaseAssignmentService(db)
    assignment = await service.get_assignment_for_professional(
        profile.id, family_file_id
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case assignment not found.",
        )

    # Log access
    await service.log_access(
        professional_id=profile.id,
        family_file_id=family_file_id,
        action="view_case",
    )

    return CaseAssignmentResponse(
        id=assignment.id,
        professional_id=assignment.professional_id,
        firm_id=assignment.firm_id,
        family_file_id=assignment.family_file_id,
        assignment_role=AssignmentRole(assignment.assignment_role),
        representing=assignment.representing,
        access_scopes=assignment.access_scopes or [],
        can_control_aria=assignment.can_control_aria,
        aria_preferences=assignment.aria_preferences,
        can_message_client=assignment.can_message_client,
        status=assignment.status,
        assigned_at=assignment.assigned_at,
        completed_at=assignment.completed_at,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
        family_file_number=assignment.family_file.family_file_number if assignment.family_file else None,
        firm_name=assignment.firm.name if assignment.firm else None,
    )


@router.patch(
    "/cases/{family_file_id}",
    response_model=CaseAssignmentResponse,
    summary="Update case assignment",
)
async def update_case_assignment(
    family_file_id: str,
    data: CaseAssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Update a case assignment (e.g., notes, preferences)."""
    service = CaseAssignmentService(db)
    assignment = await service.get_assignment_for_professional(
        profile.id, family_file_id
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case assignment not found.",
        )

    updated = await service.update_assignment(assignment.id, data)

    return CaseAssignmentResponse(
        id=updated.id,
        professional_id=updated.professional_id,
        firm_id=updated.firm_id,
        family_file_id=updated.family_file_id,
        assignment_role=AssignmentRole(updated.assignment_role),
        representing=updated.representing,
        access_scopes=updated.access_scopes or [],
        can_control_aria=updated.can_control_aria,
        aria_preferences=updated.aria_preferences,
        can_message_client=updated.can_message_client,
        status=updated.status,
        assigned_at=updated.assigned_at,
        completed_at=updated.completed_at,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.post(
    "/cases/{family_file_id}/withdraw",
    response_model=CaseAssignmentResponse,
    summary="Withdraw from case",
)
async def withdraw_from_case(
    family_file_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Withdraw from a case assignment."""
    service = CaseAssignmentService(db)
    assignment = await service.get_assignment_for_professional(
        profile.id, family_file_id
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case assignment not found.",
        )

    updated = await service.withdraw_assignment(assignment.id, reason)

    return CaseAssignmentResponse(
        id=updated.id,
        professional_id=updated.professional_id,
        firm_id=updated.firm_id,
        family_file_id=updated.family_file_id,
        assignment_role=AssignmentRole(updated.assignment_role),
        representing=updated.representing,
        access_scopes=updated.access_scopes or [],
        can_control_aria=updated.can_control_aria,
        aria_preferences=updated.aria_preferences,
        can_message_client=updated.can_message_client,
        status=updated.status,
        assigned_at=updated.assigned_at,
        completed_at=updated.completed_at,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


# =============================================================================
# CASE TIMELINE
# =============================================================================

@router.get(
    "/cases/{family_file_id}/timeline",
    response_model=CaseTimeline,
    summary="Get case timeline",
)
async def get_case_timeline(
    family_file_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    event_types: Optional[list[str]] = Query(None, alias="types"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get chronological timeline of events for a case.

    Event types: message, exchange, agreement, court, intake, payment, professional_message
    """
    # Verify access
    assignment_service = CaseAssignmentService(db)
    if not await assignment_service.can_access_case(profile.id, family_file_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this case.",
        )

    # Log access
    await assignment_service.log_access(
        professional_id=profile.id,
        family_file_id=family_file_id,
        action="view_timeline",
    )

    timeline_service = CaseTimelineService(db)

    return await timeline_service.get_timeline(
        family_file_id=family_file_id,
        professional_id=profile.id,
        start_date=start_date,
        end_date=end_date,
        event_types=event_types,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/cases/{family_file_id}/timeline/summary",
    summary="Get timeline summary",
)
async def get_timeline_summary(
    family_file_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get activity counts for timeline period."""
    # Verify access
    assignment_service = CaseAssignmentService(db)
    if not await assignment_service.can_access_case(profile.id, family_file_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this case.",
        )

    timeline_service = CaseTimelineService(db)
    return await timeline_service.get_timeline_summary(
        family_file_id=family_file_id,
        professional_id=profile.id,
        start_date=start_date,
        end_date=end_date,
    )


# =============================================================================
# COMMUNICATIONS VIEW (Parent-to-Parent Messages)
# =============================================================================

@router.get(
    "/cases/{family_file_id}/communications",
    summary="View parent-to-parent communications",
)
async def get_communications(
    family_file_id: str,
    start_date: Optional[datetime] = Query(None, description="Filter messages after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter messages before this date"),
    sender_id: Optional[str] = Query(None, description="Filter by sender"),
    flagged_only: bool = Query(False, description="Only return ARIA-flagged messages"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    View parent-to-parent communications for a case.

    Requires 'messages' access scope on case assignment.
    Returns paginated list of messages between parents.
    """
    comms_service = CommunicationsService(db)
    try:
        return await comms_service.get_communications(
            family_file_id=family_file_id,
            professional_id=profile.id,
            start_date=start_date,
            end_date=end_date,
            sender_id=sender_id,
            flagged_only=flagged_only,
            limit=limit,
            offset=offset,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/communications/threads",
    summary="Get message threads",
)
async def get_communication_threads(
    family_file_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get message threads for a case.

    Returns thread summaries with last message preview.
    """
    comms_service = CommunicationsService(db)
    try:
        return await comms_service.get_threads(
            family_file_id=family_file_id,
            professional_id=profile.id,
            limit=limit,
            offset=offset,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/communications/stats",
    summary="Get communication statistics",
)
async def get_communication_stats(
    family_file_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get communication statistics for a case.

    Returns message counts, flag rates, and trends over time.
    """
    comms_service = CommunicationsService(db)
    try:
        return await comms_service.get_communication_stats(
            family_file_id=family_file_id,
            professional_id=profile.id,
            days=days,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/communications/{message_id}",
    summary="Get message detail",
)
async def get_communication_detail(
    family_file_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get detailed view of a specific message.

    Includes full content and any ARIA intervention details.
    """
    comms_service = CommunicationsService(db)
    try:
        result = await comms_service.get_message_detail(
            family_file_id=family_file_id,
            professional_id=profile.id,
            message_id=message_id,
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


# =============================================================================
# ARIA CONTROLS
# =============================================================================

@router.get(
    "/cases/{family_file_id}/aria",
    response_model=ARIASettings,
    summary="Get ARIA settings",
)
async def get_aria_settings(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get ARIA settings for a case."""
    # Verify ARIA control permission
    assignment_service = CaseAssignmentService(db)
    if not await assignment_service.can_control_aria(profile.id, family_file_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to control ARIA for this case.",
        )

    aria_service = ARIAControlService(db)
    return await aria_service.get_aria_settings(family_file_id)


@router.patch(
    "/cases/{family_file_id}/aria",
    response_model=ARIASettings,
    summary="Update ARIA settings",
)
async def update_aria_settings(
    family_file_id: str,
    data: ARIASettingsUpdate,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Update ARIA settings for a case."""
    # Verify ARIA control permission
    assignment_service = CaseAssignmentService(db)
    if not await assignment_service.can_control_aria(profile.id, family_file_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to control ARIA for this case.",
        )

    # Log action
    await assignment_service.log_access(
        professional_id=profile.id,
        family_file_id=family_file_id,
        action="control_aria",
        details={"changes": data.model_dump(exclude_unset=True)},
    )

    aria_service = ARIAControlService(db)
    return await aria_service.update_aria_settings(
        family_file_id=family_file_id,
        professional_id=profile.id,
        data=data,
    )


@router.get(
    "/cases/{family_file_id}/aria/interventions",
    response_model=list[ARIAInterventionResponse],
    summary="Get ARIA interventions",
)
async def get_aria_interventions(
    family_file_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get ARIA intervention history for a case."""
    # Verify access
    assignment_service = CaseAssignmentService(db)
    if not await assignment_service.can_access_case(profile.id, family_file_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this case.",
        )

    aria_service = ARIAControlService(db)
    result = await aria_service.get_intervention_history(
        family_file_id=family_file_id,
        professional_id=profile.id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    return [
        ARIAInterventionResponse(
            id=i.get("id"),
            message_id=i.get("id"),  # message_id is the same as id for flagged messages
            intervention_type=i.get("intervention_type"),
            trigger_text=i.get("content_preview"),
            original_text=i.get("content_preview"),
            suggested_text=None,
            action_taken="flagged" if i.get("was_blocked") else "allowed",
            sender_id=i.get("sender_id"),
            sender_role=None,
            created_at=i.get("timestamp"),
        )
        for i in result.get("interventions", [])
    ]


@router.get(
    "/cases/{family_file_id}/aria/metrics",
    response_model=ARIAMetrics,
    summary="Get ARIA metrics",
)
async def get_aria_metrics(
    family_file_id: str,
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get ARIA metrics and good faith scores for a case."""
    # Verify access
    assignment_service = CaseAssignmentService(db)
    if not await assignment_service.can_access_case(profile.id, family_file_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this case.",
        )

    aria_service = ARIAControlService(db)
    return await aria_service.get_aria_metrics(
        family_file_id=family_file_id,
        professional_id=profile.id,
        days=days,
    )


# =============================================================================
# COMPLIANCE
# =============================================================================

@router.get(
    "/cases/{family_file_id}/compliance",
    summary="Get compliance dashboard",
)
async def get_compliance_dashboard(
    family_file_id: str,
    days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get unified compliance dashboard for a case.

    Aggregates exchange, financial, and communication compliance metrics.
    Requires 'compliance' access scope on case assignment.
    """
    compliance_service = ProfessionalComplianceService(db)
    try:
        return await compliance_service.get_compliance_dashboard(
            family_file_id=family_file_id,
            professional_id=profile.id,
            days=days,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/compliance/exchanges",
    summary="Get exchange compliance",
)
async def get_exchange_compliance(
    family_file_id: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get detailed exchange compliance metrics.

    Includes GPS verification, geofence compliance, and on-time rates.
    """
    compliance_service = ProfessionalComplianceService(db)
    try:
        return await compliance_service.get_exchange_compliance(
            family_file_id=family_file_id,
            professional_id=profile.id,
            days=days,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/compliance/financials",
    summary="Get financial compliance",
)
async def get_financial_compliance(
    family_file_id: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get financial compliance metrics (ClearFund payments, obligations).

    Includes payment history and pending expense requests.
    """
    compliance_service = ProfessionalComplianceService(db)
    try:
        return await compliance_service.get_financial_compliance(
            family_file_id=family_file_id,
            professional_id=profile.id,
            days=days,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/compliance/communications",
    summary="Get communication compliance",
)
async def get_communication_compliance(
    family_file_id: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get communication compliance metrics.

    Includes ARIA intervention rates and good faith metrics per parent.
    """
    compliance_service = ProfessionalComplianceService(db)
    try:
        return await compliance_service.get_communication_compliance(
            family_file_id=family_file_id,
            professional_id=profile.id,
            days=days,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


# =============================================================================
# PROFESSIONAL-CLIENT MESSAGING
# =============================================================================

@router.get(
    "/messages",
    summary="Get all messages (global inbox)",
)
async def get_all_messages(
    unread_only: bool = Query(False),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get all professional messages across all cases."""
    service = ProfessionalMessagingService(db)
    return await service.get_all_messages_for_professional(
        profile.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/messages/unread-count",
    summary="Get unread message count",
)
async def get_unread_message_count(
    family_file_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get count of unread messages."""
    service = ProfessionalMessagingService(db)
    count = await service.get_unread_count(profile.id, family_file_id)
    return {"unread_count": count}


@router.get(
    "/cases/{family_file_id}/messages",
    summary="Get case messages",
)
async def get_case_messages(
    family_file_id: str,
    thread_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get messages for a specific case."""
    service = ProfessionalMessagingService(db)

    try:
        return await service.get_messages_for_case(
            professional_id=profile.id,
            family_file_id=family_file_id,
            thread_id=thread_id,
            limit=limit,
            offset=offset,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/messages/threads",
    summary="Get message threads for case",
)
async def get_message_threads(
    family_file_id: str,
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get message threads for a case."""
    service = ProfessionalMessagingService(db)

    try:
        return await service.get_threads_for_case(
            professional_id=profile.id,
            family_file_id=family_file_id,
            limit=limit,
            offset=offset,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/cases/{family_file_id}/messages/stats",
    summary="Get messaging stats",
)
async def get_messaging_stats(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get messaging statistics for a case."""
    service = ProfessionalMessagingService(db)
    return await service.get_messaging_stats(profile.id, family_file_id)


@router.post(
    "/cases/{family_file_id}/messages",
    response_model=ProfessionalMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send message to client",
)
async def send_message_to_client(
    family_file_id: str,
    data: ProfessionalMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Send a message to a client on the case."""
    service = ProfessionalMessagingService(db)

    try:
        message = await service.send_message(
            professional_id=profile.id,
            family_file_id=family_file_id,
            data=data,
            sender_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

    return ProfessionalMessageResponse(
        id=message.id,
        family_file_id=message.family_file_id,
        case_assignment_id=message.case_assignment_id,
        sender_id=message.sender_id,
        sender_type=message.sender_type,
        recipient_id=message.recipient_id,
        subject=message.subject,
        content=message.content,
        thread_id=message.thread_id,
        reply_to_id=message.reply_to_id,
        is_read=message.is_read,
        read_at=message.read_at,
        attachments=message.attachments,
        sent_at=message.sent_at,
        created_at=message.created_at,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
    )


@router.get(
    "/messages/{message_id}",
    response_model=ProfessionalMessageResponse,
    summary="Get message detail",
)
async def get_message_detail(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get details of a specific message."""
    service = ProfessionalMessagingService(db)
    message = await service.get_message(message_id)

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found.",
        )

    # Verify access - must be sender or recipient
    if message.sender_id != current_user.id and message.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this message.",
        )

    return ProfessionalMessageResponse(
        id=message.id,
        family_file_id=message.family_file_id,
        case_assignment_id=message.case_assignment_id,
        sender_id=message.sender_id,
        sender_type=message.sender_type,
        recipient_id=message.recipient_id,
        subject=message.subject,
        content=message.content,
        thread_id=message.thread_id,
        reply_to_id=message.reply_to_id,
        is_read=message.is_read,
        read_at=message.read_at,
        attachments=message.attachments,
        sent_at=message.sent_at,
        created_at=message.created_at,
    )


@router.post(
    "/messages/{message_id}/read",
    response_model=ProfessionalMessageResponse,
    summary="Mark message as read",
)
async def mark_message_read(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Mark a message as read."""
    service = ProfessionalMessagingService(db)
    message = await service.mark_as_read(message_id, current_user.id)

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found.",
        )

    return ProfessionalMessageResponse(
        id=message.id,
        family_file_id=message.family_file_id,
        case_assignment_id=message.case_assignment_id,
        sender_id=message.sender_id,
        sender_type=message.sender_type,
        recipient_id=message.recipient_id,
        subject=message.subject,
        content=message.content,
        thread_id=message.thread_id,
        reply_to_id=message.reply_to_id,
        is_read=message.is_read,
        read_at=message.read_at,
        attachments=message.attachments,
        sent_at=message.sent_at,
        created_at=message.created_at,
    )


@router.post(
    "/messages/threads/{thread_id}/read",
    summary="Mark thread as read",
)
async def mark_thread_read(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Mark all messages in a thread as read."""
    service = ProfessionalMessagingService(db)
    count = await service.mark_thread_as_read(thread_id, current_user.id)
    return {"marked_read": count}


# =============================================================================
# ARIA PRO INTAKE CENTER
# =============================================================================

def _intake_session_to_list_item(session) -> IntakeSessionListItem:
    """Convert an IntakeSession to list item response."""
    # Extract client info from messages (first message usually has context)
    client_name = None
    client_email = None
    if session.messages and len(session.messages) > 0:
        first_msg = session.messages[0]
        if isinstance(first_msg, dict) and first_msg.get("role") == "system":
            content = first_msg.get("content", "")
            # Parse simple format: "Intake session for {name}. Email: {email}."
            import re
            name_match = re.search(r"Intake session for ([^.]+)", content)
            email_match = re.search(r"Email: ([^.]+)", content)
            if name_match:
                client_name = name_match.group(1).strip()
            if email_match:
                client_email = email_match.group(1).strip()

    return IntakeSessionListItem(
        id=session.id,
        session_number=session.session_number,
        client_name=client_name,
        client_email=client_email,
        status=session.status,
        intake_type=session.target_forms[0] if session.target_forms else "custody",
        message_count=session.message_count or len(session.messages or []),
        has_summary=session.aria_summary is not None,
        has_extracted_data=session.extracted_data is not None,
        parent_confirmed=session.parent_confirmed,
        professional_reviewed=session.professional_reviewed,
        clarification_requested=session.clarification_requested,
        firm_id=session.firm_id,
        family_file_id=session.family_file_id,
        case_assignment_id=session.case_assignment_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        started_at=session.started_at,
        completed_at=session.completed_at,
        access_link_expires_at=session.access_link_expires_at,
    )


def _intake_session_to_detail(session) -> IntakeSessionDetail:
    """Convert an IntakeSession to detail response."""
    list_item = _intake_session_to_list_item(session)
    return IntakeSessionDetail(
        **list_item.model_dump(),
        target_forms=session.target_forms or [],
        custom_questions=session.custom_questions,
        access_token=session.access_token,
        intake_link=session.intake_link,
        aria_provider=session.aria_provider,
        aria_summary=session.aria_summary,
        extracted_data=session.extracted_data,
        draft_form_url=session.draft_form_url,
        draft_form_generated_at=session.draft_form_generated_at,
        parent_confirmed_at=session.parent_confirmed_at,
        parent_edits=session.parent_edits,
        professional_reviewed_at=session.professional_reviewed_at,
        professional_notes=session.professional_notes,
        clarification_request=session.clarification_request,
        clarification_response=session.clarification_response,
    )


@router.get(
    "/intake/sessions",
    response_model=IntakeSessionListResponse,
    summary="List intake sessions",
)
async def list_intake_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    firm_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """List intake sessions for the current professional."""
    service = ProfessionalIntakeService(db)
    sessions, total = await service.list_sessions(
        professional_id=profile.id,
        firm_id=firm_id,
        status=status_filter,
        search=search,
        skip=skip,
        limit=limit,
    )

    # Get stats
    stats = await service.get_stats(profile.id, firm_id)

    return IntakeSessionListResponse(
        items=[_intake_session_to_list_item(s) for s in sessions],
        total=total,
        stats=stats,
    )


@router.post(
    "/intake/sessions",
    response_model=IntakeSessionDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create intake session",
)
async def create_intake_session(
    data: IntakeSessionCreate,
    firm_id: Optional[str] = Query(None),
    case_assignment_id: Optional[str] = Query(None),
    family_file_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Create a new intake session and send link to client."""
    service = ProfessionalIntakeService(db)

    session = await service.create_session(
        professional_id=profile.id,
        client_name=data.client_name,
        client_email=data.client_email,
        client_phone=data.client_phone,
        intake_type=data.intake_type,
        notes=data.notes,
        target_forms=data.target_forms,
        custom_questions=data.custom_questions,
        firm_id=firm_id,
        case_assignment_id=case_assignment_id,
        family_file_id=family_file_id,
    )

    # TODO: Send intake link email to client

    return _intake_session_to_detail(session)


@router.get(
    "/intake/sessions/{session_id}",
    response_model=IntakeSessionDetail,
    summary="Get intake session detail",
)
async def get_intake_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get details of a specific intake session."""
    service = ProfessionalIntakeService(db)
    session = await service.get_session(session_id, profile.id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake session not found.",
        )

    return _intake_session_to_detail(session)


@router.get(
    "/intake/sessions/{session_id}/transcript",
    response_model=IntakeTranscriptResponse,
    summary="Get intake transcript",
)
async def get_intake_transcript(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get the conversation transcript for an intake session."""
    service = ProfessionalIntakeService(db)
    session = await service.get_session(session_id, profile.id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake session not found.",
        )

    messages = await service.get_transcript(session_id, profile.id)

    return IntakeTranscriptResponse(
        session_id=session.id,
        session_number=session.session_number,
        messages=[
            {
                "id": m["id"],
                "role": m["role"],
                "content": m["content"],
                "timestamp": m.get("timestamp"),
            }
            for m in (messages or [])
        ],
        total_messages=len(messages or []),
    )


@router.get(
    "/intake/sessions/{session_id}/outputs",
    response_model=IntakeOutputsResponse,
    summary="Get intake outputs",
)
async def get_intake_outputs(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get the AI-generated outputs for an intake session."""
    service = ProfessionalIntakeService(db)
    outputs = await service.get_outputs(session_id, profile.id)

    if outputs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake session not found.",
        )

    return IntakeOutputsResponse(**outputs)


@router.post(
    "/intake/sessions/{session_id}/review",
    response_model=IntakeSessionDetail,
    summary="Mark intake as reviewed",
)
async def mark_intake_reviewed(
    session_id: str,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Mark an intake session as reviewed by the professional."""
    service = ProfessionalIntakeService(db)
    session = await service.mark_reviewed(session_id, profile.id, notes)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake session not found.",
        )

    return _intake_session_to_detail(session)


@router.post(
    "/intake/sessions/{session_id}/clarification",
    response_model=IntakeSessionDetail,
    summary="Request clarification",
)
async def request_intake_clarification(
    session_id: str,
    data: IntakeClarificationRequest,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Request clarification from the client on an intake session."""
    service = ProfessionalIntakeService(db)
    session = await service.request_clarification(
        session_id, profile.id, data.request_text
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake session not found.",
        )

    # TODO: Send notification to client about clarification request

    return _intake_session_to_detail(session)


@router.post(
    "/intake/sessions/{session_id}/cancel",
    response_model=IntakeSessionDetail,
    summary="Cancel intake session",
)
async def cancel_intake_session(
    session_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Cancel an intake session."""
    service = ProfessionalIntakeService(db)
    session = await service.cancel_session(session_id, profile.id, reason)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session not found or cannot be cancelled.",
        )

    return _intake_session_to_detail(session)


@router.post(
    "/intake/sessions/{session_id}/resend-link",
    summary="Resend intake link",
)
async def resend_intake_link(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Resend the intake link to the client."""
    service = ProfessionalIntakeService(db)
    result = await service.resend_link(session_id, profile.id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session not found or cannot resend link.",
        )

    # TODO: Send email with new link

    return result


@router.get(
    "/intake/stats",
    summary="Get intake statistics",
)
async def get_intake_stats(
    firm_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get intake statistics for the professional."""
    service = ProfessionalIntakeService(db)
    return await service.get_stats(profile.id, firm_id)
