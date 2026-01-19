"""
Firm service layer.

Business logic for firm management and membership operations.
"""

import re
import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    Firm,
    FirmMembership,
    ProfessionalProfile,
    FirmType,
    FirmRole,
    MembershipStatus,
    generate_firm_slug,
    generate_invite_token,
)
from app.models.user import User
from app.schemas.professional import (
    FirmCreate,
    FirmUpdate,
    FirmMemberInvite,
    FirmMembershipUpdate,
)


# =============================================================================
# Firm Service
# =============================================================================

class FirmService:
    """Service for managing firms and memberships."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Firm CRUD
    # -------------------------------------------------------------------------

    async def create_firm(
        self,
        user_id: str,
        professional_id: str,
        data: FirmCreate,
    ) -> Firm:
        """
        Create a new firm and add the creator as owner.

        Args:
            user_id: The user creating the firm
            professional_id: The professional profile ID of the creator
            data: Firm creation data

        Returns:
            The created firm
        """
        # Generate unique slug
        base_slug = generate_firm_slug(data.name)
        slug = base_slug
        counter = 1

        while await self._slug_exists(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        firm = Firm(
            id=str(uuid4()),
            name=data.name,
            slug=slug,
            firm_type=data.firm_type.value,
            email=data.email,
            phone=data.phone,
            website=data.website,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            zip_code=data.zip_code,
            is_public=data.is_public,
            settings=data.settings or {},
            created_by=user_id,
        )

        self.db.add(firm)
        await self.db.flush()

        # Add creator as owner
        membership = FirmMembership(
            id=str(uuid4()),
            professional_id=professional_id,
            firm_id=firm.id,
            role=FirmRole.OWNER.value,
            status=MembershipStatus.ACTIVE.value,
            joined_at=datetime.utcnow(),
            invited_by=user_id,
        )

        self.db.add(membership)
        await self.db.commit()
        await self.db.refresh(firm)

        return firm

    async def get_firm(self, firm_id: str) -> Optional[Firm]:
        """Get a firm by ID."""
        result = await self.db.execute(
            select(Firm).where(Firm.id == firm_id)
        )
        return result.scalar_one_or_none()

    async def get_firm_by_slug(self, slug: str) -> Optional[Firm]:
        """Get a firm by slug (for directory)."""
        result = await self.db.execute(
            select(Firm).where(Firm.slug == slug)
        )
        return result.scalar_one_or_none()

    async def update_firm(
        self,
        firm_id: str,
        data: FirmUpdate,
    ) -> Optional[Firm]:
        """Update a firm."""
        firm = await self.get_firm(firm_id)
        if not firm:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "firm_type" and value:
                value = value.value
            setattr(firm, key, value)

        firm.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(firm)
        return firm

    async def deactivate_firm(self, firm_id: str) -> Optional[Firm]:
        """Deactivate a firm (soft delete)."""
        firm = await self.get_firm(firm_id)
        if not firm:
            return None

        firm.is_active = False
        firm.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(firm)
        return firm

    async def list_firms_for_professional(
        self,
        professional_id: str,
        include_inactive: bool = False,
    ) -> list[Firm]:
        """List all firms a professional belongs to."""
        query = (
            select(Firm)
            .join(FirmMembership, FirmMembership.firm_id == Firm.id)
            .where(
                and_(
                    FirmMembership.professional_id == professional_id,
                    FirmMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
        )

        if not include_inactive:
            query = query.where(Firm.is_active == True)

        query = query.order_by(Firm.name)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_public_firms(
        self,
        query: Optional[str] = None,
        state: Optional[str] = None,
        firm_type: Optional[FirmType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Firm]:
        """Search public firms for directory listing."""
        stmt = select(Firm).where(
            and_(
                Firm.is_public == True,
                Firm.is_active == True,
            )
        )

        if query:
            search_term = f"%{query}%"
            stmt = stmt.where(
                or_(
                    Firm.name.ilike(search_term),
                    Firm.city.ilike(search_term),
                )
            )

        if state:
            stmt = stmt.where(Firm.state == state.upper())

        if firm_type:
            stmt = stmt.where(Firm.firm_type == firm_type.value)

        stmt = stmt.order_by(Firm.name).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def search_public_firms_with_count(
        self,
        query: Optional[str] = None,
        state: Optional[str] = None,
        firm_type: Optional[FirmType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Firm], int]:
        """Search public firms with total count and professional counts."""
        # Build base condition
        base_condition = and_(
            Firm.is_public == True,
            Firm.is_active == True,
        )

        # Build filters
        filters = [base_condition]
        if query:
            search_term = f"%{query}%"
            filters.append(
                or_(
                    Firm.name.ilike(search_term),
                    Firm.city.ilike(search_term),
                )
            )
        if state:
            filters.append(Firm.state == state.upper())
        if firm_type:
            filters.append(Firm.firm_type == firm_type.value)

        # Get total count
        count_stmt = select(func.count(Firm.id)).where(and_(*filters))
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0

        # Get firms with member counts
        stmt = (
            select(
                Firm,
                func.count(FirmMembership.id).label('professional_count')
            )
            .outerjoin(
                FirmMembership,
                and_(
                    FirmMembership.firm_id == Firm.id,
                    FirmMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
            .where(and_(*filters))
            .group_by(Firm.id)
            .order_by(Firm.name)
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        # Attach professional_count to each firm object
        firms = []
        for row in rows:
            firm = row[0]
            firm.professional_count = row[1]
            firms.append(firm)

        return firms, total

    async def get_firm_member_count(self, firm_id: str) -> int:
        """Get the number of active members in a firm."""
        result = await self.db.execute(
            select(func.count(FirmMembership.id)).where(
                and_(
                    FirmMembership.firm_id == firm_id,
                    FirmMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
        )
        return result.scalar() or 0

    # -------------------------------------------------------------------------
    # Membership Management
    # -------------------------------------------------------------------------

    async def invite_member(
        self,
        firm_id: str,
        inviter_user_id: str,
        data: FirmMemberInvite,
    ) -> FirmMembership:
        """
        Invite a member to a firm by email.

        If the email belongs to an existing professional, link them.
        Otherwise, create a pending invitation that can be accepted when they onboard.
        """
        # Check if professional exists with this email
        professional = await self._get_professional_by_email(data.email)

        # Check if already a member
        if professional:
            existing = await self._get_membership(professional.id, firm_id)
            if existing:
                if existing.status == MembershipStatus.ACTIVE.value:
                    raise ValueError("User is already an active member of this firm")
                elif existing.status == MembershipStatus.INVITED.value:
                    # Resend invite
                    existing.invite_token = generate_invite_token()
                    existing.invite_expires_at = datetime.utcnow() + timedelta(days=7)
                    existing.updated_at = datetime.utcnow()
                    await self.db.commit()
                    await self.db.refresh(existing)
                    return existing

        membership = FirmMembership(
            id=str(uuid4()),
            professional_id=professional.id if professional else None,
            firm_id=firm_id,
            role=data.role.value,
            custom_permissions=data.custom_permissions,
            status=MembershipStatus.INVITED.value,
            invited_by=inviter_user_id,
            invited_at=datetime.utcnow(),
            invite_token=generate_invite_token(),
            invite_expires_at=datetime.utcnow() + timedelta(days=7),
            invite_email=data.email if not professional else None,
        )

        self.db.add(membership)
        await self.db.commit()
        await self.db.refresh(membership)

        return membership

    async def accept_invite(
        self,
        invite_token: str,
        professional_id: str,
    ) -> Optional[FirmMembership]:
        """Accept a firm membership invitation."""
        result = await self.db.execute(
            select(FirmMembership).where(
                and_(
                    FirmMembership.invite_token == invite_token,
                    FirmMembership.status == MembershipStatus.INVITED.value,
                )
            )
        )
        membership = result.scalar_one_or_none()

        if not membership:
            return None

        # Check expiry
        if membership.invite_expires_at and datetime.utcnow() > membership.invite_expires_at:
            return None

        # Link professional if not already linked
        if not membership.professional_id:
            membership.professional_id = professional_id
        elif membership.professional_id != professional_id:
            raise ValueError("Invitation was sent to a different professional")

        membership.status = MembershipStatus.ACTIVE.value
        membership.joined_at = datetime.utcnow()
        membership.invite_token = None
        membership.invite_expires_at = None
        membership.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def accept_invite_by_id(
        self,
        membership_id: str,
        professional_id: str,
    ) -> Optional[FirmMembership]:
        """Accept a firm membership invitation by membership ID."""
        result = await self.db.execute(
            select(FirmMembership).where(
                and_(
                    FirmMembership.id == membership_id,
                    FirmMembership.status == MembershipStatus.INVITED.value,
                )
            )
        )
        membership = result.scalar_one_or_none()

        if not membership:
            return None

        # Check expiry
        if membership.invite_expires_at and datetime.utcnow() > membership.invite_expires_at:
            return None

        # Link or verify professional
        if not membership.professional_id:
            membership.professional_id = professional_id
        elif membership.professional_id != professional_id:
            raise ValueError("Invitation was sent to a different professional")

        membership.status = MembershipStatus.ACTIVE.value
        membership.joined_at = datetime.utcnow()
        membership.invite_token = None
        membership.invite_expires_at = None
        membership.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def update_membership(
        self,
        membership_id: str,
        data: FirmMembershipUpdate,
    ) -> Optional[FirmMembership]:
        """Update a membership role or permissions."""
        result = await self.db.execute(
            select(FirmMembership).where(FirmMembership.id == membership_id)
        )
        membership = result.scalar_one_or_none()

        if not membership:
            return None

        if data.role:
            membership.role = data.role.value
        if data.custom_permissions is not None:
            membership.custom_permissions = data.custom_permissions

        membership.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def remove_member(
        self,
        membership_id: str,
    ) -> Optional[FirmMembership]:
        """Remove a member from a firm."""
        result = await self.db.execute(
            select(FirmMembership).where(FirmMembership.id == membership_id)
        )
        membership = result.scalar_one_or_none()

        if not membership:
            return None

        # Don't allow removing the last owner
        if membership.role == FirmRole.OWNER.value:
            owner_count = await self._count_owners(membership.firm_id)
            if owner_count <= 1:
                raise ValueError("Cannot remove the last owner of a firm")

        membership.status = MembershipStatus.REMOVED.value
        membership.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def resend_invite(
        self,
        membership_id: str,
    ) -> Optional[FirmMembership]:
        """Resend an invitation (generate new token)."""
        result = await self.db.execute(
            select(FirmMembership).where(
                and_(
                    FirmMembership.id == membership_id,
                    FirmMembership.status == MembershipStatus.INVITED.value,
                )
            )
        )
        membership = result.scalar_one_or_none()

        if not membership:
            return None

        membership.invite_token = generate_invite_token()
        membership.invite_expires_at = datetime.utcnow() + timedelta(days=7)
        membership.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def list_firm_members(
        self,
        firm_id: str,
        include_invited: bool = True,
    ) -> list[FirmMembership]:
        """List all members of a firm."""
        query = (
            select(FirmMembership)
            .options(selectinload(FirmMembership.professional))
            .where(FirmMembership.firm_id == firm_id)
        )

        if include_invited:
            query = query.where(
                FirmMembership.status.in_([
                    MembershipStatus.ACTIVE.value,
                    MembershipStatus.INVITED.value,
                ])
            )
        else:
            query = query.where(FirmMembership.status == MembershipStatus.ACTIVE.value)

        query = query.order_by(FirmMembership.joined_at.desc().nullsfirst())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_membership(
        self,
        professional_id: str,
        firm_id: str,
    ) -> Optional[FirmMembership]:
        """Get a specific membership."""
        return await self._get_membership(professional_id, firm_id)

    async def get_pending_invites_for_email(
        self,
        email: str,
    ) -> list[FirmMembership]:
        """Get pending invites for an email (for onboarding flow)."""
        result = await self.db.execute(
            select(FirmMembership)
            .options(selectinload(FirmMembership.firm))
            .where(
                and_(
                    FirmMembership.invite_email == email,
                    FirmMembership.status == MembershipStatus.INVITED.value,
                    or_(
                        FirmMembership.invite_expires_at.is_(None),
                        FirmMembership.invite_expires_at > datetime.utcnow(),
                    ),
                )
            )
        )
        return list(result.scalars().all())

    # -------------------------------------------------------------------------
    # Authorization Helpers
    # -------------------------------------------------------------------------

    async def can_manage_firm(
        self,
        professional_id: str,
        firm_id: str,
    ) -> bool:
        """Check if a professional can manage a firm (owner or admin)."""
        membership = await self._get_membership(professional_id, firm_id)
        if not membership or membership.status != MembershipStatus.ACTIVE.value:
            return False
        return membership.role in [FirmRole.OWNER.value, FirmRole.ADMIN.value]

    async def can_invite_members(
        self,
        professional_id: str,
        firm_id: str,
    ) -> bool:
        """Check if a professional can invite members to a firm."""
        membership = await self._get_membership(professional_id, firm_id)
        if not membership or membership.status != MembershipStatus.ACTIVE.value:
            return False
        return membership.role in [
            FirmRole.OWNER.value,
            FirmRole.ADMIN.value,
            FirmRole.ATTORNEY.value,
        ]

    async def is_firm_member(
        self,
        professional_id: str,
        firm_id: str,
    ) -> bool:
        """Check if a professional is an active member of a firm."""
        membership = await self._get_membership(professional_id, firm_id)
        return membership is not None and membership.status == MembershipStatus.ACTIVE.value

    # -------------------------------------------------------------------------
    # Private Helpers
    # -------------------------------------------------------------------------

    async def _slug_exists(self, slug: str) -> bool:
        """Check if a firm slug already exists."""
        result = await self.db.execute(
            select(func.count(Firm.id)).where(Firm.slug == slug)
        )
        return (result.scalar() or 0) > 0

    async def _get_professional_by_email(
        self,
        email: str,
    ) -> Optional[ProfessionalProfile]:
        """Get a professional profile by their user email."""
        result = await self.db.execute(
            select(ProfessionalProfile)
            .join(User, User.id == ProfessionalProfile.user_id)
            .where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def _get_membership(
        self,
        professional_id: str,
        firm_id: str,
    ) -> Optional[FirmMembership]:
        """Get a membership by professional and firm."""
        result = await self.db.execute(
            select(FirmMembership).where(
                and_(
                    FirmMembership.professional_id == professional_id,
                    FirmMembership.firm_id == firm_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _count_owners(self, firm_id: str) -> int:
        """Count active owners of a firm."""
        result = await self.db.execute(
            select(func.count(FirmMembership.id)).where(
                and_(
                    FirmMembership.firm_id == firm_id,
                    FirmMembership.role == FirmRole.OWNER.value,
                    FirmMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
        )
        return result.scalar() or 0
