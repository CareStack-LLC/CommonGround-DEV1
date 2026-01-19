"""
Firm Service Unit Tests.

Tests for firm creation, membership management, and authorization.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.professional.firm_service import FirmService
from app.models.professional import (
    Firm,
    FirmMembership,
    FirmType,
    FirmRole,
    MembershipStatus,
)
from app.schemas.professional import (
    FirmCreate,
    FirmUpdate,
    FirmMemberInvite,
    FirmMembershipUpdate,
)


# =============================================================================
# Firm CRUD Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestFirmCRUD:
    """Tests for firm CRUD operations."""

    async def test_create_firm(self, db: AsyncSession, test_user, test_profile):
        """Test creating a new firm."""
        service = FirmService(db)

        firm_data = FirmCreate(
            name="Test Law Firm",
            firm_type=FirmType.LAW_FIRM,
            email="test@testlaw.com",
            state="CA",
            is_public=True,
        )

        firm = await service.create_firm(
            user_id=test_user.id,
            professional_id=test_profile.id,
            data=firm_data,
        )

        assert firm is not None
        assert firm.name == "Test Law Firm"
        assert firm.slug == "test-law-firm"
        assert firm.firm_type == FirmType.LAW_FIRM.value
        assert firm.email == "test@testlaw.com"
        assert firm.is_active is True
        assert firm.created_by == test_user.id

    async def test_create_firm_generates_unique_slug(
        self, db: AsyncSession, test_user, test_profile
    ):
        """Test that duplicate firm names get unique slugs."""
        service = FirmService(db)

        # Create first firm
        firm1 = await service.create_firm(
            user_id=test_user.id,
            professional_id=test_profile.id,
            data=FirmCreate(
                name="Unique Firm",
                firm_type=FirmType.LAW_FIRM,
                email="unique1@test.com",
                state="CA",
            ),
        )

        # Create second firm with same name
        firm2 = await service.create_firm(
            user_id=test_user.id,
            professional_id=test_profile.id,
            data=FirmCreate(
                name="Unique Firm",
                firm_type=FirmType.LAW_FIRM,
                email="unique2@test.com",
                state="CA",
            ),
        )

        assert firm1.slug == "unique-firm"
        assert firm2.slug == "unique-firm-1"

    async def test_create_firm_adds_creator_as_owner(
        self, db: AsyncSession, test_user, test_profile
    ):
        """Test that creating a firm adds the creator as owner."""
        service = FirmService(db)

        firm = await service.create_firm(
            user_id=test_user.id,
            professional_id=test_profile.id,
            data=FirmCreate(
                name="Owner Test Firm",
                firm_type=FirmType.SOLO_PRACTICE,
                email="owner@test.com",
                state="NY",
            ),
        )

        # Check membership was created
        members = await service.list_firm_members(firm.id)
        assert len(members) == 1
        assert members[0].professional_id == test_profile.id
        assert members[0].role == FirmRole.OWNER.value
        assert members[0].status == MembershipStatus.ACTIVE.value

    async def test_get_firm(self, db: AsyncSession, test_firm):
        """Test getting a firm by ID."""
        service = FirmService(db)

        firm = await service.get_firm(test_firm.id)

        assert firm is not None
        assert firm.id == test_firm.id
        assert firm.name == test_firm.name

    async def test_get_firm_not_found(self, db: AsyncSession):
        """Test getting a non-existent firm returns None."""
        service = FirmService(db)

        firm = await service.get_firm(str(uuid4()))

        assert firm is None

    async def test_get_firm_by_slug(self, db: AsyncSession, test_firm):
        """Test getting a firm by slug."""
        service = FirmService(db)

        firm = await service.get_firm_by_slug(test_firm.slug)

        assert firm is not None
        assert firm.id == test_firm.id

    async def test_update_firm(self, db: AsyncSession, test_firm):
        """Test updating a firm."""
        service = FirmService(db)

        update_data = FirmUpdate(
            name="Updated Firm Name",
            phone="555-999-8888",
            website="https://updatedfirm.com",
        )

        updated = await service.update_firm(test_firm.id, update_data)

        assert updated is not None
        assert updated.name == "Updated Firm Name"
        assert updated.phone == "555-999-8888"
        assert updated.website == "https://updatedfirm.com"
        # Original values preserved
        assert updated.email == test_firm.email

    async def test_deactivate_firm(self, db: AsyncSession, test_firm):
        """Test deactivating a firm."""
        service = FirmService(db)

        deactivated = await service.deactivate_firm(test_firm.id)

        assert deactivated is not None
        assert deactivated.is_active is False

    async def test_list_firms_for_professional(
        self, db: AsyncSession, test_profile, test_firm, test_membership
    ):
        """Test listing firms a professional belongs to."""
        service = FirmService(db)

        firms = await service.list_firms_for_professional(test_profile.id)

        assert len(firms) == 1
        assert firms[0].id == test_firm.id

    async def test_search_public_firms(self, db: AsyncSession, test_firm):
        """Test searching public firms."""
        service = FirmService(db)

        # Search by name
        results = await service.search_public_firms(query="Smith")
        assert len(results) >= 1
        assert any(f.id == test_firm.id for f in results)

        # Search by state
        results = await service.search_public_firms(state="CA")
        assert len(results) >= 1

    async def test_get_firm_member_count(
        self, db: AsyncSession, test_firm, test_membership
    ):
        """Test getting member count for a firm."""
        service = FirmService(db)

        count = await service.get_firm_member_count(test_firm.id)

        assert count == 1


# =============================================================================
# Membership Management Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestMembershipManagement:
    """Tests for membership management operations."""

    async def test_invite_member_existing_professional(
        self, db: AsyncSession, test_firm, test_user, second_user, second_profile
    ):
        """Test inviting an existing professional to a firm."""
        service = FirmService(db)

        invite_data = FirmMemberInvite(
            email=second_user.email,
            role=FirmRole.ATTORNEY,
        )

        membership = await service.invite_member(
            firm_id=test_firm.id,
            inviter_user_id=test_user.id,
            data=invite_data,
        )

        assert membership is not None
        assert membership.professional_id == second_profile.id
        assert membership.role == FirmRole.ATTORNEY.value
        assert membership.status == MembershipStatus.INVITED.value
        assert membership.invite_token is not None
        assert membership.invite_expires_at is not None

    async def test_invite_member_new_email(
        self, db: AsyncSession, test_firm, test_user
    ):
        """Test inviting a new email that doesn't have a profile."""
        service = FirmService(db)

        invite_data = FirmMemberInvite(
            email="newperson@email.com",
            role=FirmRole.PARALEGAL,
        )

        membership = await service.invite_member(
            firm_id=test_firm.id,
            inviter_user_id=test_user.id,
            data=invite_data,
        )

        assert membership is not None
        assert membership.professional_id is None  # No profile yet
        assert membership.invite_email == "newperson@email.com"
        assert membership.status == MembershipStatus.INVITED.value

    async def test_accept_invite(
        self, db: AsyncSession, test_firm, test_user, second_user, second_profile
    ):
        """Test accepting a firm invitation."""
        service = FirmService(db)

        # Create invite
        invite_data = FirmMemberInvite(
            email=second_user.email,
            role=FirmRole.ATTORNEY,
        )
        membership = await service.invite_member(
            firm_id=test_firm.id,
            inviter_user_id=test_user.id,
            data=invite_data,
        )

        # Accept invite
        accepted = await service.accept_invite(
            invite_token=membership.invite_token,
            professional_id=second_profile.id,
        )

        assert accepted is not None
        assert accepted.status == MembershipStatus.ACTIVE.value
        assert accepted.joined_at is not None
        assert accepted.invite_token is None

    async def test_accept_invite_expired(
        self, db: AsyncSession, test_firm, test_user, second_user, second_profile
    ):
        """Test that expired invites cannot be accepted."""
        service = FirmService(db)

        # Create invite
        invite_data = FirmMemberInvite(
            email=second_user.email,
            role=FirmRole.ATTORNEY,
        )
        membership = await service.invite_member(
            firm_id=test_firm.id,
            inviter_user_id=test_user.id,
            data=invite_data,
        )

        # Manually expire the invite
        membership.invite_expires_at = datetime.utcnow() - timedelta(days=1)
        await db.commit()

        # Try to accept
        result = await service.accept_invite(
            invite_token=membership.invite_token,
            professional_id=second_profile.id,
        )

        assert result is None

    async def test_update_membership_role(
        self, db: AsyncSession, test_firm, test_user, second_profile, test_membership
    ):
        """Test updating a membership role."""
        service = FirmService(db)

        # Create another membership to update
        invite_data = FirmMemberInvite(
            email="update@test.com",
            role=FirmRole.PARALEGAL,
        )
        new_membership = FirmMembership(
            id=str(uuid4()),
            professional_id=second_profile.id,
            firm_id=test_firm.id,
            role=FirmRole.PARALEGAL.value,
            status=MembershipStatus.ACTIVE.value,
            joined_at=datetime.utcnow(),
            invited_by=test_user.id,
        )
        db.add(new_membership)
        await db.commit()

        # Update role
        update_data = FirmMembershipUpdate(role=FirmRole.ATTORNEY)
        updated = await service.update_membership(new_membership.id, update_data)

        assert updated is not None
        assert updated.role == FirmRole.ATTORNEY.value

    async def test_remove_member(
        self, db: AsyncSession, test_firm, test_user, second_profile
    ):
        """Test removing a member from a firm."""
        service = FirmService(db)

        # Create a membership to remove
        membership = FirmMembership(
            id=str(uuid4()),
            professional_id=second_profile.id,
            firm_id=test_firm.id,
            role=FirmRole.PARALEGAL.value,
            status=MembershipStatus.ACTIVE.value,
            joined_at=datetime.utcnow(),
            invited_by=test_user.id,
        )
        db.add(membership)
        await db.commit()

        # Remove member
        removed = await service.remove_member(membership.id)

        assert removed is not None
        assert removed.status == MembershipStatus.REMOVED.value

    async def test_cannot_remove_last_owner(
        self, db: AsyncSession, test_firm, test_membership
    ):
        """Test that the last owner cannot be removed."""
        service = FirmService(db)

        with pytest.raises(ValueError, match="Cannot remove the last owner"):
            await service.remove_member(test_membership.id)

    async def test_resend_invite(
        self, db: AsyncSession, test_firm, test_user
    ):
        """Test resending an invitation."""
        service = FirmService(db)

        # Create invite
        invite_data = FirmMemberInvite(
            email="resend@test.com",
            role=FirmRole.ATTORNEY,
        )
        membership = await service.invite_member(
            firm_id=test_firm.id,
            inviter_user_id=test_user.id,
            data=invite_data,
        )

        original_token = membership.invite_token

        # Resend
        resent = await service.resend_invite(membership.id)

        assert resent is not None
        assert resent.invite_token != original_token  # New token generated

    async def test_list_firm_members(
        self, db: AsyncSession, test_firm, test_membership
    ):
        """Test listing firm members."""
        service = FirmService(db)

        members = await service.list_firm_members(test_firm.id)

        assert len(members) >= 1
        assert any(m.id == test_membership.id for m in members)


# =============================================================================
# Authorization Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.professional
class TestFirmAuthorization:
    """Tests for firm authorization checks."""

    async def test_can_manage_firm_owner(
        self, db: AsyncSession, test_profile, test_firm, test_membership
    ):
        """Test that owners can manage firms."""
        service = FirmService(db)

        can_manage = await service.can_manage_firm(test_profile.id, test_firm.id)

        assert can_manage is True

    async def test_can_manage_firm_admin(
        self, db: AsyncSession, test_firm, test_user, second_profile
    ):
        """Test that admins can manage firms."""
        service = FirmService(db)

        # Create admin membership
        admin_membership = FirmMembership(
            id=str(uuid4()),
            professional_id=second_profile.id,
            firm_id=test_firm.id,
            role=FirmRole.ADMIN.value,
            status=MembershipStatus.ACTIVE.value,
            joined_at=datetime.utcnow(),
            invited_by=test_user.id,
        )
        db.add(admin_membership)
        await db.commit()

        can_manage = await service.can_manage_firm(second_profile.id, test_firm.id)

        assert can_manage is True

    async def test_cannot_manage_firm_attorney(
        self, db: AsyncSession, test_firm, test_user, second_profile
    ):
        """Test that attorneys cannot manage firms."""
        service = FirmService(db)

        # Create attorney membership
        attorney_membership = FirmMembership(
            id=str(uuid4()),
            professional_id=second_profile.id,
            firm_id=test_firm.id,
            role=FirmRole.ATTORNEY.value,
            status=MembershipStatus.ACTIVE.value,
            joined_at=datetime.utcnow(),
            invited_by=test_user.id,
        )
        db.add(attorney_membership)
        await db.commit()

        can_manage = await service.can_manage_firm(second_profile.id, test_firm.id)

        assert can_manage is False

    async def test_can_invite_members(
        self, db: AsyncSession, test_profile, test_firm, test_membership
    ):
        """Test checking invite permissions."""
        service = FirmService(db)

        can_invite = await service.can_invite_members(test_profile.id, test_firm.id)

        assert can_invite is True

    async def test_is_firm_member(
        self, db: AsyncSession, test_profile, test_firm, test_membership
    ):
        """Test checking firm membership."""
        service = FirmService(db)

        is_member = await service.is_firm_member(test_profile.id, test_firm.id)

        assert is_member is True

    async def test_is_not_firm_member(
        self, db: AsyncSession, second_profile, test_firm
    ):
        """Test checking non-membership."""
        service = FirmService(db)

        is_member = await service.is_firm_member(second_profile.id, test_firm.id)

        assert is_member is False
