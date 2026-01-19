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
from app.services.professional import ProfessionalAccessService, CaseAssignmentService
from app.schemas.professional import CaseAssignmentCreate, AssignmentRole

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


def _build_parent_info(user, role: str) -> dict:
    """Build a ParentInfo dict from a User model."""
    if not user:
        return None
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": role,
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
    import traceback
    import logging
    logger = logging.getLogger(__name__)

    try:
        service = FamilyFileService(db)
        family_files = await service.get_user_family_files(current_user)

        # Build response with parent info
        items = []
        for ff in family_files:
            try:
                item = _build_family_file_response(ff)
                # Add parent info for name display
                item["parent_a_info"] = _build_parent_info(ff.parent_a, ff.parent_a_role)
                item["parent_b_info"] = _build_parent_info(ff.parent_b, ff.parent_b_role) if ff.parent_b else None
                items.append(item)
            except Exception as item_err:
                logger.error(f"Error building family file response for {ff.id}: {item_err}")
                logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=500,
                    detail=f"Error processing family file {ff.id}: {str(item_err)}"
                )

        return {
            "items": items,
            "total": len(family_files)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing family files: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list family files: {str(e)}"
        )


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

    # Add parent info with names
    response["parent_a_info"] = _build_parent_info(family_file.parent_a, family_file.parent_a_role)
    response["parent_b_info"] = _build_parent_info(family_file.parent_b, family_file.parent_b_role) if family_file.parent_b else None

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


@router.delete("/{family_file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family_file(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a Family File.

    Only the creator (Parent A) can delete a Family File.
    Cannot delete if a Court Case is linked.

    Args:
        family_file_id: ID of the Family File

    Returns:
        204 No Content on success
    """
    service = FamilyFileService(db)
    await service.delete_family_file(family_file_id, current_user)
    return None


@router.post("/{family_file_id}/remove-parent-b")
async def remove_parent_b(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove Parent B from a Family File.

    Only the creator (Parent A) can remove the co-parent.
    Cannot remove if a Court Case is linked.

    Args:
        family_file_id: ID of the Family File

    Returns:
        Updated Family File
    """
    service = FamilyFileService(db)
    family_file = await service.remove_parent_b(family_file_id, current_user)

    response = _build_family_file_response(family_file)
    response["message"] = "Co-parent has been removed from this Family File"

    return response


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
        user=current_user,
        agreement_version=data.agreement_version
    )

    return {
        "id": agreement.id,
        "family_file_id": agreement.family_file_id,
        "agreement_number": agreement.agreement_number,
        "title": agreement.title,
        "agreement_type": agreement.agreement_type,
        "agreement_version": agreement.agreement_version,
        "version": agreement.version,
        "status": agreement.status,
        "created_at": agreement.created_at,
        "message": "SharedCare Agreement created. Use the builder to complete the agreement."
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
# Professional Access Request Endpoints
# ============================================================

@router.get("/{family_file_id}/professional-access-requests")
async def list_professional_access_requests(
    family_file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List pending professional access requests for a Family File.

    Only parents of the family file can view these requests.
    """
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)
    requests = await access_service.list_requests_for_family_file(family_file_id)

    return {
        "items": [
            {
                "id": r.id,
                "professional_id": r.professional_id,
                "firm_id": r.firm_id,
                "requested_role": r.requested_role,
                "requested_scopes": r.requested_scopes,
                "representing": r.representing,
                "status": r.status,
                "message": r.message,
                "parent_a_approved": r.parent_a_approved,
                "parent_b_approved": r.parent_b_approved,
                "created_at": r.created_at,
                "expires_at": r.expires_at,
            }
            for r in requests
        ],
        "total": len(requests)
    }


@router.post("/{family_file_id}/professional-access-requests/{request_id}/approve")
async def approve_professional_access_request(
    family_file_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a professional's access request.

    - Both parents must approve before the professional gets access
    - Once both approve, a case assignment is automatically created
    """
    ff_service = FamilyFileService(db)
    family_file = await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    # First get the current request state
    request = await access_service.get_access_request(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found"
        )

    # If already approved but no assignment, just create assignment
    if request.status == "approved" and not request.case_assignment_id:
        pass  # Will create assignment below
    elif request.status == "approved":
        return {
            "id": request.id,
            "status": request.status,
            "parent_a_approved": request.parent_a_approved,
            "parent_b_approved": request.parent_b_approved,
            "case_assignment_id": request.case_assignment_id,
            "message": "Already approved and assignment exists"
        }
    else:
        # Try to approve
        try:
            request = await access_service.approve_request(request_id, current_user.id)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    # If fully approved (both parents), create case assignment
    if request.status == "approved" and not request.case_assignment_id:
        assignment_service = CaseAssignmentService(db)
        assignment_data = CaseAssignmentCreate(
            family_file_id=family_file_id,
            assignment_role=AssignmentRole(request.requested_role) if request.requested_role else AssignmentRole.LEAD_ATTORNEY,
            access_scopes=request.requested_scopes or ["agreement", "schedule", "messages"],
            representing=request.representing or "both",
            can_control_aria=True,
            can_message_client=True,
        )
        try:
            assignment = await assignment_service.create_assignment(
                professional_id=request.professional_id,
                family_file_id=family_file_id,
                data=assignment_data,
                assigned_by=current_user.id,
            )
            request.case_assignment_id = assignment.id
            await db.commit()
        except ValueError as e:
            # Assignment might already exist
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    return {
        "id": request.id,
        "status": request.status,
        "parent_a_approved": request.parent_a_approved,
        "parent_b_approved": request.parent_b_approved,
        "case_assignment_id": request.case_assignment_id,
        "message": "Request approved" if request.status != "approved" else "Access granted - case assignment created"
    }


@router.post("/{family_file_id}/professional-access-requests/{request_id}/decline")
async def decline_professional_access_request(
    family_file_id: str,
    request_id: str,
    reason: str = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Decline a professional's access request.

    Either parent can decline the request.
    """
    ff_service = FamilyFileService(db)
    await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    try:
        request = await access_service.decline_request(request_id, current_user.id, reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {
        "id": request.id,
        "status": request.status,
        "decline_reason": request.decline_reason,
        "message": "Request declined"
    }


# Alias routes for frontend compatibility (uses /professionals/requests/ path)
@router.post("/{family_file_id}/professionals/requests/{request_id}/approve")
async def approve_professional_request_alias(
    family_file_id: str,
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Alias for approve_professional_access_request for frontend compatibility."""
    return await approve_professional_access_request(
        family_file_id=family_file_id,
        request_id=request_id,
        current_user=current_user,
        db=db
    )


@router.post("/{family_file_id}/professionals/requests/{request_id}/decline")
async def decline_professional_request_alias(
    family_file_id: str,
    request_id: str,
    reason: str = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Alias for decline_professional_access_request for frontend compatibility."""
    return await decline_professional_access_request(
        family_file_id=family_file_id,
        request_id=request_id,
        reason=reason,
        current_user=current_user,
        db=db
    )


@router.get("/{family_file_id}/professionals")
async def list_family_file_professionals(
    family_file_id: str,
    include_pending: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List professionals who have access to this Family File.

    Returns active case assignments and optionally pending access requests.
    """
    import traceback
    import logging
    logger = logging.getLogger(__name__)

    try:
        ff_service = FamilyFileService(db)
        await ff_service.get_family_file(family_file_id, current_user)
    except Exception as e:
        logger.error(f"Error getting family file: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting family file: {str(e)}"
        )

    try:
        assignment_service = CaseAssignmentService(db)
        assignments = await assignment_service.list_assignments_for_family_file(family_file_id)
    except Exception as e:
        logger.error(f"Error listing assignments: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing assignments: {str(e)}"
        )

    professionals = []
    for assignment in assignments:
        if assignment.status != "active":
            continue

        # Get professional info
        prof = assignment.professional
        user = prof.user if prof else None

        professionals.append({
            "assignment_id": assignment.id,
            "professional_id": assignment.professional_id,
            "firm_id": assignment.firm_id,
            "firm_name": assignment.firm.name if assignment.firm else None,
            "role": assignment.assignment_role,
            "representing": assignment.representing,
            "access_scopes": assignment.access_scopes,
            "can_control_aria": assignment.can_control_aria,
            "can_message_client": assignment.can_message_client,
            "assigned_at": assignment.assigned_at,
            "professional_name": f"{user.first_name} {user.last_name}" if user else None,
            "professional_email": user.email if user else None,
            "professional_type": prof.professional_type if prof else None,
            "status": assignment.status,
        })

    result = {
        "professionals": professionals,
        "total": len(professionals),
        "total_professionals": len(professionals),  # Alias for frontend compatibility
    }

    # Include pending access requests if requested
    if include_pending:
        access_service = ProfessionalAccessService(db)
        pending_requests = await access_service.list_requests_for_family_file(family_file_id)
        pending = [
            {
                "request_id": r.id,
                "professional_id": r.professional_id,
                "firm_id": r.firm_id,
                "requested_role": r.requested_role,
                "requested_scopes": r.requested_scopes,
                "status": r.status,
                "message": r.message,
                "parent_a_approved": r.parent_a_approved,
                "parent_b_approved": r.parent_b_approved,
                "created_at": r.created_at,
                "expires_at": r.expires_at,
            }
            for r in pending_requests
            if r.status == "pending"
        ]
        result["pending_requests"] = pending
        result["pending_count"] = len(pending)
        result["total_pending"] = len(pending)  # Alias for frontend compatibility

    return result


@router.post("/{family_file_id}/professionals/invite")
async def invite_professional(
    family_file_id: str,
    email: str = Body(None),
    firm_id: str = Body(None),
    professional_id: str = Body(None),
    scopes: list[str] = Body(None),
    message: str = Body(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a professional or firm to this Family File.

    Can invite by:
    - email: Send invitation to a professional by email
    - firm_id: Invite a firm from the directory (firm assigns professional)
    - professional_id + firm_id: Request a specific professional from a firm
    """
    ff_service = FamilyFileService(db)
    await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    # If firm_id is provided, use the directory invitation flow
    if firm_id:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        try:
            request = await access_service.invite_firm_from_directory(
                family_file_id=family_file_id,
                firm_id=firm_id,
                inviter_user_id=str(current_user.id),
                message=message,
            )
            return {
                "request_id": str(request.id),
                "message": "Invitation sent to firm. Awaiting other parent approval and firm acceptance."
            }
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"Error inviting firm: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error inviting firm: {str(e)}"
            )

    # Email-based invitation (legacy flow)
    if email:
        # For now, return error - email invitations handled separately
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email invitations are not yet supported. Please use firm directory."
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Please provide either firm_id or email to invite a professional."
    )


@router.post("/{family_file_id}/invite-firm")
async def invite_firm_from_directory(
    family_file_id: str,
    firm_id: str = Body(..., embed=True),
    message: str = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a firm from the directory to represent you.

    Parents can browse the public firm directory and invite firms to their case.
    The firm will receive the invitation and can assign a professional to the case.
    The inviting parent automatically approves; the other parent still needs to approve.
    """
    ff_service = FamilyFileService(db)
    await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    try:
        request = await access_service.invite_firm_from_directory(
            family_file_id=family_file_id,
            firm_id=firm_id,
            inviter_user_id=str(current_user.id),
            message=message,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {
        "id": request.id,
        "family_file_id": request.family_file_id,
        "firm_id": request.firm_id,
        "status": request.status,
        "parent_a_approved": request.parent_a_approved,
        "parent_b_approved": request.parent_b_approved,
        "message": request.message,
        "expires_at": request.expires_at,
        "created_at": request.created_at,
        "info": "Invitation sent to firm. Awaiting other parent approval and firm acceptance."
    }


@router.delete("/{family_file_id}/professionals/{assignment_id}")
async def remove_professional(
    family_file_id: str,
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a professional from this Family File.

    Parents can revoke a professional's access at any time.
    This sets the assignment status to 'withdrawn'.
    """
    ff_service = FamilyFileService(db)
    await ff_service.get_family_file(family_file_id, current_user)

    access_service = ProfessionalAccessService(db)

    try:
        assignment = await access_service.revoke_professional_access(
            family_file_id=family_file_id,
            assignment_id=assignment_id,
            revoker_user_id=str(current_user.id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {
        "id": assignment.id,
        "status": assignment.status,
        "message": "Professional access has been revoked"
    }
