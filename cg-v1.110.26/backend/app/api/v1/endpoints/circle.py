"""
Circle API endpoints for managing approved child contacts.

The Circle is a list of trusted contacts (grandparents, family friends, etc.)
that a child can communicate with through KidComs.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.family_file import FamilyFile
from app.models.child import Child
from app.models.circle import CircleContact, ApprovalMode
from app.models.kidcoms import KidComsSettings
from app.schemas.circle import (
    CircleContactCreate,
    CircleContactUpdate,
    CircleContactResponse,
    CircleContactListResponse,
    CircleContactApproval,
    CircleContactInvite,
    CircleContactInviteResponse,
    RELATIONSHIP_CHOICES,
)

router = APIRouter()


async def get_family_file_with_access(
    db: AsyncSession, family_file_id: str, user_id: str
) -> FamilyFile:
    """Get family file and verify user has access."""
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    family_file = result.scalar_one_or_none()

    if not family_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family file not found"
        )

    # Check if user is a parent in this family file
    if family_file.parent_a_id != user_id and family_file.parent_b_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this family file"
        )

    return family_file


async def get_approval_mode(db: AsyncSession, family_file_id: str) -> ApprovalMode:
    """Get the approval mode for circle contacts."""
    result = await db.execute(
        select(KidComsSettings).where(KidComsSettings.family_file_id == family_file_id)
    )
    settings = result.scalar_one_or_none()

    if settings:
        return ApprovalMode(settings.circle_approval_mode)
    return ApprovalMode.BOTH_PARENTS


def is_parent_a(family_file: FamilyFile, user_id: str) -> bool:
    """Check if user is parent A in the family file."""
    return family_file.parent_a_id == user_id


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=CircleContactResponse,
    summary="Add circle contact",
    description="Add a new contact to a child's approved circle."
)
async def create_circle_contact(
    contact_data: CircleContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a new contact to the approved circle.

    - **child_id**: If null, contact is approved for ALL children
    - **relationship**: grandparent, aunt, uncle, etc.
    - Contact will be pending approval from other parent (based on settings)
    """
    # Verify access to family file
    family_file = await get_family_file_with_access(
        db, contact_data.family_file_id, current_user.id
    )

    # If child_id is provided, verify child belongs to this family
    if contact_data.child_id:
        child_result = await db.execute(
            select(Child).where(
                and_(
                    Child.id == contact_data.child_id,
                    Child.family_file_id == contact_data.family_file_id
                )
            )
        )
        child = child_result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child not found in this family file"
            )

    # Create the contact
    contact = CircleContact(
        family_file_id=contact_data.family_file_id,
        child_id=contact_data.child_id,
        contact_name=contact_data.contact_name,
        contact_email=contact_data.contact_email,
        contact_phone=contact_data.contact_phone,
        relationship_type=contact_data.relationship_type,
        photo_url=contact_data.photo_url,
        notes=contact_data.notes,
        added_by=current_user.id,
        availability_override=contact_data.availability_override,
    )

    # Auto-approve for the creating parent
    if is_parent_a(family_file, current_user.id):
        contact.approved_by_parent_a_at = datetime.utcnow()
    else:
        contact.approved_by_parent_b_at = datetime.utcnow()

    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    # Get approval mode for response
    approval_mode = await get_approval_mode(db, contact_data.family_file_id)

    return _contact_to_response(contact, approval_mode)


@router.get(
    "/family/{family_file_id}",
    response_model=CircleContactListResponse,
    summary="List circle contacts",
    description="List all circle contacts for a family file."
)
async def list_circle_contacts(
    family_file_id: str,
    child_id: Optional[str] = Query(None, description="Filter by specific child"),
    include_inactive: bool = Query(False, description="Include inactive contacts"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all circle contacts for a family file."""
    # Verify access
    family_file = await get_family_file_with_access(db, family_file_id, current_user.id)

    # Build query
    query = select(CircleContact).where(
        CircleContact.family_file_id == family_file_id
    )

    if child_id:
        # Include contacts for this specific child OR for all children (null)
        query = query.where(
            or_(
                CircleContact.child_id == child_id,
                CircleContact.child_id.is_(None)
            )
        )

    if not include_inactive:
        query = query.where(CircleContact.is_active == True)

    query = query.order_by(CircleContact.contact_name)

    result = await db.execute(query)
    contacts = result.scalars().all()

    # Get approval mode
    approval_mode = await get_approval_mode(db, family_file_id)

    # Build response
    items = [_contact_to_response(c, approval_mode) for c in contacts]

    return CircleContactListResponse(
        items=items,
        total=len(items),
        fully_approved_count=sum(1 for c in contacts if c.is_fully_approved),
        pending_approval_count=sum(1 for c in contacts if c.is_partially_approved and not c.is_fully_approved),
    )


@router.get(
    "/{contact_id}",
    response_model=CircleContactResponse,
    summary="Get circle contact",
    description="Get a circle contact by ID."
)
async def get_circle_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a circle contact by ID."""
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Get approval mode
    approval_mode = await get_approval_mode(db, contact.family_file_id)

    return _contact_to_response(contact, approval_mode)


@router.put(
    "/{contact_id}",
    response_model=CircleContactResponse,
    summary="Update circle contact",
    description="Update a circle contact's information."
)
async def update_circle_contact(
    contact_id: str,
    update_data: CircleContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a circle contact."""
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Update fields
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)

    # Get approval mode
    approval_mode = await get_approval_mode(db, contact.family_file_id)

    return _contact_to_response(contact, approval_mode)


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove circle contact",
    description="Remove a contact from the approved circle."
)
async def delete_circle_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a circle contact (soft delete by setting inactive)."""
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Soft delete
    contact.is_active = False
    await db.commit()


@router.post(
    "/{contact_id}/approve",
    response_model=CircleContactResponse,
    summary="Approve circle contact",
    description="Parent approval for a circle contact."
)
async def approve_circle_contact(
    contact_id: str,
    approval: CircleContactApproval,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a circle contact.

    Based on family settings:
    - both_parents: Both parents must approve
    - either_parent: Either parent can approve
    """
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access and get family file
    family_file = await get_family_file_with_access(
        db, contact.family_file_id, current_user.id
    )

    if approval.approved:
        # Set approval timestamp for this parent
        if is_parent_a(family_file, current_user.id):
            contact.approved_by_parent_a_at = datetime.utcnow()
        else:
            contact.approved_by_parent_b_at = datetime.utcnow()
    else:
        # Revoke approval (this parent no longer approves)
        if is_parent_a(family_file, current_user.id):
            contact.approved_by_parent_a_at = None
        else:
            contact.approved_by_parent_b_at = None

    await db.commit()
    await db.refresh(contact)

    # Get approval mode
    approval_mode = await get_approval_mode(db, contact.family_file_id)

    return _contact_to_response(contact, approval_mode)


@router.post(
    "/{contact_id}/invite",
    response_model=CircleContactInviteResponse,
    summary="Send verification invite",
    description="Send email/SMS to verify circle contact's identity."
)
async def send_circle_invite(
    contact_id: str,
    invite_data: CircleContactInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a verification invite to a circle contact.

    This allows the contact to verify their email/phone before
    being able to join KidComs sessions.
    """
    result = await db.execute(
        select(CircleContact).where(CircleContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Circle contact not found"
        )

    # Verify access
    await get_family_file_with_access(db, contact.family_file_id, current_user.id)

    # Generate verification token
    import secrets
    verification_token = secrets.token_urlsafe(32)
    contact.verification_token = verification_token

    await db.commit()

    # TODO: Integrate with email/SMS service (SendGrid, Twilio)
    # For now, just return success

    email_sent = False
    sms_sent = False

    if invite_data.send_email and contact.contact_email:
        # TODO: Send email via SendGrid
        email_sent = True

    if invite_data.send_sms and contact.contact_phone:
        # TODO: Send SMS via Twilio
        sms_sent = True

    return CircleContactInviteResponse(
        success=email_sent or sms_sent,
        message="Verification invite sent" if (email_sent or sms_sent) else "No contact method available",
        email_sent=email_sent,
        sms_sent=sms_sent,
        verification_expires_at=datetime.utcnow()  # TODO: Add proper expiry
    )


@router.get(
    "/relationships/choices",
    summary="Get relationship choices",
    description="Get list of relationship type choices for circle contacts."
)
async def get_relationship_choices():
    """Get the list of relationship type choices."""
    return RELATIONSHIP_CHOICES


def _contact_to_response(
    contact: CircleContact,
    approval_mode: ApprovalMode
) -> CircleContactResponse:
    """Convert CircleContact model to response schema."""
    return CircleContactResponse(
        id=contact.id,
        family_file_id=contact.family_file_id,
        child_id=contact.child_id,
        contact_name=contact.contact_name,
        contact_email=contact.contact_email,
        contact_phone=contact.contact_phone,
        relationship_type=contact.relationship_type,
        photo_url=contact.photo_url,
        notes=contact.notes,
        added_by=contact.added_by,
        approved_by_parent_a_at=contact.approved_by_parent_a_at,
        approved_by_parent_b_at=contact.approved_by_parent_b_at,
        is_fully_approved=contact.is_fully_approved,
        is_partially_approved=contact.is_partially_approved,
        can_communicate=contact.can_communicate(approval_mode),
        is_active=contact.is_active,
        is_verified=contact.is_verified,
        verified_at=contact.verified_at,
        availability_override=contact.availability_override,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )
