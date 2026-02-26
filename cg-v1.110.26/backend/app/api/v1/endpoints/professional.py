"""
Professional Portal API endpoints.

Endpoints for professional profiles, firms, memberships,
case assignments, and related features.
"""

from datetime import datetime
import io
from typing import Optional, List

from fastapi import APIRouter, Body, Depends, HTTPException, status, Query, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.professional import (
    ProfessionalProfile,
    Firm,
    FirmMembership,
    ProfessionalAccessRequest,
    OCRDocument,
    FieldLock,
    FirmRole,
    FirmType,
    MembershipStatus,
    ProfessionalType,
    ProfessionalTier,
    AccessRequestStatus,
    AssignmentRole,
    TemplateType,
    OCRExtractionStatus,
    FirmAuditLog,
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
    FirmResponse,
    FirmPublicResponse,
    FirmDirectoryResponse,
    FirmWithMembers,
    ProfessionalPublicResponse,
    # Membership
    FirmMemberInvite,
    FirmMembershipUpdate,
    FirmMembershipResponse,
    # Access Requests
    AccessRequestCreate,
    AccessRequestResponse,
    InviteProfessionalRequest,
    InvitationCasePreview,
    # Call Logs
    ProfessionalCallLogCreate,
    ProfessionalCallLogResponse,
    ProfessionalCallLogListResponse,
    # Compliance Reports
    ComplianceReportCreate,
    ComplianceReportResponse,
    ComplianceReportListResponse,
    ARIAThreadAnalysis,
)
from app.services.professional.profile_service import ProfessionalProfileService
from app.services.professional.firm_service import FirmService
from app.services.professional.access_service import ProfessionalAccessService
from app.services.professional.assignment_service import CaseAssignmentService
from app.services.professional.dashboard_service import ProfessionalDashboardService
from app.services.professional.timeline_service import CaseTimelineService
from app.services.professional.aria_control_service import ARIAControlService
from app.services.professional.messaging_service import ProfessionalMessagingService
from app.services.professional.intake_service import ProfessionalIntakeService
from app.services.professional.communications_service import CommunicationsService
from app.services.professional.compliance_service import ProfessionalComplianceService
from app.services.professional.case_summary_service import ProfessionalCaseSummaryService
from app.services.professional.call_log_service import ProfessionalCallLogService
from app.services.professional.report_service import ComplianceReportService
from app.services.professional.document_service import ProfessionalDocumentService, DocumentType
from app.services.professional.template_service import FirmTemplateService
from app.services.professional.ocr_service import OCRDocumentService, SUPPORTED_FORM_TYPES, CA_FORM_FIELD_MAPS
from app.services.professional.field_lock_service import FieldLockService
from app.services.professional.firm_audit_service import FirmAuditLogService
from app.services.professional.tier_gate import (
    require_tier,
    enforce_case_limit,
    enforce_team_limit,
    get_tier_features,
)
from app.services.storage import (
    storage_service,
    StorageBucket,
    validate_attachment,
    build_professional_headshot_path,
    build_firm_logo_path,
    build_firm_video_path,
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
    ComplianceReportListResponse,
    ProfessionalDocumentListResponse,
    FirmTemplateCreate,
    FirmTemplateResponse,
    FirmAnalytics,
    FirmAuditLogResponse,
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
        
        # Directory fields
        headline=profile.headline,
        bio=profile.bio,
        video_url=profile.video_url,
        headshot_url=profile.headshot_url,
        languages=profile.languages or [],
        hourly_rate=profile.hourly_rate,
        years_experience=profile.years_experience,
        education=profile.education or [],
        awards=profile.awards or [],
        consultation_fee=profile.consultation_fee,
        accepted_payment_methods=profile.accepted_payment_methods or [],

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
        description=firm.description,
        practice_areas=firm.practice_areas,
        
        # Directory fields
        headline=firm.headline,
        video_url=firm.video_url,
        social_links=firm.social_links or {},
        pricing_structure=firm.pricing_structure,
        safety_vetted=firm.safety_vetted,

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
    "/profile/headshot",
    response_model=ProfessionalProfileResponse,
    summary="Upload professional headshot",
)
async def upload_headshot(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Upload a headshot for the professional profile."""
    content = await file.read()
    
    is_valid, category, error = validate_attachment(file.content_type, len(content))
    if not is_valid or category != "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Invalid image file.",
        )

    path = build_professional_headshot_path(profile.id, file.filename)
    url = await storage_service.upload_file(
        bucket=StorageBucket.PROFESSIONAL_MEDIA,
        path=path,
        file_content=content,
        content_type=file.content_type,
    )

    service = ProfessionalProfileService(db)
    # Using raw string for headshot_url to avoid Pydantic issues if it's partly defined
    updated = await service.update_profile(profile.id, ProfessionalProfileUpdate(headshot_url=url))
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


@router.get(
    "/firms/{firm_id}/analytics",
    response_model=FirmAnalytics,
    summary="Get firm analytics",
)
async def get_firm_analytics(
    firm_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get aggregated analytics for the firm.

    Requires OWNER, ADMIN, or PARTNER role.
    """
    firm_service = FirmService(db)
    
    # Check membership and role
    membership = await firm_service.get_membership(profile.id, firm_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this firm.",
        )
    
    allowed_roles = [FirmRole.OWNER.value, FirmRole.ADMIN.value, FirmRole.PARTNER.value]
    if membership.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view firm analytics.",
        )

    dashboard_service = ProfessionalDashboardService(db)
    return await dashboard_service.get_firm_analytics(firm_id)


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


@router.post(
    "/firms/{firm_id}/logo",
    response_model=FirmResponse,
    summary="Upload firm logo",
)
async def upload_firm_logo(
    firm_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Upload a logo for the firm. Requires owner or admin role."""
    service = FirmService(db)
    if not await service.can_manage_firm(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can upload firm logo.",
        )

    content = await file.read()
    is_valid, category, error = validate_attachment(file.content_type, len(content))
    if not is_valid or category != "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Invalid image file.",
        )

    path = build_firm_logo_path(firm_id, file.filename)
    url = await storage_service.upload_file(
        bucket=StorageBucket.PROFESSIONAL_MEDIA,
        path=path,
        file_content=content,
        content_type=file.content_type,
    )

    firm = await service.update_firm(firm_id, FirmUpdate(logo_url=url))
    member_count = await service.get_firm_member_count(firm_id)
    return _firm_to_response(firm, member_count=member_count)


@router.post(
    "/firms/{firm_id}/video",
    response_model=FirmResponse,
    summary="Upload firm video",
)
async def upload_firm_video(
    firm_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Upload a video and intro for the firm. Requires owner or admin role."""
    service = FirmService(db)
    if not await service.can_manage_firm(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can upload firm video.",
        )

    content = await file.read()
    is_valid, category, error = validate_attachment(file.content_type, len(content))
    if not is_valid or category != "video":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Invalid video file.",
        )

    path = build_firm_video_path(firm_id, file.filename)
    url = await storage_service.upload_file(
        bucket=StorageBucket.PROFESSIONAL_MEDIA,
        path=path,
        file_content=content,
        content_type=file.content_type,
    )

    firm = await service.update_firm(firm_id, FirmUpdate(video_url=url))
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
            accepted_payment_methods=f.get('accepted_payment_methods') or [],
            payment_plans_available=f.get('payment_plans_available', False),
            works_with_nonprofits=f.get('works_with_nonprofits', False),
            service_location=f.get('service_location'),
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

    # Get professional count and list
    firm_service = FirmService(db)
    members = await firm_service.list_firm_members(firm['id'], include_invited=False)
    
    professionals_list = []
    for m in members:
        if m.professional and m.professional.is_active:
            user = m.professional.user if hasattr(m.professional, 'user') else None
            professionals_list.append(
                ProfessionalPublicResponse(
                    id=m.professional.id,
                    user_first_name=user.first_name if user else None,
                    user_last_name=user.last_name if user else None,
                    professional_type=ProfessionalType(m.professional.professional_type),
                    license_verified=m.professional.license_verified,
                    headline=m.professional.headline,
                    bio=m.professional.bio,
                    headshot_url=m.professional.headshot_url,
                    video_url=m.professional.video_url,
                    languages=m.professional.languages or [],
                    hourly_rate=m.professional.hourly_rate,
                    years_experience=m.professional.years_experience,
                    education=m.professional.education or [],
                    awards=m.professional.awards or [],
                    consultation_fee=m.professional.consultation_fee,
                    accepted_payment_methods=m.professional.accepted_payment_methods or [],
                    practice_areas=m.professional.practice_areas or [],
                )
            )

    # Aggregate practice areas from all active professionals
    combined_practice_areas = set(firm.get('practice_areas') or [])
    for p in professionals_list:
        if p.practice_areas:
            combined_practice_areas.update(p.practice_areas)

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
        practice_areas=sorted(list(combined_practice_areas)),
        professional_count=len(professionals_list),
        description=firm['description'],
        headline=firm['headline'],
        video_url=firm['video_url'],
        social_links=firm['social_links'],
        pricing_structure=firm['pricing_structure'],
        safety_vetted=firm['safety_vetted'],
        accepted_payment_methods=firm.get('accepted_payment_methods') or [],
        payment_plans_available=firm.get('payment_plans_available', False),
        works_with_nonprofits=firm.get('works_with_nonprofits', False),
        service_location=firm.get('service_location'),
        professionals=professionals_list,
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
        invitation.professional_accepted = True
        invitation.professional_accepted_at = datetime.utcnow()

        # If it's a representation role (Attorney), we can finalize if the representing parent approved
        # This supports unilateral representation assignment
        if (invitation.requested_role in [AssignmentRole.LEAD_ATTORNEY.value, AssignmentRole.ASSOCIATE.value]) or \
           (invitation.representing in ["parent_a", "parent_b"] and \
            ((invitation.representing == "parent_a" and invitation.parent_a_approved) or \
             (invitation.representing == "parent_b" and invitation.parent_b_approved))):
            
            invitation.status = AccessRequestStatus.APPROVED.value
            invitation.approved_at = datetime.utcnow()
            
            # Create case assignment
            assignment = await access_service.create_assignment_from_request(invitation)
            invitation.case_assignment_id = str(assignment.id)
        else:
            # For neutral roles, we still need both parents if professional-initiated
            # or just wait for the other parent if it's dual-approval required
            if invitation.parent_a_approved and invitation.parent_b_approved:
                invitation.status = AccessRequestStatus.APPROVED.value
                invitation.approved_at = datetime.utcnow()
                assignment = await access_service.create_assignment_from_request(invitation)
                invitation.case_assignment_id = str(assignment.id)

        # Log the event
        audit_service = FirmAuditLogService(db)
        await audit_service.log_event(
            firm_id=firm_id,
            actor_id=profile.id,
            event_type="case_assigned",
            description=f"Assigned case to professional {assigned_professional_id}",
            metadata={
                "invitation_id": invitation_id,
                "assigned_professional_id": assigned_professional_id,
                "case_assignment_id": invitation.case_assignment_id,
                "family_file_id": invitation.family_file_id,
            }
        )

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
    response_model=InvitationCasePreview,
)
async def get_invitation_case_preview(
    firm_id: str,
    invitation_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get detailed case preview for an invitation before accepting.

    Uses ProfessionalCaseSummaryService to aggregate metrics, agreements,
    and child information into a high-fidelity summary.
    """
    # Verify firm membership
    firm_service = FirmService(db)
    membership = await firm_service.get_membership(profile.id, firm_id)
    if not membership or membership.status != MembershipStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an active member of this firm",
        )

    summary_service = ProfessionalCaseSummaryService(db)
    
    # Get invitation to verify it's for this firm and find family_file_id
    access_service = ProfessionalAccessService(db)
    invitation = await access_service.get_request(invitation_id)
    
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

    try:
        preview = await summary_service.get_case_preview(
            family_file_id=invitation.family_file_id,
            access_request_id=invitation_id,
            professional_id=profile.id
        )
        return preview
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        print(f"Error generating case preview: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate case preview"
        )


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
    thread_id: Optional[str] = Query(None, description="Filter by specific thread"),
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
            thread_id=thread_id,
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
    "/cases/{family_file_id}/aria/analysis",
    response_model=ARIAThreadAnalysis,
    summary="Get deep ARIA thread analysis",
)
async def get_aria_thread_analysis(
    family_file_id: str,
    thread_id: Optional[str] = Query(None),
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get a deep AI-driven analysis of a message thread.
    
    Includes narrative summary, tone analysis, communication lags,
    and facts for professional resolution discovery.
    """
    # Verify access
    assignment_service = CaseAssignmentService(db)
    if not await assignment_service.can_access_case(profile.id, family_file_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this case.",
        )

    from app.services.professional.aria_analyzer_service import ARIAAnalyzerService
    analyzer = ARIAAnalyzerService(db)
    
    try:
        return await analyzer.analyze_thread(
            family_file_id=family_file_id,
            thread_id=thread_id,
            days=days,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )


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
    # Read directly from model columns (new sessions)
    client_name = getattr(session, 'client_name', None)
    client_email = getattr(session, 'client_email', None)

    # Fallback: parse from system message for old sessions that pre-date the columns
    if not client_name and session.messages and len(session.messages) > 0:
        first_msg = session.messages[0]
        if isinstance(first_msg, dict) and first_msg.get("role") == "system":
            content = first_msg.get("content", "")
            import re
            name_match = re.search(r"Intake session for ([^.]+)", content)
            email_match = re.search(r"Email: ([^.\s]+)", content)
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
        template_id=getattr(session, 'template_id', None) or "comprehensive-custody",
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
        access_token=session.access_token,
        intake_link=session.intake_link,
        target_forms=session.target_forms or [],
    )



def _intake_session_to_detail(session) -> IntakeSessionDetail:
    """Convert an IntakeSession to detail response."""
    list_item = _intake_session_to_list_item(session)
    return IntakeSessionDetail(
        **list_item.model_dump(),
        client_phone=getattr(session, 'client_phone', None),
        notes=getattr(session, 'client_notes', None),
        custom_questions=session.custom_questions,
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
        limit=limit,
        offset=skip,
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
        template_id=data.template_id,
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
    "/intake/templates",
    summary="List available intake templates",
)
async def list_intake_templates(
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Return all intake templates, marking which are available for this professional's tier."""
    from app.services.intake_templates import get_all_templates
    tier = getattr(profile, 'subscription_tier', 'starter') or 'starter'
    is_paid = tier not in ('starter', '')
    templates = []
    for t in get_all_templates():
        d = t.to_dict()
        d["available"] = t.tier == "free" or (t.tier == "paid" and is_paid)
        templates.append(d)
    return {"templates": templates, "professional_tier": tier}


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

    return IntakeOutputsResponse(session_id=session_id, **outputs)


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
    "/intake/sessions/{session_id}/refresh-summary",
    response_model=IntakeOutputsResponse,
    summary="Regenerate AI summary",
)
async def refresh_intake_summary(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Regenerate the AI summary for an intake session.

    This re-runs ARIA's summary generation with the latest structured
    format, populating Current Situation, Client Goals, Key Concerns,
    and Recommended Next Steps even for sessions that were originally
    summarized with the old plain-text generator.
    """
    service = ProfessionalIntakeService(db)
    session = await service.get_session(session_id, profile.id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake session not found.",
        )

    if not session.messages or len(session.messages) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough messages to generate a summary.",
        )

    # Re-generate the summary with structured output
    from app.services.aria_paralegal import AriaParalegalService
    aria = AriaParalegalService(db)
    await aria.generate_summary(session)

    # Return the refreshed outputs
    outputs = await service.get_outputs(session_id, profile.id)
    return IntakeOutputsResponse(session_id=session_id, **(outputs or {}))



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
    return await ProfessionalIntakeService(db).get_stats(profile.id, firm_id)


# =============================================================================
# CALL LOGS
# =============================================================================

@router.post(
    "/cases/{family_file_id}/calls",
    response_model=ProfessionalCallLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_call(
    family_file_id: str,
    data: ProfessionalCallLogCreate,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Log a voice/video call for a case.
    """
    # Ensure professional has access to the case
    await CaseAssignmentService(db).get_assignment(profile.id, family_file_id)
    
    # Force the family_file_id to match the path
    data.family_file_id = family_file_id
    
    return await ProfessionalCallLogService(db).log_call(profile.id, data)


@router.get(
    "/cases/{family_file_id}/calls",
    response_model=ProfessionalCallLogListResponse,
)
async def list_case_calls(
    family_file_id: str,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    List all recorded calls for a specific case.
    """
    # Ensure professional has access to the case
    await CaseAssignmentService(db).get_assignment(profile.id, family_file_id)
    
    logs, total = await ProfessionalCallLogService(db).get_call_logs(
        professional_id=profile.id,
        family_file_id=family_file_id,
        limit=limit,
        offset=offset
    )
    return ProfessionalCallLogListResponse(logs=logs, total=total)


# =============================================================================
# COMPLIANCE REPORTS
# =============================================================================

@router.post(
    "/cases/{family_file_id}/reports",
    response_model=ComplianceReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_compliance_report(
    family_file_id: str,
    data: ComplianceReportCreate,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Trigger generation of a compliance report.
    Initially creates a pending report record.
    """
    # Ensure professional has access to the case
    await CaseAssignmentService(db).get_assignment(profile.id, family_file_id)
    
    # Force the family_file_id to match the path
    data.family_file_id = family_file_id
    
    return await ComplianceReportService(db).create_report(profile.id, data)


@router.get(
    "/cases/{family_file_id}/reports",
    response_model=ComplianceReportListResponse,
)
async def list_case_reports(
    family_file_id: str,
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    List all generated reports for a specific case.
    """
    # Ensure professional has access to the case
    await CaseAssignmentService(db).get_assignment(profile.id, family_file_id)
    
    reports, total = await ComplianceReportService(db).get_reports(
        professional_id=profile.id,
        family_file_id=family_file_id,
        limit=limit,
        offset=offset
    )
    return ComplianceReportListResponse(reports=reports, total=total)


# =============================================================================
# DOCUMENTS
# =============================================================================

@router.get(
    "/documents",
    response_model=ProfessionalDocumentListResponse,
    summary="List professional documents",
)
async def list_professional_documents(
    family_file_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    List documents across all assigned cases or for a specific case.
    """
    service = ProfessionalDocumentService(db)
    items, total = await service.list_documents(
        professional_id=profile.id,
        family_file_id=family_file_id,
        doc_type=doc_type,
        search=search,
        skip=skip,
        limit=limit,
    )
    return ProfessionalDocumentListResponse(items=items, total=total)


# =============================================================================
# TEMPLATES
# =============================================================================

@router.get(
    "/templates",
    response_model=List[FirmTemplateResponse],
    summary="List firm templates",
)
async def list_firm_templates(
    firm_id: Optional[str] = Query(None),
    template_type: Optional[TemplateType] = Query(None),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    List templates for the professional's firm.
    If no firm_id is provided, use the first firm the professional belongs to.
    """
    # Get firm_id if not provided
    target_firm_id = firm_id
    if not target_firm_id:
        if profile.firm_memberships:
            target_firm_id = profile.firm_memberships[0].firm_id
        else:
            raise HTTPException(status_code=400, detail="Professional does not belong to any firm")

    service = FirmTemplateService(db)
    return await service.list_templates(firm_id=target_firm_id, template_type=template_type)


@router.post(
    "/templates",
    response_model=FirmTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create firm template",
)
async def create_firm_template(
    data: FirmTemplateCreate,
    firm_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Create a new template for a firm."""
    service = FirmTemplateService(db)
    return await service.create_template(
        firm_id=firm_id,
        user_id=profile.user_id,
        name=data.name,
        template_type=data.template_type,
        content=data.content,
        description=data.description
    )


@router.get(
    "/templates/{template_id}/preview",
    summary="Preview template with variable injection",
)
async def preview_template(
    template_id: str,
    family_file_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Preview a template by injecting variables from a specific case.
    """
    service = FirmTemplateService(db)
    try:
        processed_content = await service.inject_variables(
            template_id=template_id,
            family_file_id=family_file_id
        )
        return processed_content
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# TIER FEATURES & GATING
# =============================================================================

@router.get(
    "/tier/features",
    summary="Get tier feature availability",
)
async def get_my_tier_features(
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get feature availability for the current professional's tier.

    Returns a map of features and whether they're enabled for this tier.
    Frontend uses this to show/hide UI elements.
    """
    tier = ProfessionalTier(profile.subscription_tier)
    return get_tier_features(tier)


@router.get(
    "/tier/usage",
    summary="Get tier usage summary",
)
async def get_tier_usage(
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get current usage vs tier limits."""
    tier = ProfessionalTier(profile.subscription_tier)
    features = get_tier_features(tier)
    return {
        "tier": tier.value,
        "cases": {
            "active": profile.active_case_count,
            "max": features["max_cases"],
            "remaining": max(0, features["max_cases"] - profile.active_case_count),
        },
        "team_members": {
            "max": features["max_team_members"],
        },
        "subscription_status": profile.subscription_status,
        "subscription_ends_at": (
            profile.subscription_ends_at.isoformat()
            if profile.subscription_ends_at else None
        ),
        "features": features["features"],
    }


# =============================================================================
# OCR DOCUMENT PROCESSING
# =============================================================================

@router.get(
    "/ocr/config",
    summary="Get OCR configuration (field maps)",
)
async def get_ocr_config(
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Return the field configuration for supported court forms.
    Used by the frontend to render field locking UI and tooltips.
    """
    return {
        "supported_forms": SUPPORTED_FORM_TYPES,
        "field_maps": CA_FORM_FIELD_MAPS,
    }


@router.get(
    "/firms/{firm_id}/audit-log",
    response_model=list[FirmAuditLogResponse],
    summary="Get firm audit log",
)
async def get_firm_audit_log(
    firm_id: str,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get audit log for a firm.
    
    Requires firm membership.
    """
    firm_service = FirmService(db)
    if not await firm_service.is_firm_member(profile.id, firm_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this firm",
        )

    service = FirmAuditLogService(db)
    logs = await service.get_firm_audit_log(firm_id, limit, offset)
    
    # Manually map to response to handle relationships safely
    response = []
    for log in logs:
        actor_name = None
        actor_email = None
        if log.actor:
            if hasattr(log.actor, 'user') and log.actor.user:
                actor_name = f"{log.actor.user.first_name} {log.actor.user.last_name}"
                actor_email = log.actor.user.email
            else:
                actor_email = log.actor.professional_email

        response.append(
            FirmAuditLogResponse(
                id=log.id,
                firm_id=log.firm_id,
                actor_id=log.actor_id,
                event_type=log.event_type,
                description=log.description,
                event_metadata=log.event_metadata,
                created_at=log.created_at,
                actor_name=actor_name,
                actor_email=actor_email,
            )
        )

    return response


@router.post(
    "/ocr/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload document for OCR",
)
async def upload_ocr_document(
    family_file_id: str = Body(...),
    file_url: str = Body(...),
    original_filename: str = Body(...),
    file_size_bytes: Optional[int] = Body(None),
    mime_type: str = Body("application/pdf"),
    case_assignment_id: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Upload a court order document for OCR processing.

    Requires Solo tier or higher. Creates the OCR document record
    and queues it for processing.
    """
    # Tier gate: Solo+
    await require_tier(ProfessionalTier.SOLO)(profile)

    service = OCRDocumentService(db)
    doc = await service.upload_document(
        professional_id=profile.id,
        family_file_id=family_file_id,
        case_assignment_id=case_assignment_id,
        file_url=file_url,
        original_filename=original_filename,
        file_size_bytes=file_size_bytes,
        mime_type=mime_type,
    )
    await db.commit()

    return {
        "id": doc.id,
        "extraction_status": doc.extraction_status,
        "filename": doc.original_filename,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "supported_form_types": SUPPORTED_FORM_TYPES,
    }


@router.get(
    "/ocr/documents",
    summary="List OCR documents",
)
async def list_ocr_documents(
    family_file_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """List OCR documents. Optionally filter by case or status."""
    service = OCRDocumentService(db)

    if family_file_id:
        docs = await service.list_documents_for_case(
            family_file_id, status_filter
        )
    else:
        docs = await service.list_documents_for_professional(
            profile.id, status_filter, limit, offset
        )

    return {
        "items": [
            {
                "id": d.id,
                "family_file_id": d.family_file_id,
                "original_filename": d.original_filename,
                "detected_form_type": d.detected_form_type,
                "extraction_status": d.extraction_status,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ],
        "total": len(docs),
    }


@router.get(
    "/ocr/documents/{document_id}",
    summary="Get OCR document detail",
)
async def get_ocr_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get full details of an OCR document including extraction data."""
    service = OCRDocumentService(db)
    doc = await service.get_document(document_id)

    if not doc:
        raise HTTPException(status_code=404, detail="OCR document not found")

    return {
        "id": doc.id,
        "family_file_id": doc.family_file_id,
        "case_assignment_id": doc.case_assignment_id,
        "file_url": doc.file_url,
        "original_filename": doc.original_filename,
        "file_size_bytes": doc.file_size_bytes,
        "mime_type": doc.mime_type,
        "detected_form_type": doc.detected_form_type,
        "detection_confidence": doc.detection_confidence,
        "extraction_status": doc.extraction_status,
        "extracted_data": doc.extracted_data,
        "confidence_scores": doc.confidence_scores,
        "low_confidence_fields": doc.low_confidence_fields,
        "professional_corrections": doc.professional_corrections,
        "processing_started_at": (
            doc.processing_started_at.isoformat()
            if doc.processing_started_at else None
        ),
        "processing_completed_at": (
            doc.processing_completed_at.isoformat()
            if doc.processing_completed_at else None
        ),
        "processing_error": doc.processing_error,
        "approved_at": doc.approved_at.isoformat() if doc.approved_at else None,
        "rejected_at": doc.rejected_at.isoformat() if doc.rejected_at else None,
        "rejection_reason": doc.rejection_reason,
        "created_agreement_id": doc.created_agreement_id,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.get(
    "/ocr/documents/{document_id}/review",
    summary="Get extraction for review",
)
async def get_ocr_review(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Get extraction data formatted for professional review."""
    service = OCRDocumentService(db)
    try:
        return await service.get_extraction_review(document_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/ocr/documents/{document_id}/corrections",
    summary="Submit extraction corrections",
)
async def submit_ocr_corrections(
    document_id: str,
    corrections: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Submit professional corrections to extracted data."""
    service = OCRDocumentService(db)
    try:
        doc = await service.submit_corrections(
            document_id, corrections, profile.id
        )
        await db.commit()
        return {"status": "corrections_saved", "document_id": doc.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/ocr/documents/{document_id}/approve",
    summary="Approve OCR extraction",
)
async def approve_ocr_extraction(
    document_id: str,
    case_number: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Approve OCR extraction and create field locks.

    Per spec: OCR creates NEW agreements. Populated fields are locked
    from parent editing. Displays 🔒 Locked by Case-[number].
    """
    ocr_service = OCRDocumentService(db)
    lock_service = FieldLockService(db)

    try:
        # 1. Approve extraction
        doc = await ocr_service.approve_extraction(document_id, profile.id)

        # 2. Create field locks for all populated fields
        locks = []
        if doc.extracted_data and doc.created_agreement_id:
            locks = await lock_service.create_locks_from_ocr(
                ocr_document_id=doc.id,
                family_file_id=doc.family_file_id,
                agreement_id=doc.created_agreement_id,
                professional_id=profile.id,
                case_number=case_number,
                extracted_data=doc.extracted_data,
            )

        await db.commit()

        return {
            "status": "approved",
            "document_id": doc.id,
            "agreement_id": doc.created_agreement_id,
            "locked_fields": len(locks),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/ocr/documents/{document_id}/reject",
    summary="Reject OCR extraction",
)
async def reject_ocr_extraction(
    document_id: str,
    reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Reject an OCR extraction with a reason."""
    service = OCRDocumentService(db)
    try:
        doc = await service.reject_extraction(document_id, profile.id, reason)
        await db.commit()
        return {"status": "rejected", "document_id": doc.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# FIELD LOCKS
# =============================================================================

@router.get(
    "/cases/{family_file_id}/locks",
    summary="Get field locks for case",
)
async def get_case_field_locks(
    family_file_id: str,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """List all field locks for a case."""
    service = FieldLockService(db)
    locks = await service.get_locks_for_case(family_file_id, active_only)

    return {
        "items": [
            {
                "id": lock.id,
                "field_path": lock.field_path,
                "case_number": lock.case_number,
                "display": f"🔒 Locked by Case-{lock.case_number}",
                "is_locked": lock.is_locked,
                "locked_at": lock.locked_at.isoformat() if lock.locked_at else None,
                "agreement_id": lock.agreement_id,
                "unlocked_at": lock.unlocked_at.isoformat() if lock.unlocked_at else None,
                "unlock_reason": lock.unlock_reason,
            }
            for lock in locks
        ],
        "total": len(locks),
    }


@router.get(
    "/agreements/{agreement_id}/locks",
    summary="Get locked fields for agreement",
)
async def get_agreement_locked_fields(
    agreement_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Get all locked field paths for an agreement.

    Returns a list of field paths that cannot be edited by parents.
    Frontend uses this to render lock icons on form fields.
    """
    service = FieldLockService(db)
    paths = await service.get_locked_field_paths(agreement_id)
    return {
        "agreement_id": agreement_id,
        "locked_fields": paths,
        "total": len(paths),
    }


@router.post(
    "/locks/{lock_id}/unlock",
    summary="Unlock a field",
)
async def unlock_field(
    lock_id: str,
    reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Unlock a court-order locked field.

    Requires a reason for audit trail. Only the professional
    with case access can unlock fields.
    """
    service = FieldLockService(db)
    try:
        lock = await service.unlock_field(lock_id, profile.id, reason)
        await db.commit()
        return {
            "status": "unlocked",
            "field_path": lock.field_path,
            "unlock_reason": reason,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/agreements/{agreement_id}/unlock-all",
    summary="Unlock all fields for agreement",
)
async def unlock_all_fields(
    agreement_id: str,
    reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Unlock ALL locked fields for an agreement.

    Used when a new court order supersedes the previous one.
    Requires a reason for the audit trail.
    """
    service = FieldLockService(db)
    count = await service.bulk_unlock(agreement_id, profile.id, reason)
    await db.commit()
    return {
        "status": "all_unlocked",
        "agreement_id": agreement_id,
        "unlocked_count": count,
    }


# =============================================================================
# PROFESSIONAL DIRECTORY SEARCH
# =============================================================================

@router.get(
    "/directory/professionals",
    summary="Search professional directory",
)
async def search_professional_directory(
    query: Optional[str] = Query(None, description="Search name, headline, bio"),
    state: Optional[str] = Query(None, max_length=2, description="License state"),
    practice_area: Optional[str] = Query(None, description="Practice area filter"),
    language: Optional[str] = Query(None, description="Language filter"),
    professional_type: Optional[str] = Query(None, description="Type filter"),
    featured_only: bool = Query(False),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Search public professional profiles in the directory.

    Does not require authentication. Complements the existing
    firm directory search endpoint.
    """
    from sqlalchemy import select, or_, func

    q = select(ProfessionalProfile).where(
        ProfessionalProfile.is_public == True,
        ProfessionalProfile.is_active == True,
        ProfessionalProfile.license_verified == True,
    )

    if query:
        search = f"%{query}%"
        q = q.where(
            or_(
                ProfessionalProfile.headline.ilike(search),
                ProfessionalProfile.bio.ilike(search),
            )
        )

    if state:
        q = q.where(ProfessionalProfile.license_state == state.upper())

    if professional_type:
        q = q.where(ProfessionalProfile.professional_type == professional_type)

    if featured_only:
        q = q.where(ProfessionalProfile.is_featured == True)

    # Order: featured first, then by creation date
    q = q.order_by(
        ProfessionalProfile.is_featured.desc(),
        ProfessionalProfile.created_at.desc(),
    ).offset(skip).limit(limit)

    result = await db.execute(q)
    profiles = result.scalars().all()

    return {
        "items": [
            {
                "id": p.id,
                "professional_type": p.professional_type,
                "headline": p.headline,
                "bio": p.bio[:200] + "..." if p.bio and len(p.bio) > 200 else p.bio,
                "license_state": p.license_state,
                "license_verified": p.license_verified,
                "practice_areas": p.practice_areas,
                "languages": p.languages,
                "hourly_rate": p.hourly_rate,
                "years_experience": p.years_experience,
                "consultation_fee": p.consultation_fee,
                "is_featured": p.is_featured,
                "office_address": p.office_address,
                "jurisdictions": p.jurisdictions,
            }
            for p in profiles
        ],
        "total": len(profiles),
    }


# =============================================================================
# REPORT DOWNLOAD TRACKING
# =============================================================================

@router.post(
    "/reports/{report_id}/download",
    summary="Track report download",
)
async def track_report_download(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """Increment download count for a compliance report."""
    service = ComplianceReportService(db)
    report = await service.track_download(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.commit()
    return {
        "report_id": report.id,
        "download_count": report.download_count,
        "sha256_hash": report.sha256_hash,
    }


@router.get(
    "/reports/{report_id}/verify",
    summary="Verify report integrity",
)
async def verify_report_integrity(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Verify a report's SHA-256 hash for tamper-proof verification.

    Returns the hash and metadata for court submission.
    """
    service = ComplianceReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "report_id": report.id,
        "title": report.title,
        "sha256_hash": report.sha256_hash,
        "export_format": report.export_format,
        "signature_line": report.signature_line,
        "generated_at": report.created_at.isoformat() if report.created_at else None,
        "download_count": report.download_count,
        "status": report.status,
    }


@router.get(
    "/reports/{report_id}/download",
    summary="Download compliance report",
)
async def download_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    profile: ProfessionalProfile = Depends(get_current_professional),
):
    """
    Generate and download the report file (PDF or Excel).
    """
    service = ComplianceReportService(db)
    report = await service.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Re-generate data just in time (or fetch from blob storage if we had it)
    # For MVP we generate on the fly
    data = await service.get_report_data(
        family_file_id=report.family_file_id,
        start_date=report.date_range_start,
        end_date=report.date_range_end
    )

    if report.export_format == "excel":
        file_bytes, sha = await service.generate_excel_bytes(report, data)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"Compliance_Report_{report.family_file_id}.csv" 
    else:
        file_bytes, sha = await service.generate_pdf_bytes(report, data)
        media_type = "application/pdf"
        filename = f"Compliance_Report_{report.family_file_id}.pdf"

    # Update hash/status if needed
    await service.track_download(report_id)
    await db.commit()

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

