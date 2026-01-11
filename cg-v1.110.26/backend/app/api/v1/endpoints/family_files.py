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
from app.services.family_file import FamilyFileService
from app.services.agreement import AgreementService

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
