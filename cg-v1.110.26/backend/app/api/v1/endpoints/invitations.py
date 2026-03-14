"""
Invitation endpoints for the 5 critical invitation flow fixes.

Fix #1: Attorney-branded emails
Fix #2: Magic link authentication
Fix #3: Single-parent activation
Fix #4: Real-time attorney status
Fix #5: Automated follow-up
"""

from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.invitation import InvitationService

router = APIRouter()


# ==================== Schemas ====================

class SendInvitationRequest(BaseModel):
    """Request to send a case invitation."""
    family_file_id: str
    invitee_email: EmailStr
    invitee_name: Optional[str] = Field(None, max_length=200)
    invitee_phone: Optional[str] = Field(None, max_length=20)
    attorney_name: Optional[str] = Field(None, max_length=200)
    attorney_firm: Optional[str] = Field(None, max_length=200)
    attorney_email: Optional[EmailStr] = None
    parent_role: str = Field(default="parent_b", pattern="^(parent_a|parent_b)$")
    children_names: Optional[List[str]] = None


class InvitationResponse(BaseModel):
    """Response for an invitation."""
    id: str
    invitee_email: str
    invitee_name: Optional[str] = None
    family_file_id: Optional[str] = None
    status: str
    invitation_source: str
    attorney_name: Optional[str] = None
    attorney_firm: Optional[str] = None
    created_at: datetime
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None
    resend_count: int = 0
    can_resend: bool = True

    class Config:
        from_attributes = True


class AcceptInvitationRequest(BaseModel):
    """Request to accept an invitation via token."""
    token: str


class AcceptInvitationResponse(BaseModel):
    """Response after accepting an invitation."""
    status: str  # "activated" or "magic_link_sent"
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_id: Optional[str] = None
    family_file_id: Optional[str] = None


class MagicLinkActivateRequest(BaseModel):
    """Request to complete activation after magic link auth."""
    invitation_token: str
    supabase_user_id: str


class CaseEventResponse(BaseModel):
    """Response for a case event."""
    id: str
    family_file_id: str
    event_type: str
    event_data: Optional[dict] = None
    actor_id: Optional[str] = None
    actor_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class SendGridWebhookEvent(BaseModel):
    """SendGrid webhook event payload."""
    event: str  # delivered, open, click, bounce, dropped
    email: str
    reason: Optional[str] = None
    sg_message_id: Optional[str] = None


# ==================== Endpoints ====================

@router.post("/send", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def send_invitation(
    request: SendInvitationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a case invitation to a parent.

    Supports attorney-branded emails (Fix #1) and generates
    magic link tokens (Fix #2).
    """
    service = InvitationService(db)
    invitation = await service.send_invitation(
        family_file_id=request.family_file_id,
        invitee_email=request.invitee_email,
        invited_by=current_user.id,
        invitee_name=request.invitee_name,
        invitee_phone=request.invitee_phone,
        attorney_name=request.attorney_name,
        attorney_firm=request.attorney_firm,
        attorney_email=request.attorney_email,
        parent_role=request.parent_role,
        children_names=request.children_names,
    )

    return InvitationResponse(
        id=invitation.id,
        invitee_email=invitation.invitee_email,
        invitee_name=invitation.invitee_name,
        family_file_id=invitation.family_file_id,
        status=invitation.status,
        invitation_source=invitation.invitation_source,
        attorney_name=invitation.attorney_name,
        attorney_firm=invitation.attorney_firm,
        created_at=invitation.created_at,
        delivered_at=invitation.delivered_at,
        opened_at=invitation.opened_at,
        clicked_at=invitation.clicked_at,
        activated_at=invitation.activated_at,
        resend_count=invitation.resend_count,
        can_resend=invitation.can_resend,
    )


@router.post("/accept", response_model=AcceptInvitationResponse)
async def accept_invitation(
    request: AcceptInvitationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Accept an invitation via magic link token (Fix #2).

    For new users: sends Supabase magic link email, returns status "magic_link_sent".
    For existing users: activates immediately, returns tokens.
    """
    service = InvitationService(db)
    invitation, user, access_token, refresh_token = await service.accept_invitation(
        token=request.token
    )

    if user is None:
        # New user - magic link sent
        return AcceptInvitationResponse(
            status="magic_link_sent",
            message="A sign-in link has been sent to your email. Click it to complete activation.",
            family_file_id=invitation.family_file_id,
        )

    return AcceptInvitationResponse(
        status="activated",
        message="Invitation accepted. Welcome to CommonGround!",
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        family_file_id=invitation.family_file_id,
    )


@router.post("/activate-magic-link", response_model=AcceptInvitationResponse)
async def activate_magic_link(
    request: MagicLinkActivateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete invitation activation after Supabase magic link auth.

    Called by frontend after user clicks magic link email and
    Supabase auth completes.
    """
    service = InvitationService(db)
    invitation, user, access_token, refresh_token = await service.activate_via_magic_link(
        token=request.invitation_token,
        supabase_user_id=request.supabase_user_id,
    )

    return AcceptInvitationResponse(
        status="activated",
        message="Account created and invitation accepted!",
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        family_file_id=invitation.family_file_id,
    )


@router.post("/{invitation_id}/resend", response_model=InvitationResponse)
async def resend_invitation(
    invitation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resend an invitation email (Fix #5).

    Can be called manually by parent/attorney, or automatically
    by the system after 48 hours.
    """
    service = InvitationService(db)
    invitation = await service.resend_invitation(
        invitation_id=invitation_id,
        resent_by=current_user.id,
    )

    return InvitationResponse(
        id=invitation.id,
        invitee_email=invitation.invitee_email,
        invitee_name=invitation.invitee_name,
        family_file_id=invitation.family_file_id,
        status=invitation.status,
        invitation_source=invitation.invitation_source,
        attorney_name=invitation.attorney_name,
        attorney_firm=invitation.attorney_firm,
        created_at=invitation.created_at,
        delivered_at=invitation.delivered_at,
        opened_at=invitation.opened_at,
        clicked_at=invitation.clicked_at,
        activated_at=invitation.activated_at,
        resend_count=invitation.resend_count,
        can_resend=invitation.can_resend,
    )


@router.get("/family-file/{family_file_id}", response_model=List[InvitationResponse])
async def get_family_file_invitations(
    family_file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all invitations for a family file (Fix #4 - attorney status).

    Returns invitation status progression for the attorney dashboard.
    """
    service = InvitationService(db)
    invitations = await service.get_invitation_status(family_file_id)

    return [
        InvitationResponse(
            id=inv.id,
            invitee_email=inv.invitee_email,
            invitee_name=inv.invitee_name,
            family_file_id=inv.family_file_id,
            status=inv.status,
            invitation_source=inv.invitation_source,
            attorney_name=inv.attorney_name,
            attorney_firm=inv.attorney_firm,
            created_at=inv.created_at,
            delivered_at=inv.delivered_at,
            opened_at=inv.opened_at,
            clicked_at=inv.clicked_at,
            activated_at=inv.activated_at,
            resend_count=inv.resend_count,
            can_resend=inv.can_resend,
        )
        for inv in invitations
    ]


@router.get("/events/{family_file_id}", response_model=List[CaseEventResponse])
async def get_case_events(
    family_file_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get case events for real-time attorney status dashboard (Fix #4).

    Subscribe to this table via Supabase Realtime for live updates.
    """
    service = InvitationService(db)
    events = await service.get_case_events(family_file_id, limit=limit)

    return [
        CaseEventResponse(
            id=event.id,
            family_file_id=event.family_file_id,
            event_type=event.event_type,
            event_data=event.event_data,
            actor_id=event.actor_id,
            actor_type=event.actor_type,
            created_at=event.created_at,
        )
        for event in events
    ]
