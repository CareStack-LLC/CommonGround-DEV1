"""
Professional profile service layer.

Business logic for professional profile management and onboarding.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import (
    ProfessionalProfile,
    FirmMembership,
    MembershipStatus,
    ProfessionalType,
)
from app.models.user import User
from app.schemas.professional import (
    ProfessionalProfileCreate,
    ProfessionalProfileUpdate,
)


# =============================================================================
# Professional Profile Service
# =============================================================================

class ProfessionalProfileService:
    """Service for managing professional profiles."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Profile CRUD
    # -------------------------------------------------------------------------

    async def create_profile(
        self,
        user_id: str,
        data: ProfessionalProfileCreate,
    ) -> ProfessionalProfile:
        """
        Create a professional profile for an existing user (onboarding).

        Args:
            user_id: The user ID to create a profile for
            data: Profile creation data

        Returns:
            The created professional profile
        """
        # Check if profile already exists
        existing = await self.get_profile_by_user_id(user_id)
        if existing:
            raise ValueError("Professional profile already exists for this user")

        profile = ProfessionalProfile(
            id=str(uuid4()),
            user_id=user_id,
            professional_type=data.professional_type.value,
            license_number=data.license_number,
            license_state=data.license_state.upper() if data.license_state else None,
            credentials=data.credentials or {},
            practice_areas=data.practice_areas or [],
            professional_email=data.professional_email,
            professional_phone=data.professional_phone,
            
            # Directory Fields
            headline=data.headline,
            bio=data.bio,
            video_url=data.video_url,
            languages=data.languages or [],
            hourly_rate=data.hourly_rate,
            years_experience=data.years_experience,
            education=data.education or [],
            awards=data.awards or [],
            consultation_fee=data.consultation_fee,
            accepted_payment_methods=data.accepted_payment_methods or [],

            notification_preferences={
                "email_new_case": True,
                "email_intake_complete": True,
                "email_message": True,
                "email_court_event": True,
            },
            onboarded_at=datetime.utcnow(),
        )

        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)

        return profile

    async def get_profile(self, profile_id: str) -> Optional[ProfessionalProfile]:
        """Get a professional profile by ID."""
        result = await self.db.execute(
            select(ProfessionalProfile)
            .options(selectinload(ProfessionalProfile.user))
            .where(ProfessionalProfile.id == profile_id)
        )
        return result.scalar_one_or_none()

    async def get_profile_by_user_id(
        self,
        user_id: str,
    ) -> Optional[ProfessionalProfile]:
        """Get a professional profile by user ID."""
        result = await self.db.execute(
            select(ProfessionalProfile)
            .options(selectinload(ProfessionalProfile.user))
            .where(ProfessionalProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_profile_with_firms(
        self,
        profile_id: str,
    ) -> Optional[ProfessionalProfile]:
        """Get a professional profile with firm memberships."""
        result = await self.db.execute(
            select(ProfessionalProfile)
            .options(
                selectinload(ProfessionalProfile.user),
                selectinload(ProfessionalProfile.firm_memberships)
                .selectinload(FirmMembership.firm),
            )
            .where(ProfessionalProfile.id == profile_id)
        )
        return result.scalar_one_or_none()

    async def update_profile(
        self,
        profile_id: str,
        data: ProfessionalProfileUpdate,
    ) -> Optional[ProfessionalProfile]:
        """Update a professional profile."""
        profile = await self.get_profile(profile_id)
        if not profile:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "professional_type" and value:
                value = value.value
            if key == "license_state" and value:
                value = value.upper()
            setattr(profile, key, value)

        profile.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def deactivate_profile(
        self,
        profile_id: str,
    ) -> Optional[ProfessionalProfile]:
        """Deactivate a professional profile."""
        profile = await self.get_profile(profile_id)
        if not profile:
            return None

        profile.is_active = False
        profile.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    # -------------------------------------------------------------------------
    # License Verification
    # -------------------------------------------------------------------------

    async def submit_license_verification(
        self,
        profile_id: str,
        license_number: str,
        license_state: str,
        verification_data: Optional[dict] = None,
    ) -> Optional[ProfessionalProfile]:
        """
        Submit a license for verification.

        In production, this would integrate with a bar lookup service.
        For MVP, we just store the data and mark as pending.
        """
        profile = await self.get_profile(profile_id)
        if not profile:
            return None

        profile.license_number = license_number
        profile.license_state = license_state.upper()
        profile.credentials = {
            **(profile.credentials or {}),
            "verification_submitted_at": datetime.utcnow().isoformat(),
            "verification_data": verification_data,
        }
        profile.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def verify_license(
        self,
        profile_id: str,
        verified_by: Optional[str] = None,
        verification_method: str = "manual",
    ) -> Optional[ProfessionalProfile]:
        """
        Mark a license as verified (admin action or automated).
        """
        profile = await self.get_profile(profile_id)
        if not profile:
            return None

        profile.license_verified = True
        profile.license_verified_at = datetime.utcnow()
        profile.credentials = {
            **(profile.credentials or {}),
            "verified_by": verified_by,
            "verification_method": verification_method,
        }
        profile.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    # -------------------------------------------------------------------------
    # Profile Lookup
    # -------------------------------------------------------------------------

    async def search_professionals(
        self,
        query: Optional[str] = None,
        professional_type: Optional[ProfessionalType] = None,
        state: Optional[str] = None,
        verified_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ProfessionalProfile]:
        """Search for professionals (for directory or assignment)."""
        stmt = (
            select(ProfessionalProfile)
            .options(selectinload(ProfessionalProfile.user))
            .where(ProfessionalProfile.is_active == True)
        )

        if query:
            # Search by user name or professional email
            search_term = f"%{query}%"
            stmt = stmt.join(User, User.id == ProfessionalProfile.user_id).where(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    ProfessionalProfile.professional_email.ilike(search_term),
                )
            )

        if professional_type:
            stmt = stmt.where(
                ProfessionalProfile.professional_type == professional_type.value
            )

        if state:
            stmt = stmt.where(ProfessionalProfile.license_state == state.upper())

        if verified_only:
            stmt = stmt.where(ProfessionalProfile.license_verified == True)

        stmt = stmt.limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_professionals_by_firm(
        self,
        firm_id: str,
        active_only: bool = True,
    ) -> list[ProfessionalProfile]:
        """Get all professionals belonging to a firm."""
        stmt = (
            select(ProfessionalProfile)
            .options(selectinload(ProfessionalProfile.user))
            .join(
                FirmMembership,
                FirmMembership.professional_id == ProfessionalProfile.id,
            )
            .where(FirmMembership.firm_id == firm_id)
        )

        if active_only:
            stmt = stmt.where(
                and_(
                    FirmMembership.status == MembershipStatus.ACTIVE.value,
                    ProfessionalProfile.is_active == True,
                )
            )

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # -------------------------------------------------------------------------
    # Notification Preferences
    # -------------------------------------------------------------------------

    async def update_notification_preferences(
        self,
        profile_id: str,
        preferences: dict,
    ) -> Optional[ProfessionalProfile]:
        """Update notification preferences for a professional."""
        profile = await self.get_profile(profile_id)
        if not profile:
            return None

        profile.notification_preferences = {
            **(profile.notification_preferences or {}),
            **preferences,
        }
        profile.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    async def get_profile_stats(
        self,
        profile_id: str,
    ) -> dict:
        """Get statistics for a professional profile."""
        from app.models.professional import CaseAssignment, AssignmentStatus

        profile = await self.get_profile(profile_id)
        if not profile:
            return {}

        # Count active case assignments
        active_cases_result = await self.db.execute(
            select(func.count(CaseAssignment.id)).where(
                and_(
                    CaseAssignment.professional_id == profile_id,
                    CaseAssignment.status == AssignmentStatus.ACTIVE.value,
                )
            )
        )
        active_cases = active_cases_result.scalar() or 0

        # Count firm memberships
        firm_count_result = await self.db.execute(
            select(func.count(FirmMembership.id)).where(
                and_(
                    FirmMembership.professional_id == profile_id,
                    FirmMembership.status == MembershipStatus.ACTIVE.value,
                )
            )
        )
        firm_count = firm_count_result.scalar() or 0

        return {
            "active_cases": active_cases,
            "firm_count": firm_count,
            "is_verified": profile.license_verified,
            "onboarded_at": profile.onboarded_at.isoformat() if profile.onboarded_at else None,
        }

    # -------------------------------------------------------------------------
    # Migration Helper (CourtProfessional -> ProfessionalProfile)
    # -------------------------------------------------------------------------

    async def link_court_professional(
        self,
        profile_id: str,
        court_professional_id: str,
    ) -> Optional[ProfessionalProfile]:
        """
        Link a professional profile to a legacy CourtProfessional record.

        This is used during migration to preserve relationships.
        """
        profile = await self.get_profile(profile_id)
        if not profile:
            return None

        profile.court_professional_id = court_professional_id
        profile.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(profile)
        return profile


# Import at the end to avoid circular imports
from sqlalchemy import or_
