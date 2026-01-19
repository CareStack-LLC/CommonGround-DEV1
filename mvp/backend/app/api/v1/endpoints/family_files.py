"""
Family File management endpoints.

Family Files are the root container for family data in CommonGround,
housing parents, children, agreements (SharedCare and QuickAccord),
and optionally a Court Custody Case.
"""

from typing import List
from fastapi import APIRouter, Depends, Body, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.family_file import (
    FamilyFileCreate,
    FamilyFileUpdate,
    FamilyFileResponse,
    FamilyFileDetail,
    FamilyFileList,
    InviteParentB,
    AcceptInvitation,
    ChildBasic,
    ChildResponse,
    ParentInfo,
    CourtCustodyCaseCreate,
    CourtCustodyCaseResponse,
)
from app.schemas.agreement import AgreementCreateForFamilyFile
from app.schemas.professional import (
    InviteProfessionalRequest,
    AccessRequestResponse,
    CaseAssignmentResponse,
    FirmPublicResponse,
)
from app.services.family_file import FamilyFileService
from app.services.agreement import AgreementService
from app.services.professional import ProfessionalAccessService, FirmService
from app.models.professional import (
    CaseAssignment,
    ProfessionalAccessRequest,
    Firm,
    ProfessionalProfile,
    AssignmentStatus,
    AccessRequestStatus,
)

router = APIRouter()


def _build_family_file_response(family_file) -> dict:
    """Build a FamilyFileResponse dict from a FamilyFile model.

    Note: We use status == "court_linked" instead of the has_court_case property
    to avoid lazy loading the court_custody_case relationship in async context.
    """
    # Derive has_court_case from status to avoid lazy loading
    has_court_case = family_file.status == "court_linked"

    return {
        "id": family_file.id,
        "family_file_number": family_file.family_file_number,
        "title": family_file.title,
        "status": family_file.status,
        "conflict_level": family_file.conflict_level,
        "state": family_file.state,
        "county": family_file.county,
        "aria_enabled": family_file.aria_enabled,
        "aria_provider": family_file.aria_provider,
        "require_joint_approval": family_file.require_joint_approval,
        "created_at": family_file.created_at,
        "updated_at": family_file.updated_at,
        "parent_a_id": family_file.parent_a_id,
        "parent_a_role": family_file.parent_a_role,
        "parent_b_id": family_file.parent_b_id,
        "parent_b_role": family_file.parent_b_role,
        "parent_b_email": family_file.parent_b_email,
        "parent_b_invited_at": family_file.parent_b_invited_at,
        "parent_b_joined_at": family_file.parent_b_joined_at,
        "is_complete": family_file.is_complete,
        "has_court_case": has_court_case,
        "can_create_shared_care_agreement": not has_court_case,
    }


def _build_child_response(child) -> dict:
    """Build a ChildResponse dict from a Child model."""
    return {
        "id": child.id,
        "first_name": child.first_name,
        "last_name": child.last_name,
        "date_of_birth": str(child.date_of_birth),
        "middle_name": child.middle_name,
        "preferred_name": child.preferred_name,
        "gender": child.gender,
        "photo_url": child.photo_url,
        "status": child.status,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_family_file(
    data: FamilyFileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new Family File.

    A single parent can create a Family File. The other parent can be
    invited immediately or later.

    Args:
        data: Family File creation data including:
            - title: Display name for the family file
            - parent_a_role: Role of creating parent (mother/father/parent_a/parent_b)
            - parent_b_email: Optional email to invite the other parent
            - children: Optional list of children to add

    Returns:
        Created Family File with ID and invitation status
    """
    service = FamilyFileService(db)
    family_file = await service.create_family_file(data, current_user)

    response = _build_family_file_response(family_file)
    response["message"] = "Family File created successfully"
    if data.parent_b_email:
        response["message"] += ". Invitation sent to other parent."

    return response


@router.get("/", response_model=FamilyFileList)
async def list_family_files(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all Family Files for the current user.

    Returns Family Files where the user is Parent A or Parent B.

    Returns:
        List of Family Files with summary information
    """
    service = FamilyFileService(db)
    family_files = await service.get_user_family_files(current_user)

    return {
        "items": [_build_family_file_response(ff) for ff in family_files],
        "total": len(family_files)
    }


@router.get("/invitations")
async def get_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get pending Family File invitations for the current user.

    Returns Family Files where the user's email matches parent_b_email
    but they haven't joined yet.

    Returns:
        List of pending invitations
    """
    service = FamilyFileService(db)
    invitations = await service.get_pending_invitations(current_user)

    return {
        "items": [
            {
                "id": ff.id,
                "family_file_number": ff.family_file_number,
                "title": ff.title,
                "parent_a_role": ff.parent_a_role,
                "your_role": ff.parent_b_role,
                "invited_at": ff.parent_b_invited_at,
            }
            for ff in invitations
        ],
        "total": len(invitations)
    }


@router.get("/{family_file_id}", response_model=FamilyFileDetail)
async def get_family_file(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed Family File information.

    Returns full Family File details including:
    - Basic info (title, status, settings)
    - Both parents' info
    - All children
    - Agreement counts
    - Court case status

    Args:
        family_file_id: ID of the Family File

    Returns:
        Detailed Family File information
    """
    service = FamilyFileService(db)
    family_file = await service.get_family_file(family_file_id, current_user)

    response = _build_family_file_response(family_file)

    # Combine children from family file and linked cases
    all_children = list(family_file.children)
    seen_child_ids = {c.id for c in all_children}
    for case in family_file.cases:
        for child in case.children:
            if child.id not in seen_child_ids:
                all_children.append(child)
                seen_child_ids.add(child.id)

    response["children"] = [_build_child_response(c) for c in all_children]

    # Count agreements from both family file and linked cases
    all_agreements = list(family_file.agreements)
    for case in family_file.cases:
        # Avoid double-counting if agreement has both case_id and family_file_id
        case_agreement_ids = {a.id for a in case.agreements if a.family_file_id != family_file.id}
        for agreement in case.agreements:
            if agreement.id in case_agreement_ids:
                all_agreements.append(agreement)

    response["active_agreement_count"] = len([
        a for a in all_agreements if a.status == "active"
    ])
    response["quick_accord_count"] = len(family_file.quick_accords)

    # Include linked case info
    if family_file.cases:
        response["linked_case"] = {
            "id": family_file.cases[0].id,
            "case_name": family_file.cases[0].case_name,
            "case_number": family_file.cases[0].case_number,
        }

    return response


@router.put("/{family_file_id}", response_model=FamilyFileResponse)
async def update_family_file(
    family_file_id: str,
    data: FamilyFileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update Family File details.

    Allows updating:
    - title
    - state/county (jurisdiction)
    - ARIA settings

    Args:
        family_file_id: ID of the Family File
        data: Fields to update

    Returns:
        Updated Family File
    """
    service = FamilyFileService(db)
    family_file = await service.update_family_file(family_file_id, data, current_user)

    return _build_family_file_response(family_file)


@router.post("/{family_file_id}/invite")
async def invite_parent_b(
    family_file_id: str,
    data: InviteParentB,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite Parent B to join a Family File.

    Only the initiating parent (Parent A) can send invitations.
    Sends an email invitation to the specified address.

    Args:
        family_file_id: ID of the Family File
        data: Invitation details (email and role)

    Returns:
        Updated Family File with invitation status
    """
    service = FamilyFileService(db)
    family_file = await service.invite_parent_b(family_file_id, data, current_user)

    response = _build_family_file_response(family_file)
    response["message"] = f"Invitation sent to {data.email}"

    return response


@router.post("/{family_file_id}/accept")
async def accept_invitation(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept an invitation to join a Family File.

    The user's email must match the invited parent_b_email.

    Args:
        family_file_id: ID of the Family File

    Returns:
        Updated Family File confirming membership
    """
    service = FamilyFileService(db)
    family_file = await service.accept_invitation(family_file_id, current_user)

    response = _build_family_file_response(family_file)
    response["message"] = "Successfully joined the Family File!"

    return response


@router.post("/{family_file_id}/children")
async def add_child(
    family_file_id: str,
    child_data: ChildBasic,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a child to a Family File.

    Child profiles require dual-parent approval:
    1. Creating parent adds child → status = pending_approval
    2. Other parent approves → status = active

    Args:
        family_file_id: ID of the Family File
        child_data: Child information

    Returns:
        Created child profile
    """
    service = FamilyFileService(db)
    child = await service.add_child(family_file_id, child_data, current_user)

    response = _build_child_response(child)
    response["message"] = "Child added. Pending approval from other parent."

    return response


@router.get("/{family_file_id}/children")
async def get_children(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all children in a Family File.

    Args:
        family_file_id: ID of the Family File

    Returns:
        List of children
    """
    service = FamilyFileService(db)
    family_file = await service.get_family_file(family_file_id, current_user)

    return {
        "items": [_build_child_response(c) for c in family_file.children],
        "total": len(family_file.children)
    }


@router.post("/{family_file_id}/court-case", status_code=status.HTTP_201_CREATED)
async def create_court_custody_case(
    family_file_id: str,
    data: CourtCustodyCaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Link a Court Custody Case to a Family File.

    When a Court Custody Case exists:
    - Parents can only create QuickAccords (not new SharedCare Agreements)
    - Existing agreements become reference-only
    - Court-mandated settings may be enforced

    Args:
        family_file_id: ID of the Family File
        data: Court case information (case number, jurisdiction, etc.)

    Returns:
        Created Court Custody Case
    """
    service = FamilyFileService(db)
    court_case = await service.create_court_custody_case(family_file_id, data, current_user)

    return {
        "id": court_case.id,
        "family_file_id": court_case.family_file_id,
        "case_number": court_case.case_number,
        "case_type": court_case.case_type,
        "jurisdiction_state": court_case.jurisdiction_state,
        "jurisdiction_county": court_case.jurisdiction_county,
        "court_name": court_case.court_name,
        "petitioner_id": court_case.petitioner_id,
        "filing_date": court_case.filing_date,
        "status": court_case.status,
        "created_at": court_case.created_at,
        "message": "Court Custody Case linked. SharedCare Agreement creation is now restricted."
    }


@router.get("/{family_file_id}/court-case")
async def get_court_custody_case(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the Court Custody Case linked to a Family File.

    Args:
        family_file_id: ID of the Family File

    Returns:
        Court Custody Case details or 404 if none exists
    """
    service = FamilyFileService(db)
    family_file = await service.get_family_file(family_file_id, current_user)

    if not family_file.court_custody_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Court Custody Case linked to this Family File"
        )

    cc = family_file.court_custody_case
    return {
        "id": cc.id,
        "family_file_id": cc.family_file_id,
        "case_number": cc.case_number,
        "case_type": cc.case_type,
        "jurisdiction_state": cc.jurisdiction_state,
        "jurisdiction_county": cc.jurisdiction_county,
        "court_name": cc.court_name,
        "petitioner_id": cc.petitioner_id,
        "respondent_id": cc.respondent_id,
        "filing_date": cc.filing_date,
        "last_court_date": cc.last_court_date,
        "next_court_date": cc.next_court_date,
        "status": cc.status,
        "gps_checkin_required": cc.gps_checkin_required,
        "supervised_exchange_required": cc.supervised_exchange_required,
        "aria_enforcement_locked": cc.aria_enforcement_locked,
        "created_at": cc.created_at,
    }


@router.get("/{family_file_id}/aria-settings")
async def get_aria_settings(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ARIA settings for a Family File.

    Returns:
        ARIA configuration including enabled status and provider
    """
    service = FamilyFileService(db)
    family_file = await service.get_family_file(family_file_id, current_user)

    # Check if court case locks ARIA settings
    aria_locked = False
    if family_file.court_custody_case and family_file.court_custody_case.aria_enforcement_locked:
        aria_locked = True

    return {
        "aria_enabled": family_file.aria_enabled,
        "aria_provider": family_file.aria_provider,
        "aria_disabled_at": family_file.aria_disabled_at,
        "aria_disabled_by": family_file.aria_disabled_by,
        "aria_locked_by_court": aria_locked,
    }


@router.patch("/{family_file_id}/aria-settings")
async def update_aria_settings(
    family_file_id: str,
    aria_enabled: bool = Body(..., embed=True),
    aria_provider: str = Body(default="claude", embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update ARIA settings for a Family File.

    Cannot update if court case has locked ARIA enforcement.

    Args:
        family_file_id: ID of the Family File
        aria_enabled: Whether to enable ARIA
        aria_provider: AI provider (claude, openai, regex)

    Returns:
        Updated ARIA settings
    """
    from app.schemas.family_file import FamilyFileUpdate

    service = FamilyFileService(db)
    family_file = await service.get_family_file(family_file_id, current_user)

    # Check if court case locks ARIA settings
    if family_file.court_custody_case and family_file.court_custody_case.aria_enforcement_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ARIA settings are locked by court order"
        )

    # Update settings
    update_data = FamilyFileUpdate(
        aria_enabled=aria_enabled,
        aria_provider=aria_provider
    )
    family_file = await service.update_family_file(family_file_id, update_data, current_user)

    return {
        "aria_enabled": family_file.aria_enabled,
        "aria_provider": family_file.aria_provider,
        "aria_disabled_at": family_file.aria_disabled_at,
        "aria_disabled_by": family_file.aria_disabled_by,
        "message": f"ARIA settings updated. ARIA is now {'enabled' if aria_enabled else 'disabled'}."
    }


# ============================================================
# SharedCare Agreement Endpoints
# ============================================================


@router.post("/{family_file_id}/agreements", status_code=status.HTTP_201_CREATED)
async def create_agreement_for_family_file(
    family_file_id: str,
    data: AgreementCreateForFamilyFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new SharedCare Agreement for a Family File.

    SharedCare Agreements are formal 18-section custody agreements.
    Cannot create if Family File has an active Court Custody Case.

    Args:
        family_file_id: ID of the Family File
        data: Agreement creation data (title, agreement_type)

    Returns:
        Created Agreement with ID and initial status
    """
    # Get the family file and verify access
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    # Check if family file has an active court case
    if family_file.status == "court_linked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create SharedCare Agreements when a Court Custody Case is active. Use QuickAccords instead."
        )

    # Create agreement via the agreement service
    agreement_service = AgreementService(db)
    agreement = await agreement_service.create_agreement_for_family_file(
        family_file_id=family_file_id,
        title=data.title,
        agreement_type=data.agreement_type,
        user=current_user
    )

    return {
        "id": agreement.id,
        "family_file_id": agreement.family_file_id,
        "agreement_number": agreement.agreement_number,
        "title": agreement.title,
        "agreement_type": agreement.agreement_type,
        "version": agreement.version,
        "status": agreement.status,
        "created_at": agreement.created_at,
        "message": "SharedCare Agreement created. Add sections to complete the agreement."
    }


@router.get("/{family_file_id}/agreements")
async def list_agreements_for_family_file(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all SharedCare Agreements for a Family File.

    Args:
        family_file_id: ID of the Family File

    Returns:
        List of agreements with summary information
    """
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    agreements = family_file.agreements

    return {
        "items": [
            {
                "id": a.id,
                "agreement_number": a.agreement_number,
                "title": a.title,
                "agreement_type": a.agreement_type,
                "version": a.version,
                "status": a.status,
                "petitioner_approved": a.petitioner_approved,
                "respondent_approved": a.respondent_approved,
                "effective_date": a.effective_date,
                "created_at": a.created_at,
            }
            for a in agreements
        ],
        "total": len(agreements)
    }


# ============================================================
# Professional Access Management (Parent-Side)
# ============================================================


def _build_professional_assignment_response(assignment: CaseAssignment, db_session=None) -> dict:
    """Build a response dict for a professional assignment."""
    # Get professional and firm names if available
    professional_name = None
    firm_name = None
    professional_email = None
    professional_type = None

    if assignment.professional:
        if assignment.professional.user:
            professional_name = f"{assignment.professional.user.first_name} {assignment.professional.user.last_name}"
            professional_email = assignment.professional.professional_email or assignment.professional.user.email
        professional_type = assignment.professional.professional_type

    if assignment.firm:
        firm_name = assignment.firm.name

    return {
        "id": assignment.id,
        "professional_id": assignment.professional_id,
        "professional_name": professional_name,
        "professional_email": professional_email,
        "professional_type": professional_type,
        "firm_id": assignment.firm_id,
        "firm_name": firm_name,
        "assignment_role": assignment.assignment_role,
        "representing": assignment.representing,
        "access_scopes": assignment.access_scopes,
        "can_control_aria": assignment.can_control_aria,
        "can_message_client": assignment.can_message_client,
        "status": assignment.status,
        "assigned_at": assignment.assigned_at,
    }


def _build_access_request_response(request: ProfessionalAccessRequest) -> dict:
    """Build a response dict for a professional access request."""
    professional_name = None
    professional_email = request.professional_email
    firm_name = None

    if request.professional and request.professional.user:
        professional_name = f"{request.professional.user.first_name} {request.professional.user.last_name}"
        professional_email = professional_email or request.professional.professional_email or request.professional.user.email

    if request.firm:
        firm_name = request.firm.name

    return {
        "id": request.id,
        "professional_id": request.professional_id,
        "professional_name": professional_name,
        "professional_email": professional_email,
        "firm_id": request.firm_id,
        "firm_name": firm_name,
        "requested_by": request.requested_by,
        "requested_role": request.requested_role,
        "requested_scopes": request.requested_scopes,
        "representing": request.representing,
        "status": request.status,
        "parent_a_approved": request.parent_a_approved,
        "parent_b_approved": request.parent_b_approved,
        "message": request.message,
        "expires_at": request.expires_at,
        "created_at": request.created_at,
    }


@router.get("/{family_file_id}/professionals")
async def list_professionals(
    family_file_id: str,
    include_pending: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all professionals with access to a Family File.

    Returns both active assignments and pending access requests.

    Args:
        family_file_id: ID of the Family File
        include_pending: Whether to include pending access requests

    Returns:
        List of professional assignments and pending requests
    """
    # Verify user has access to this family file
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    # Get active assignments
    assignments = await access_service.get_case_assignments(family_file_id)

    response = {
        "professionals": [_build_professional_assignment_response(a) for a in assignments],
        "total_professionals": len(assignments),
    }

    # Include pending requests if requested
    if include_pending:
        pending_requests = await access_service.get_pending_requests_for_case(family_file_id)
        response["pending_requests"] = [_build_access_request_response(r) for r in pending_requests]
        response["total_pending"] = len(pending_requests)

    return response


@router.post("/{family_file_id}/professionals/invite")
async def invite_professional(
    family_file_id: str,
    data: InviteProfessionalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a professional to access a Family File.

    Parents can invite by:
    - Email address (professional may not have an account yet)
    - Professional ID (if known from directory)
    - Firm ID (invite the firm, they assign someone)

    Args:
        family_file_id: ID of the Family File
        data: Invitation details

    Returns:
        Created access request
    """
    # Verify user has access to this family file
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    # Determine which parent is inviting
    is_parent_a = family_file.parent_a_id == current_user.id

    access_service = ProfessionalAccessService(db)

    # Create the access request
    if data.professional_email:
        request = await access_service.invite_professional_by_email(
            family_file_id=family_file_id,
            email=data.professional_email,
            inviter_id=current_user.id,
            requested_role=data.requested_role.value,
            requested_scopes=data.requested_scopes,
            representing=data.representing,
            message=data.message,
        )
    elif data.professional_id:
        request = await access_service.invite_professional_by_id(
            family_file_id=family_file_id,
            professional_id=data.professional_id,
            inviter_id=current_user.id,
            firm_id=data.firm_id,
            requested_role=data.requested_role.value,
            requested_scopes=data.requested_scopes,
            representing=data.representing,
            message=data.message,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either professional_email or professional_id"
        )

    # Auto-approve for the inviting parent
    if is_parent_a:
        request.parent_a_approved = True
        request.parent_a_approved_at = request.created_at
    else:
        request.parent_b_approved = True
        request.parent_b_approved_at = request.created_at

    await db.commit()
    await db.refresh(request)

    response = _build_access_request_response(request)
    response["message"] = "Professional invitation sent successfully"

    return response


@router.post("/{family_file_id}/professionals/requests/{request_id}/approve")
async def approve_professional_request(
    family_file_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a professional access request.

    Both parents may need to approve depending on the configuration.

    Args:
        family_file_id: ID of the Family File
        request_id: ID of the access request

    Returns:
        Updated access request (and created assignment if fully approved)
    """
    # Verify user has access to this family file
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    # Get the request
    request = await access_service.get_access_request(request_id)
    if not request or request.family_file_id != family_file_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found"
        )

    # Approve as the current parent
    request = await access_service.approve_request(
        request_id=request_id,
        approver_user_id=current_user.id,
    )

    response = _build_access_request_response(request)

    # Check if fully approved and assignment was created
    if request.case_assignment_id:
        assignment = await access_service.get_case_assignment(request.case_assignment_id)
        if assignment:
            response["assignment"] = _build_professional_assignment_response(assignment)
            response["message"] = "Professional access approved and granted"
    else:
        response["message"] = "Approval recorded. Waiting for other parent's approval."

    return response


@router.post("/{family_file_id}/professionals/requests/{request_id}/decline")
async def decline_professional_request(
    family_file_id: str,
    request_id: str,
    reason: str = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Decline a professional access request.

    Either parent can decline a request.

    Args:
        family_file_id: ID of the Family File
        request_id: ID of the access request
        reason: Optional reason for declining

    Returns:
        Updated access request
    """
    # Verify user has access to this family file
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    request = await access_service.decline_request(
        request_id=request_id,
        decliner_id=current_user.id,
        reason=reason,
    )

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found"
        )

    response = _build_access_request_response(request)
    response["message"] = "Professional access request declined"

    return response


@router.delete("/{family_file_id}/professionals/{assignment_id}")
async def revoke_professional_access(
    family_file_id: str,
    assignment_id: str,
    reason: str = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke a professional's access to a Family File.

    Either parent can initiate revocation, but may require both approvals.

    Args:
        family_file_id: ID of the Family File
        assignment_id: ID of the case assignment to revoke
        reason: Optional reason for revoking

    Returns:
        Updated assignment status
    """
    # Verify user has access to this family file
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    # Revoke the assignment
    assignment = await access_service.revoke_assignment(
        assignment_id=assignment_id,
        revoker_id=current_user.id,
        reason=reason,
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional assignment not found"
        )

    return {
        "id": assignment.id,
        "status": assignment.status,
        "message": "Professional access has been revoked"
    }


# ============================================================
# Firm Directory (For Parents to Find Professionals)
# ============================================================


@router.get("/directory/firms")
async def search_firm_directory(
    query: str = None,
    state: str = None,
    firm_type: str = None,
    practice_area: str = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search the public firm directory.

    Parents can browse firms to find professionals to invite.
    Only returns firms with is_public=True.

    Args:
        query: Search text (matches name, city)
        state: Filter by state
        firm_type: Filter by firm type (law_firm, mediation_practice, etc.)
        practice_area: Filter by practice area
        skip: Pagination offset
        limit: Pagination limit

    Returns:
        List of public firms with their profiles
    """
    firm_service = FirmService(db)

    firms, total = await firm_service.search_public_firms(
        query=query,
        state=state,
        firm_type=firm_type,
        practice_area=practice_area,
        skip=skip,
        limit=limit,
    )

    return {
        "items": [
            {
                "id": f.id,
                "name": f.name,
                "slug": f.slug,
                "firm_type": f.firm_type,
                "city": f.city,
                "state": f.state,
                "website": f.website,
                "logo_url": f.logo_url,
                "member_count": len([m for m in f.memberships if m.status == "active"]) if f.memberships else 0,
            }
            for f in firms
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/directory/firms/{firm_slug}")
async def get_firm_profile(
    firm_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a public firm's profile.

    Returns firm details and list of professionals available for invitation.

    Args:
        firm_slug: URL slug of the firm

    Returns:
        Firm profile with professionals
    """
    firm_service = FirmService(db)

    firm = await firm_service.get_firm_by_slug(firm_slug)

    if not firm or not firm.is_public:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firm not found"
        )

    # Get active professionals in the firm
    professionals = []
    if firm.memberships:
        for membership in firm.memberships:
            if membership.status == "active" and membership.professional:
                prof = membership.professional
                prof_user = prof.user
                professionals.append({
                    "id": prof.id,
                    "name": f"{prof_user.first_name} {prof_user.last_name}" if prof_user else "Unknown",
                    "professional_type": prof.professional_type,
                    "practice_areas": prof.practice_areas or [],
                    "license_state": prof.license_state,
                    "license_verified": prof.license_verified,
                    "role_in_firm": membership.role,
                })

    return {
        "id": firm.id,
        "name": firm.name,
        "slug": firm.slug,
        "firm_type": firm.firm_type,
        "email": firm.email,
        "phone": firm.phone,
        "website": firm.website,
        "address": {
            "line1": firm.address_line1,
            "line2": firm.address_line2,
            "city": firm.city,
            "state": firm.state,
            "zip": firm.zip_code,
        },
        "logo_url": firm.logo_url,
        "professionals": professionals,
        "professional_count": len(professionals),
    }
