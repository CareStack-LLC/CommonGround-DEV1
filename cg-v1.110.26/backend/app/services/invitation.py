"""
Invitation service for managing case invitations with the 5 critical fixes:
1. Attorney-branded emails (From Name shows attorney)
2. Magic link auth (one-tap activation, no password needed)
3. Single-parent activation (unlock features before co-parent joins)
4. Real-time attorney status (case events via Supabase Realtime)
5. Automated follow-up (48-hour resend, 72-hour attorney alert)
"""

import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.invitation import (
    CaseInvitation,
    CaseEvent,
    CaseEventType,
    InvitationSource,
    InvitationStatus,
)
from app.models.family_file import FamilyFile
from app.models.user import User, UserProfile
from app.services.email import EmailService

logger = logging.getLogger(__name__)

# Token expiry: 7 days
INVITATION_TOKEN_EXPIRY_DAYS = 7
# Auto-resend after 48 hours
AUTO_RESEND_HOURS = 48
# Alert attorney after 72 hours
ATTORNEY_ALERT_HOURS = 72


class InvitationService:
    """Service for managing case invitations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()

    def _generate_token(self) -> str:
        """Generate a cryptographically secure invitation token."""
        return secrets.token_urlsafe(48)

    async def _create_case_event(
        self,
        family_file_id: str,
        event_type: str,
        actor_id: Optional[str] = None,
        actor_type: str = "system",
        invitation_id: Optional[str] = None,
        event_data: Optional[dict] = None,
    ) -> CaseEvent:
        """Create a case event for real-time attorney status (Fix #4)."""
        event = CaseEvent(
            family_file_id=family_file_id,
            event_type=event_type,
            actor_id=actor_id,
            actor_type=actor_type,
            invitation_id=invitation_id,
            event_data=event_data or {},
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def send_invitation(
        self,
        family_file_id: str,
        invitee_email: str,
        invited_by: str,
        invitee_name: Optional[str] = None,
        invitee_phone: Optional[str] = None,
        attorney_name: Optional[str] = None,
        attorney_firm: Optional[str] = None,
        attorney_email: Optional[str] = None,
        parent_role: str = "parent_b",
        children_names: Optional[list] = None,
        delay_hours: Optional[int] = None,
    ) -> CaseInvitation:
        """
        Send a case invitation to a parent.

        Creates the invitation record, generates a magic link token,
        and sends an attorney-branded email.
        """
        # Verify family file exists
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Family file not found"
            )

        # Get inviter info
        result = await self.db.execute(
            select(User).where(User.id == invited_by)
        )
        inviter = result.scalar_one_or_none()
        if not inviter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inviter not found"
            )

        # Check for existing active invitation to same email for same family file
        result = await self.db.execute(
            select(CaseInvitation).where(
                and_(
                    CaseInvitation.invitee_email == invitee_email,
                    CaseInvitation.family_file_id == family_file_id,
                    CaseInvitation.status.not_in([
                        InvitationStatus.EXPIRED.value,
                        InvitationStatus.BOUNCED.value,
                    ]),
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing and existing.status == InvitationStatus.ACTIVATED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email has already accepted an invitation for this family file"
            )

        # Generate secure token
        token = self._generate_token()
        token_expires = datetime.utcnow() + timedelta(days=INVITATION_TOKEN_EXPIRY_DAYS)

        # Determine invitation source
        source = InvitationSource.ATTORNEY.value if attorney_name else InvitationSource.PARENT.value

        # Create invitation record
        is_delayed = delay_hours is not None and delay_hours > 0
        invitation = CaseInvitation(
            invitee_email=invitee_email,
            invitee_name=invitee_name,
            invitee_phone=invitee_phone,
            family_file_id=family_file_id,
            invited_by=invited_by,
            invitation_source=source,
            attorney_name=attorney_name,
            attorney_firm=attorney_firm,
            attorney_email=attorney_email,
            token=token,
            token_expires_at=token_expires,
            status=InvitationStatus.PENDING.value,
            parent_role=parent_role,
            send_delayed=is_delayed,
            scheduled_send_at=(
                datetime.utcnow() + timedelta(hours=delay_hours)
                if is_delayed else None
            ),
        )
        self.db.add(invitation)
        await self.db.flush()

        # Update family file with invited email
        if parent_role == "parent_b" and not family_file.parent_b_email:
            family_file.parent_b_email = invitee_email
            family_file.parent_b_invited_at = datetime.utcnow()

        # Build magic link URL
        magic_link = f"{settings.FRONTEND_URL}/accept-invitation?token={token}"

        # Send attorney-branded email (Fix #1) — skip if delayed
        from_name = f"{attorney_name} via CommonGround" if attorney_name else "CommonGround"
        inviter_display = attorney_name or f"{inviter.first_name} {inviter.last_name}"

        if not is_delayed:
            try:
                sendgrid_msg_id = await self.email_service.send_attorney_case_invitation(
                    to_email=invitee_email,
                    to_name=invitee_name or invitee_email.split("@")[0],
                    inviter_name=inviter_display,
                    family_file_title=family_file.title,
                    magic_link=magic_link,
                    children_names=children_names or [],
                    attorney_name=attorney_name,
                    attorney_firm=attorney_firm,
                    from_name_override=from_name,
                )

                invitation.status = InvitationStatus.SENT.value
                if sendgrid_msg_id:
                    invitation.sendgrid_message_id = sendgrid_msg_id

            except Exception as e:
                logger.error(f"Failed to send invitation email: {e}")
                # Don't fail the invitation creation, just log the error
        else:
            logger.info(
                f"Invitation {invitation.id} scheduled for delayed send at "
                f"{invitation.scheduled_send_at}"
            )

        # Create case event (Fix #4)
        await self._create_case_event(
            family_file_id=family_file_id,
            event_type=CaseEventType.INVITATION_SENT.value,
            actor_id=invited_by,
            actor_type="attorney" if attorney_name else "parent",
            invitation_id=invitation.id,
            event_data={
                "invitee_email": invitee_email,
                "invitee_name": invitee_name,
                "sent_by": inviter_display,
            },
        )

        await self.db.commit()
        await self.db.refresh(invitation)

        logger.info(f"Invitation sent to {invitee_email} for family file {family_file_id}")
        return invitation

    async def accept_invitation(
        self, token: str
    ) -> Tuple[CaseInvitation, User, str, str]:
        """
        Accept an invitation via magic link token (Fix #2).

        If the user doesn't exist, creates a new account via Supabase magic link.
        If they do exist, logs them in and activates the invitation.

        Returns:
            Tuple of (invitation, user, access_token, refresh_token)
        """
        # Find the invitation by token
        result = await self.db.execute(
            select(CaseInvitation).where(CaseInvitation.token == token)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token"
            )

        if invitation.is_expired:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This invitation has expired. Please request a new one."
            )

        if invitation.status == InvitationStatus.ACTIVATED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation has already been accepted"
            )

        # Check if user already exists
        result = await self.db.execute(
            select(User).where(User.email == invitation.invitee_email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            user = existing_user
            # Ensure profile exists
            result = await self.db.execute(
                select(UserProfile).where(UserProfile.user_id == user.id)
            )
            profile = result.scalar_one_or_none()
            if not profile:
                profile = UserProfile(
                    user_id=user.id,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    subscription_tier="web_starter",
                    subscription_status="active",
                )
                self.db.add(profile)
        else:
            # Create user via Supabase magic link
            from app.core.supabase import get_supabase_client
            supabase = get_supabase_client()

            # Send magic link to create account
            try:
                auth_response = supabase.auth.sign_in_with_otp({
                    "email": invitation.invitee_email,
                    "options": {
                        "data": {
                            "first_name": invitation.invitee_name or invitation.invitee_email.split("@")[0],
                            "last_name": "",
                            "invitation_token": token,
                        },
                        "should_create_user": True,
                    }
                })
            except Exception as e:
                logger.error(f"Supabase magic link failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send authentication email"
                )

            # Mark invitation as clicked (user will complete via magic link email)
            invitation.status = InvitationStatus.CLICKED.value
            invitation.clicked_at = datetime.utcnow()

            await self._create_case_event(
                family_file_id=invitation.family_file_id,
                event_type=CaseEventType.INVITATION_CLICKED.value,
                invitation_id=invitation.id,
                event_data={"invitee_email": invitation.invitee_email},
            )

            await self.db.commit()
            await self.db.refresh(invitation)

            # Return invitation without user/tokens - user needs to click magic link
            return invitation, None, None, None

        # For existing users: activate immediately
        return await self._activate_invitation(invitation, user)

    async def activate_via_magic_link(
        self, token: str, supabase_user_id: str
    ) -> Tuple[CaseInvitation, User, str, str]:
        """
        Complete invitation activation after magic link auth.

        Called when user clicks the Supabase magic link email and
        authenticates successfully.
        """
        # Find invitation
        result = await self.db.execute(
            select(CaseInvitation).where(CaseInvitation.token == token)
        )
        invitation = result.scalar_one_or_none()
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token"
            )

        # Find or create user with Supabase ID
        result = await self.db.execute(
            select(User).where(User.supabase_id == supabase_user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            # Create local user record
            name = invitation.invitee_name or invitation.invitee_email.split("@")[0]
            user = User(
                id=supabase_user_id,
                supabase_id=supabase_user_id,
                email=invitation.invitee_email,
                email_verified=True,
                first_name=name,
                last_name="",
                is_active=True,
            )
            self.db.add(user)
            await self.db.flush()

            # Create Stripe customer
            from app.services.stripe_service import StripeService
            stripe_service = StripeService()
            stripe_customer = await stripe_service.create_customer(
                email=invitation.invitee_email,
                name=name,
                user_id=user.id,
            )

            # Create profile
            profile = UserProfile(
                user_id=user.id,
                first_name=name,
                last_name="",
                stripe_customer_id=stripe_customer["id"],
                subscription_tier="web_starter",
                subscription_status="active",
            )
            self.db.add(profile)

            # Create case event
            await self._create_case_event(
                family_file_id=invitation.family_file_id,
                event_type=CaseEventType.CLIENT_REGISTERED.value,
                actor_id=user.id,
                actor_type="parent",
                invitation_id=invitation.id,
                event_data={"user_email": invitation.invitee_email},
            )

        return await self._activate_invitation(invitation, user)

    async def _activate_invitation(
        self, invitation: CaseInvitation, user: User
    ) -> Tuple[CaseInvitation, User, str, str]:
        """Activate an invitation and link user to family file."""
        from app.core.security import create_access_token, create_refresh_token

        # Update invitation status
        invitation.status = InvitationStatus.ACTIVATED.value
        invitation.activated_at = datetime.utcnow()
        invitation.activated_user_id = user.id

        # Link user to family file (Fix #3 - single parent already active)
        if invitation.family_file_id:
            result = await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == invitation.family_file_id)
            )
            family_file = result.scalar_one_or_none()

            if family_file:
                if invitation.parent_role == "parent_b":
                    family_file.parent_b_id = user.id
                    family_file.parent_b_joined_at = datetime.utcnow()
                elif invitation.parent_role == "parent_a":
                    family_file.parent_a_id = user.id

                # Check if both parents are now active
                both_active = (
                    family_file.parent_a_id is not None
                    and family_file.parent_b_id is not None
                )

                # Create activation event
                await self._create_case_event(
                    family_file_id=family_file.id,
                    event_type=CaseEventType.CLIENT_ACTIVATED.value,
                    actor_id=user.id,
                    actor_type="parent",
                    invitation_id=invitation.id,
                    event_data={
                        "user_email": user.email,
                        "parent_role": invitation.parent_role,
                        "both_parents_active": both_active,
                    },
                )

                if both_active:
                    await self._create_case_event(
                        family_file_id=family_file.id,
                        event_type=CaseEventType.BOTH_PARENTS_ACTIVE.value,
                        actor_id=user.id,
                        actor_type="system",
                        event_data={
                            "parent_a_id": family_file.parent_a_id,
                            "parent_b_id": family_file.parent_b_id,
                        },
                    )

        # Update last login
        user.last_login = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(invitation)
        await self.db.refresh(user)

        # Generate JWT tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        logger.info(f"Invitation activated for {user.email}")
        return invitation, user, access_token, refresh_token

    async def handle_sendgrid_webhook(self, event_type: str, email: str, **kwargs) -> None:
        """
        Handle SendGrid webhook events for delivery tracking (Fix #5).

        Events: delivered, open, click, bounce, dropped
        """
        # Find invitation by email (most recent)
        result = await self.db.execute(
            select(CaseInvitation)
            .where(CaseInvitation.invitee_email == email)
            .order_by(CaseInvitation.created_at.desc())
        )
        invitation = result.scalars().first()

        if not invitation:
            logger.warning(f"No invitation found for SendGrid event: {email}")
            return

        now = datetime.utcnow()
        case_event_type = None

        if event_type == "delivered":
            invitation.status = InvitationStatus.DELIVERED.value
            invitation.delivered_at = now
            case_event_type = CaseEventType.INVITATION_DELIVERED.value

        elif event_type == "open":
            if invitation.status != InvitationStatus.ACTIVATED.value:
                invitation.status = InvitationStatus.OPENED.value
            invitation.opened_at = now
            case_event_type = CaseEventType.INVITATION_OPENED.value

        elif event_type == "click":
            if invitation.status not in [InvitationStatus.ACTIVATED.value]:
                invitation.status = InvitationStatus.CLICKED.value
            invitation.clicked_at = now
            case_event_type = CaseEventType.INVITATION_CLICKED.value

        elif event_type in ("bounce", "dropped"):
            invitation.status = InvitationStatus.BOUNCED.value
            invitation.bounced_at = now
            invitation.bounce_reason = kwargs.get("reason", "Unknown")
            invitation.auto_resend_enabled = False
            case_event_type = CaseEventType.INVITATION_BOUNCED.value

        # Create case event for attorney dashboard
        if case_event_type and invitation.family_file_id:
            await self._create_case_event(
                family_file_id=invitation.family_file_id,
                event_type=case_event_type,
                invitation_id=invitation.id,
                event_data={
                    "invitee_email": email,
                    "sendgrid_event": event_type,
                },
            )

        await self.db.commit()

    async def resend_invitation(self, invitation_id: str, resent_by: str) -> CaseInvitation:
        """
        Resend an invitation email (manual or automated).
        """
        result = await self.db.execute(
            select(CaseInvitation).where(CaseInvitation.id == invitation_id)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )

        if not invitation.can_resend:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation cannot be resent"
            )

        # Generate new token (invalidate old one)
        invitation.token = self._generate_token()
        invitation.token_expires_at = datetime.utcnow() + timedelta(days=INVITATION_TOKEN_EXPIRY_DAYS)
        invitation.resend_count += 1
        invitation.last_resent_at = datetime.utcnow()
        invitation.status = InvitationStatus.PENDING.value

        # Get family file for title
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == invitation.family_file_id)
        )
        family_file = result.scalar_one_or_none()

        # Resend email
        magic_link = f"{settings.FRONTEND_URL}/accept-invitation?token={invitation.token}"
        from_name = f"{invitation.attorney_name} via CommonGround" if invitation.attorney_name else "CommonGround"
        inviter_display = invitation.attorney_name or "CommonGround"

        try:
            await self.email_service.send_attorney_case_invitation(
                to_email=invitation.invitee_email,
                to_name=invitation.invitee_name or invitation.invitee_email.split("@")[0],
                inviter_name=inviter_display,
                family_file_title=family_file.title if family_file else "Your Family",
                magic_link=magic_link,
                children_names=[],
                attorney_name=invitation.attorney_name,
                attorney_firm=invitation.attorney_firm,
                from_name_override=from_name,
                is_resend=True,
            )
            invitation.status = InvitationStatus.RESENT.value
        except Exception as e:
            logger.error(f"Failed to resend invitation: {e}")

        # Create case event
        if invitation.family_file_id:
            await self._create_case_event(
                family_file_id=invitation.family_file_id,
                event_type=CaseEventType.INVITATION_RESENT.value,
                actor_id=resent_by,
                invitation_id=invitation.id,
                event_data={
                    "invitee_email": invitation.invitee_email,
                    "resend_count": invitation.resend_count,
                },
            )

        await self.db.commit()
        await self.db.refresh(invitation)
        return invitation

    async def get_pending_resends(self) -> list:
        """
        Get invitations that need automated resending (Fix #5).

        Auto-resend at 48 hours if not activated.
        """
        cutoff = datetime.utcnow() - timedelta(hours=AUTO_RESEND_HOURS)

        result = await self.db.execute(
            select(CaseInvitation).where(
                and_(
                    CaseInvitation.auto_resend_enabled == True,
                    CaseInvitation.status.in_([
                        InvitationStatus.SENT.value,
                        InvitationStatus.DELIVERED.value,
                    ]),
                    CaseInvitation.created_at <= cutoff,
                    CaseInvitation.resend_count < 3,
                )
            )
        )
        return list(result.scalars().all())

    async def get_pending_delayed_sends(self) -> list:
        """
        Get invitations that were created with a delay and are now ready to send.

        Returns invitations where scheduled_send_at has passed but email
        hasn't been sent yet (status still PENDING + send_delayed=True).
        """
        now = datetime.utcnow()
        result = await self.db.execute(
            select(CaseInvitation).where(
                and_(
                    CaseInvitation.send_delayed == True,
                    CaseInvitation.status == InvitationStatus.PENDING.value,
                    CaseInvitation.scheduled_send_at <= now,
                )
            )
        )
        return list(result.scalars().all())

    async def process_delayed_send(self, invitation: CaseInvitation) -> CaseInvitation:
        """
        Send a previously delayed invitation now that its scheduled time has passed.
        """
        from app.core.config import settings

        magic_link = f"{settings.FRONTEND_URL}/accept-invitation?token={invitation.token}"
        from_name = (
            f"{invitation.attorney_name} via CommonGround"
            if invitation.attorney_name
            else "CommonGround"
        )
        inviter_display = invitation.attorney_name or "CommonGround"

        # Look up family file for title
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == invitation.family_file_id)
        )
        family_file = result.scalar_one_or_none()

        try:
            sendgrid_msg_id = await self.email_service.send_attorney_case_invitation(
                to_email=invitation.invitee_email,
                to_name=invitation.invitee_name or invitation.invitee_email.split("@")[0],
                inviter_name=inviter_display,
                family_file_title=family_file.title if family_file else "Your Family File",
                magic_link=magic_link,
                children_names=[],
                attorney_name=invitation.attorney_name,
                attorney_firm=invitation.attorney_firm,
                from_name_override=from_name,
            )

            invitation.status = InvitationStatus.SENT.value
            invitation.send_delayed = False
            if sendgrid_msg_id:
                invitation.sendgrid_message_id = sendgrid_msg_id

            await self.db.commit()
            await self.db.refresh(invitation)

        except Exception as e:
            logger.error(f"Failed to send delayed invitation {invitation.id}: {e}")

        return invitation

    async def get_invitation_status(self, family_file_id: str) -> list:
        """Get all invitations for a family file with status."""
        result = await self.db.execute(
            select(CaseInvitation)
            .where(CaseInvitation.family_file_id == family_file_id)
            .order_by(CaseInvitation.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_case_events(self, family_file_id: str, limit: int = 50) -> list:
        """Get case events for real-time attorney dashboard (Fix #4)."""
        result = await self.db.execute(
            select(CaseEvent)
            .where(CaseEvent.family_file_id == family_file_id)
            .order_by(CaseEvent.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
