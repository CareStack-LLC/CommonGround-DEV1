"""
Child Profile API endpoints.

Handles child profile CRUD with dual-parent approval workflow.
Profiles start as pending_approval and become active when both parents approve.
"""

from typing import List, Optional
import json
import logging
import uuid

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, create_access_token
from app.models.user import User
from app.models.kidcoms import ChildUser
from app.models.child import Child
from app.services.child import ChildService
from app.services.my_circle import verify_pin
from pydantic import BaseModel
from sqlalchemy import select
from app.services.storage import (
    storage_service,
    StorageBucket,
    build_child_photo_path,
)
from app.services.activity import log_child_activity
from app.schemas.child import (
    ChildCreateBasic,
    ChildUpdateBasic,
    ChildUpdateMedical,
    ChildUpdateEducation,
    ChildUpdatePreferences,
    ChildUpdateEmergencyContacts,
    ChildBasicResponse,
    ChildProfileResponse,
    ChildApprovalResponse,
    ChildListResponse,
    CourtRestrictionUpdate,
    EmergencyContact,
)

router = APIRouter()


def _child_to_basic_response(child) -> ChildBasicResponse:
    """Convert Child model to basic response."""
    return ChildBasicResponse(
        id=child.id,
        case_id=child.case_id,
        family_file_id=child.family_file_id,
        first_name=child.first_name,
        last_name=child.last_name,
        preferred_name=child.preferred_name,
        date_of_birth=child.date_of_birth,
        age=child.age,
        photo_url=child.photo_url,
        status=child.status,
        created_by=child.created_by,
        is_active=child.is_active,
        created_at=child.created_at,
    )


def _child_to_full_response(child) -> ChildProfileResponse:
    """Convert Child model to full profile response."""
    # Parse emergency contacts from JSON
    emergency_contacts = None
    if child.emergency_contacts:
        try:
            contacts_data = json.loads(child.emergency_contacts)
            emergency_contacts = [EmergencyContact(**c) for c in contacts_data]
        except Exception:
            emergency_contacts = None

    # Parse field contributors
    field_contributors = None
    if child.field_contributors:
        try:
            field_contributors = json.loads(child.field_contributors)
        except Exception:
            field_contributors = None

    # Parse court restricted fields
    court_restricted_fields = None
    if child.court_restricted_fields:
        try:
            court_restricted_fields = json.loads(child.court_restricted_fields)
        except Exception:
            court_restricted_fields = None

    return ChildProfileResponse(
        id=child.id,
        case_id=child.case_id,
        family_file_id=child.family_file_id,
        status=child.status,
        created_by=child.created_by,
        approved_by_a=child.approved_by_a,
        approved_by_b=child.approved_by_b,
        approved_at_a=child.approved_at_a,
        approved_at_b=child.approved_at_b,
        first_name=child.first_name,
        middle_name=child.middle_name,
        last_name=child.last_name,
        preferred_name=child.preferred_name,
        date_of_birth=child.date_of_birth,
        birth_city=child.birth_city,
        birth_state=child.birth_state,
        gender=child.gender,
        pronouns=child.pronouns,
        photo_url=child.photo_url,
        has_special_needs=child.has_special_needs or False,
        special_needs_notes=child.special_needs_notes,
        allergies=child.allergies,
        medications=child.medications,
        medical_conditions=child.medical_conditions,
        blood_type=child.blood_type,
        pediatrician_name=child.pediatrician_name,
        pediatrician_phone=child.pediatrician_phone,
        dentist_name=child.dentist_name,
        dentist_phone=child.dentist_phone,
        therapist_name=child.therapist_name,
        therapist_phone=child.therapist_phone,
        insurance_provider=child.insurance_provider,
        insurance_policy_number=child.insurance_policy_number,
        school_name=child.school_name,
        school_address=child.school_address,
        grade_level=child.grade_level,
        teacher_name=child.teacher_name,
        teacher_email=child.teacher_email,
        has_iep=child.has_iep or False,
        has_504=child.has_504 or False,
        favorite_foods=child.favorite_foods,
        food_dislikes=child.food_dislikes,
        favorite_activities=child.favorite_activities,
        comfort_items=child.comfort_items,
        bedtime_routine=child.bedtime_routine,
        clothing_size=child.clothing_size,
        shoe_size=child.shoe_size,
        sizes_updated_at=child.sizes_updated_at,
        temperament_notes=child.temperament_notes,
        fears_anxieties=child.fears_anxieties,
        calming_strategies=child.calming_strategies,
        emergency_contacts=emergency_contacts,
        field_contributors=field_contributors,
        court_restricted_fields=court_restricted_fields,
        current_custody_parent_id=child.current_custody_parent_id,
        is_active=child.is_active,
        created_at=child.created_at,
        updated_at=child.updated_at,
        age=child.age,
        full_name=child.full_name,
        display_name=child.display_name,
    )


# === PROFILE CREATION ===

@router.post(
    "/",
    response_model=ChildProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create child profile",
    description="Create a new child profile. Starts as pending_approval until other parent approves.",
)
async def create_child(
    child_data: ChildCreateBasic,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new child profile.

    - Creates profile with pending_approval status
    - Creator automatically approves (approved_by_a)
    - Other parent must approve to make profile active
    - Case must be active to add children
    """
    service = ChildService(db)
    child = await service.create_child(child_data, current_user)
    return _child_to_full_response(child)


# === APPROVAL WORKFLOW ===

@router.post(
    "/{child_id}/approve",
    response_model=ChildApprovalResponse,
    summary="Approve child profile",
    description="Approve a pending child profile. Profile becomes active when both parents approve.",
)
async def approve_child(
    child_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve a pending child profile.

    - Only pending profiles can be approved
    - Cannot approve your own pending profile twice
    - Profile becomes active when both parents approve
    """
    service = ChildService(db)
    child = await service.approve_child(child_id, current_user)

    # Log activity for child approval (only for family file children)
    if child.family_file_id:
        try:
            actor_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await log_child_activity(
                db=db,
                family_file_id=child.family_file_id,
                actor_id=str(current_user.id),
                actor_name=actor_name or "Co-parent",
                child_id=str(child.id),
                child_name=child.first_name,
                action="approved",
            )
        except Exception as e:
            logger.warning(f"Activity logging failed: {e}")

    message = (
        "Profile is now active"
        if child.status == "active"
        else "Approval recorded. Waiting for other parent."
    )

    return ChildApprovalResponse(
        id=child.id,
        status=child.status,
        approved_by_a=child.approved_by_a,
        approved_by_b=child.approved_by_b,
        approved_at_a=child.approved_at_a,
        approved_at_b=child.approved_at_b,
        message=message,
    )


# === PROFILE RETRIEVAL ===

@router.get(
    "/case/{case_id}",
    response_model=ChildListResponse,
    summary="List children for case",
    description="Get all child profiles for a case.",
)
async def list_children(
    case_id: str,
    include_pending: bool = True,
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all children for a case.

    - Returns basic info for each child
    - Optionally include pending and archived profiles
    - Court restrictions are applied automatically
    """
    service = ChildService(db)
    children = await service.list_children_for_case(
        case_id, current_user, include_pending, include_archived
    )

    basic_children = [_child_to_basic_response(c) for c in children]

    pending_count = sum(1 for c in children if c.status == "pending_approval")
    active_count = sum(1 for c in children if c.status == "active")

    return ChildListResponse(
        case_id=case_id,
        children=basic_children,
        pending_approval_count=pending_count,
        active_count=active_count,
    )


@router.get(
    "/{child_id}",
    response_model=ChildProfileResponse,
    summary="Get child profile",
    description="Get full child profile with all details.",
)
async def get_child(
    child_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a child's full profile.

    - Returns all profile fields
    - Court restrictions are applied automatically
    - Includes field attribution (who added what)
    """
    service = ChildService(db)
    child = await service.get_child(child_id, current_user)
    return _child_to_full_response(child)


# === PROFILE UPDATES ===

@router.put(
    "/{child_id}/basic",
    response_model=ChildProfileResponse,
    summary="Update basic info",
    description="Update basic child information (name, DOB, gender).",
)
async def update_basic_info(
    child_id: str,
    update_data: ChildUpdateBasic,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update basic child information."""
    service = ChildService(db)
    child = await service.update_basic_info(child_id, update_data, current_user)
    return _child_to_full_response(child)


@router.put(
    "/{child_id}/medical",
    response_model=ChildProfileResponse,
    summary="Update medical info",
    description="Update medical information (allergies, medications, providers).",
)
async def update_medical_info(
    child_id: str,
    update_data: ChildUpdateMedical,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update medical information."""
    service = ChildService(db)
    child = await service.update_medical_info(child_id, update_data, current_user)

    # Log activity for medical info update
    if child.family_file_id:
        try:
            actor_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await log_child_activity(
                db=db,
                family_file_id=child.family_file_id,
                actor_id=str(current_user.id),
                actor_name=actor_name or "Co-parent",
                child_id=str(child.id),
                child_name=child.first_name,
                action="updated",
                field_changed="medical info",
            )
        except Exception as e:
            logger.warning(f"Activity logging failed: {e}")

    return _child_to_full_response(child)


@router.put(
    "/{child_id}/education",
    response_model=ChildProfileResponse,
    summary="Update education info",
    description="Update education information (school, grade, teacher).",
)
async def update_education_info(
    child_id: str,
    update_data: ChildUpdateEducation,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update education information."""
    service = ChildService(db)
    child = await service.update_education_info(child_id, update_data, current_user)

    # Log activity for education info update
    if child.family_file_id:
        try:
            actor_name = f"{current_user.first_name} {current_user.last_name or ''}".strip()
            await log_child_activity(
                db=db,
                family_file_id=child.family_file_id,
                actor_id=str(current_user.id),
                actor_name=actor_name or "Co-parent",
                child_id=str(child.id),
                child_name=child.first_name,
                action="updated",
                field_changed="school info",
            )
        except Exception as e:
            logger.warning(f"Activity logging failed: {e}")

    return _child_to_full_response(child)


@router.put(
    "/{child_id}/preferences",
    response_model=ChildProfileResponse,
    summary="Update preferences",
    description="Update preferences and favorites (foods, activities, sizes).",
)
async def update_preferences(
    child_id: str,
    update_data: ChildUpdatePreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update preferences and favorites."""
    service = ChildService(db)
    child = await service.update_preferences(child_id, update_data, current_user)
    return _child_to_full_response(child)


@router.put(
    "/{child_id}/emergency-contacts",
    response_model=ChildProfileResponse,
    summary="Update emergency contacts",
    description="Update emergency contacts list.",
)
async def update_emergency_contacts(
    child_id: str,
    update_data: ChildUpdateEmergencyContacts,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update emergency contacts."""
    service = ChildService(db)
    child = await service.update_emergency_contacts(child_id, update_data, current_user)
    return _child_to_full_response(child)


@router.put(
    "/{child_id}/photo",
    response_model=ChildProfileResponse,
    summary="Update profile photo",
    description="Set the child's profile photo URL.",
)
async def update_photo(
    child_id: str,
    photo_url: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update child's profile photo."""
    service = ChildService(db)
    child = await service.update_photo(child_id, photo_url, current_user)
    return _child_to_full_response(child)


@router.post(
    "/{child_id}/photo/upload",
    response_model=ChildProfileResponse,
    summary="Upload profile photo file",
    description="Upload a photo file for a child's profile.",
)
async def upload_photo(
    child_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and save a child's profile photo to Supabase Storage."""
    MAX_PHOTO_SIZE = 10 * 1024 * 1024  # 10MB

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, GIF, or WebP."
        )

    # Validate file size
    if file.size and file.size > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_PHOTO_SIZE // (1024*1024)}MB."
        )

    # Get the child to verify access and get family_file_id
    service = ChildService(db)
    child = await service.get_child(child_id, current_user)

    # Determine the family context (family_file_id or case_id)
    family_context_id = child.family_file_id or child.case_id
    if not family_context_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Child must be associated with a family file or case"
        )

    # Generate unique filename
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex[:8]}.{ext}"
    storage_path = build_child_photo_path(family_context_id, child_id, filename)

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.exception(f"Failed to read child photo file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read file."
        )

    # Upload to Supabase Storage
    try:
        photo_url = await storage_service.upload_file(
            bucket=StorageBucket.CHILDREN,
            path=storage_path,
            file_content=content,
            content_type=file.content_type or "image/jpeg"
        )
    except Exception as e:
        logger.exception(f"Failed to upload child photo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file."
        )

    # Update child with photo URL
    child = await service.update_photo(child_id, photo_url, current_user)
    return _child_to_full_response(child)


# === ARCHIVE ===

@router.delete(
    "/{child_id}",
    response_model=ChildProfileResponse,
    summary="Archive child profile",
    description="Archive a child profile (soft delete). Can be restored later.",
)
async def archive_child(
    child_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Archive a child profile.

    - Soft deletes the profile (can be restored)
    - Only active profiles can be archived
    - Both parents can archive
    """
    service = ChildService(db)
    child = await service.archive_child(child_id, current_user)
    return _child_to_full_response(child)


# === COURT RESTRICTIONS (Admin) ===

@router.put(
    "/{child_id}/restrictions",
    response_model=ChildProfileResponse,
    summary="Set court restrictions",
    description="Set court-mandated field restrictions (admin only).",
)
async def set_court_restrictions(
    child_id: str,
    restriction_data: CourtRestrictionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Set court-mandated field restrictions.

    - Hides specific fields from one parent
    - Typically used for safety (address, school location)
    - Requires admin or court staff role
    """
    if not current_user.is_admin:
        # Check for professional with court access
        from app.models.professional import ProfessionalProfile
        pro_result = await db.execute(
            select(ProfessionalProfile).where(
                ProfessionalProfile.user_id == current_user.id
            )
        )
        if not pro_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin or court professionals can set court restrictions"
            )
    service = ChildService(db)
    child = await service.set_court_restrictions(
        child_id, restriction_data, current_user
    )
    return _child_to_full_response(child)


@router.delete(
    "/{child_id}/restrictions",
    response_model=ChildProfileResponse,
    summary="Remove court restrictions",
    description="Remove all court restrictions from a profile (admin only).",
)
async def remove_court_restrictions(
    child_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove all court restrictions from a child profile. Requires admin role."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can remove court restrictions"
        )
    service = ChildService(db)
    child = await service.remove_court_restrictions(child_id, current_user)
    return _child_to_full_response(child)


# === STATISTICS ===

@router.get(
    "/case/{case_id}/counts",
    summary="Get child counts",
    description="Get child profile counts for a case.",
)
async def get_child_counts(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get child profile counts (pending, active, archived)."""
    service = ChildService(db)
    counts = await service.get_case_child_counts(case_id, current_user)
    return counts


# ============================================================
# KidsCom App Authentication (PIN-only login)
# ============================================================

class ChildPinLoginRequest(BaseModel):
    """PIN login request for KidsCom app. Requires username to scope the lookup."""
    pin: str
    username: Optional[str] = None  # Username scopes the search (recommended)
    family_file_id: Optional[str] = None  # Alternative: scope by family file


class ChildPinLoginResponse(BaseModel):
    """Response for child PIN login."""
    access_token: str
    token_type: str = "bearer"
    child: dict


@router.post(
    "/login",
    response_model=ChildPinLoginResponse,
    summary="Child PIN login (KidsCom)",
    description="Simple PIN-based login for the KidsCom app. For demo/testing purposes."
)
async def child_pin_login(
    request: Request,
    login_data: ChildPinLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate a child with PIN + username or family_file_id.

    PIN alone is not secure enough — we require either a username
    or family_file_id to scope the lookup and prevent brute-force attacks.
    """
    from datetime import datetime

    # A PIN is only a few digits — require a username or family scope so a login
    # can never become a full-table PIN scan (brute-force surface).
    if not login_data.username and not login_data.family_file_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A username or family code is required to sign in.",
        )

    # Lockout: throttle repeated failed PIN attempts from the same client+scope.
    ip = request.client.host if request.client else "unknown"
    scope_key = login_data.username or login_data.family_file_id or "none"
    lock_key = f"childpin:fail:{ip}:{scope_key}"
    MAX_FAILS = 8
    LOCK_WINDOW = 15 * 60
    _redis = None
    try:
        from app.core.redis_client import get_redis
        _redis = await get_redis()
        if _redis is not None:
            fails = await _redis.get(lock_key)
            if fails is not None and int(fails) >= MAX_FAILS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many incorrect PIN attempts. Please try again later or ask a parent for help.",
                )
    except HTTPException:
        raise
    except Exception:
        _redis = None  # fail-open: never block a child on a cache outage

    # Build scoped query (never scans all child users)
    query = select(ChildUser).where(
        ChildUser.is_active == True,
        ChildUser.pin_hash.isnot(None),
    )
    if login_data.username:
        query = query.where(ChildUser.username == login_data.username)
    else:
        query = query.where(ChildUser.family_file_id == login_data.family_file_id)

    result = await db.execute(query)
    child_users = result.scalars().all()

    # Find matching PIN
    matched_child_user = None
    for child_user in child_users:
        if verify_pin(login_data.pin, child_user.pin_hash):
            matched_child_user = child_user
            break

    if not matched_child_user:
        # Count the failed attempt toward the lockout.
        if _redis is not None:
            try:
                new_count = await _redis.incr(lock_key)
                if new_count == 1:
                    await _redis.expire(lock_key, LOCK_WINDOW)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN"
        )

    # Successful login — clear the failure counter.
    if _redis is not None:
        try:
            await _redis.delete(lock_key)
        except Exception:
            pass

    # Get the child profile
    child_result = await db.execute(
        select(Child).where(Child.id == matched_child_user.child_id)
    )
    child = child_result.scalar_one_or_none()

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found"
        )

    # Update last login
    matched_child_user.last_login = datetime.utcnow()
    await db.commit()

    # Generate access token for child
    token = create_access_token(
        data={
            "sub": str(matched_child_user.id),
            "type": "child_user",
            "child_id": str(matched_child_user.child_id),
            "family_file_id": str(matched_child_user.family_file_id),
        }
    )

    return ChildPinLoginResponse(
        access_token=token,
        child={
            "id": str(child.id),
            "first_name": child.first_name,
            "last_name": child.last_name or "",
            "avatar_url": child.photo_url,
            "family_file_id": str(matched_child_user.family_file_id),
            "username": matched_child_user.username,
            "avatar_id": matched_child_user.avatar_id,
        }
    )


# ============================================================
# Child Circle Contacts (For KidsCom App)
# ============================================================

from app.core.security import get_current_child_user
from app.models.circle import CircleContact
from app.models.kidcoms import CirclePermission


class ChildCircleContactResponse(BaseModel):
    """Circle contact for a child to communicate with."""
    id: str
    name: str
    display_name: Optional[str] = None
    relationship: Optional[str] = None
    avatar_url: Optional[str] = None
    is_online: bool = False
    family_file_id: str
    # Permission flags
    can_video_call: bool = True
    can_voice_call: bool = True
    can_chat: bool = True
    can_theater: bool = True
    is_within_allowed_time: bool = True
    require_parent_present: bool = False


class ChildCircleResponse(BaseModel):
    """Response with child's circle contacts."""
    contacts: List[ChildCircleContactResponse]


@router.get(
    "/circle",
    response_model=ChildCircleResponse,
    summary="Get child's circle contacts (KidsCom)",
    description="Get the list of approved contacts a child can communicate with."
)
async def get_child_circle(
    db: AsyncSession = Depends(get_db),
    child_user: ChildUser = Depends(get_current_child_user)
):
    """
    Get circle contacts for the authenticated child.

    Returns all active, approved contacts from the child's family file
    along with their permission settings.
    """
    from datetime import datetime

    logger.debug(f"Fetching circle contacts for child {child_user.family_file_id}")

    # Get all active circle contacts for this family file
    result = await db.execute(
        select(CircleContact)
        .where(CircleContact.family_file_id == str(child_user.family_file_id))
        .where(CircleContact.is_active == True)
        # Only get contacts approved by at least one parent
        .where(
            (CircleContact.approved_by_parent_a_at.isnot(None)) |
            (CircleContact.approved_by_parent_b_at.isnot(None))
        )
    )
    contacts = result.scalars().all()
    logger.info(f"Found {len(contacts)} circle contacts")

    # Get permissions for this child
    permissions_result = await db.execute(
        select(CirclePermission)
        .where(CirclePermission.family_file_id == str(child_user.family_file_id))
        .where(CirclePermission.child_id == str(child_user.child_id))
    )
    permissions = {str(p.circle_contact_id): p for p in permissions_result.scalars().all()}

    # Build response
    contact_responses = []
    for contact in contacts:
        # Check if there are specific permissions for this contact+child
        permission = permissions.get(str(contact.id))

        # Determine if within allowed time
        is_within_time = True
        if permission and hasattr(permission, 'is_within_allowed_time'):
            try:
                is_within_time = permission.is_within_allowed_time()
            except Exception:
                is_within_time = True

        contact_responses.append(ChildCircleContactResponse(
            id=str(contact.id),
            name=contact.contact_name,
            display_name=contact.contact_name,
            relationship=contact.relationship_type,
            avatar_url=contact.photo_url,
            is_online=None,  # Online status determined by frontend presence system
            family_file_id=str(contact.family_file_id),
            can_video_call=permission.can_video_call if permission else True,
            can_voice_call=permission.can_voice_call if permission else True,
            can_chat=permission.can_chat if permission else True,
            can_theater=permission.can_theater if permission else True,
            is_within_allowed_time=is_within_time,
            require_parent_present=permission.require_parent_present if permission else False,
        ))

    return ChildCircleResponse(contacts=contact_responses)
