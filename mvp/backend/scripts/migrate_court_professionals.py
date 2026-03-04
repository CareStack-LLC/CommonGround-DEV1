#!/usr/bin/env python3
"""
Data migration script: CourtProfessional -> ProfessionalProfile.

This script migrates existing court professionals to the new Professional Portal
schema. It:
1. Creates User accounts for court professionals (if not existing)
2. Creates ProfessionalProfile linked to those users
3. Creates solo Firm for each professional (or links to organization)
4. Migrates CourtAccessGrants to CaseAssignments

Run with: python -m scripts.migrate_court_professionals

Requirements:
- Database must have the professional portal tables created (run migration first)
- Should be run once after the database migration
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.court import CourtProfessional, CourtAccessGrant, CourtRole
from app.models.user import User
from app.models.professional import (
    ProfessionalProfile,
    Firm,
    FirmMembership,
    CaseAssignment,
    ProfessionalType,
    FirmType,
    FirmRole,
    MembershipStatus,
    AssignmentRole,
    AssignmentStatus,
    generate_firm_slug,
)
from app.models.case import Case
from app.models.family_file import FamilyFile


# =============================================================================
# Role Mapping
# =============================================================================

COURT_ROLE_TO_PROFESSIONAL_TYPE = {
    CourtRole.GAL.value: ProfessionalType.ATTORNEY.value,
    CourtRole.ATTORNEY.value: ProfessionalType.ATTORNEY.value,
    CourtRole.MEDIATOR.value: ProfessionalType.MEDIATOR.value,
    CourtRole.CFSS.value: ProfessionalType.PARENTING_COORDINATOR.value,
    CourtRole.EVALUATOR.value: ProfessionalType.ATTORNEY.value,
    CourtRole.JUDGE.value: ProfessionalType.ATTORNEY.value,
    CourtRole.CLERK.value: ProfessionalType.PRACTICE_ADMIN.value,
}

COURT_ROLE_TO_ASSIGNMENT_ROLE = {
    CourtRole.GAL.value: AssignmentRole.LEAD_ATTORNEY.value,
    CourtRole.ATTORNEY.value: AssignmentRole.LEAD_ATTORNEY.value,
    CourtRole.MEDIATOR.value: AssignmentRole.MEDIATOR.value,
    CourtRole.CFSS.value: AssignmentRole.PARENTING_COORDINATOR.value,
    CourtRole.EVALUATOR.value: AssignmentRole.ASSOCIATE.value,
    CourtRole.JUDGE.value: AssignmentRole.LEAD_ATTORNEY.value,
    CourtRole.CLERK.value: AssignmentRole.PARALEGAL.value,
}


# =============================================================================
# Migration Functions
# =============================================================================

async def find_or_create_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    phone: Optional[str] = None,
) -> User:
    """Find existing user by email or create a new one."""
    # Check if user exists
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user:
        print(f"  Found existing user: {user.email}")
        return user

    # Parse name
    name_parts = full_name.strip().split(" ", 1)
    first_name = name_parts[0] if name_parts else "Professional"
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    # Create new user
    user = User(
        id=str(uuid4()),
        email=email,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        # For migrated professionals, they'll need to set up auth
        is_verified=True,  # Trust existing verified professionals
        is_active=True,
    )
    db.add(user)
    await db.flush()

    print(f"  Created new user: {user.email}")
    return user


async def create_professional_profile(
    db: AsyncSession,
    user: User,
    court_professional: CourtProfessional,
) -> ProfessionalProfile:
    """Create a ProfessionalProfile from a CourtProfessional."""
    # Check if profile already exists
    result = await db.execute(
        select(ProfessionalProfile).where(
            ProfessionalProfile.user_id == user.id
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        print(f"  Profile already exists for user {user.email}")
        # Update the court_professional_id link if missing
        if not existing.court_professional_id:
            existing.court_professional_id = court_professional.id
            await db.flush()
        return existing

    # Map role
    professional_type = COURT_ROLE_TO_PROFESSIONAL_TYPE.get(
        court_professional.role,
        ProfessionalType.ATTORNEY.value
    )

    # Extract license info from credentials
    credentials = court_professional.credentials or {}
    license_number = credentials.get("bar_number") or credentials.get("license_number")
    license_state = credentials.get("state", "CA")

    profile = ProfessionalProfile(
        id=str(uuid4()),
        user_id=user.id,
        professional_type=professional_type,
        license_number=license_number,
        license_state=license_state,
        license_verified=court_professional.is_verified,
        license_verified_at=court_professional.verified_at,
        credentials=credentials,
        practice_areas=["custody", "family_law"],  # Default
        professional_email=court_professional.email,
        professional_phone=court_professional.phone,
        is_active=court_professional.is_active,
        onboarded_at=datetime.utcnow(),  # Mark as onboarded (migrated)
        court_professional_id=court_professional.id,  # Link to legacy
    )

    db.add(profile)
    await db.flush()

    print(f"  Created profile: {professional_type}")
    return profile


async def create_solo_firm(
    db: AsyncSession,
    professional: ProfessionalProfile,
    organization_name: Optional[str],
    user: User,
) -> Firm:
    """Create a solo practice firm for the professional."""
    # Check if firm already exists (by organization name)
    if organization_name and organization_name != "Solo Practice":
        result = await db.execute(
            select(Firm).where(Firm.name == organization_name)
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"  Found existing firm: {existing.name}")
            return existing

    # Create firm name
    firm_name = organization_name or f"{user.first_name} {user.last_name} - Solo Practice"

    # Check for existing solo firm
    result = await db.execute(
        select(Firm).where(Firm.name == firm_name)
    )
    existing = result.scalar_one_or_none()
    if existing:
        print(f"  Found existing firm: {existing.name}")
        return existing

    firm = Firm(
        id=str(uuid4()),
        name=firm_name,
        slug=generate_firm_slug(firm_name),
        firm_type=FirmType.SOLO_PRACTICE.value if not organization_name else FirmType.LAW_FIRM.value,
        email=professional.professional_email or user.email,
        phone=professional.professional_phone,
        state="CA",
        is_public=False,  # Not visible in directory by default
        subscription_tier="professional",
        subscription_status="trial",
        is_active=True,
        created_by=user.id,
    )

    db.add(firm)
    await db.flush()

    print(f"  Created firm: {firm.name}")
    return firm


async def create_firm_membership(
    db: AsyncSession,
    professional: ProfessionalProfile,
    firm: Firm,
) -> FirmMembership:
    """Create firm membership (as owner for migrated professionals)."""
    # Check if membership exists
    result = await db.execute(
        select(FirmMembership).where(
            FirmMembership.professional_id == professional.id,
            FirmMembership.firm_id == firm.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        print(f"  Membership already exists")
        return existing

    membership = FirmMembership(
        id=str(uuid4()),
        professional_id=professional.id,
        firm_id=firm.id,
        role=FirmRole.OWNER.value,
        status=MembershipStatus.ACTIVE.value,
        joined_at=datetime.utcnow(),
    )

    db.add(membership)
    await db.flush()

    print(f"  Created membership: {membership.role}")
    return membership


async def get_family_file_for_case(
    db: AsyncSession,
    case_id: str,
) -> Optional[FamilyFile]:
    """Get family file for a case."""
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.case_id == case_id)
    )
    return result.scalar_one_or_none()


async def migrate_access_grants(
    db: AsyncSession,
    professional: ProfessionalProfile,
    firm: Firm,
    court_professional: CourtProfessional,
) -> int:
    """Migrate CourtAccessGrants to CaseAssignments."""
    # Get all access grants for this professional
    result = await db.execute(
        select(CourtAccessGrant).where(
            CourtAccessGrant.professional_id == court_professional.id,
            CourtAccessGrant.is_active == True,
        )
    )
    grants = list(result.scalars().all())

    migrated = 0
    for grant in grants:
        # Get the family file for this case
        family_file = await get_family_file_for_case(db, grant.case_id)

        if not family_file:
            print(f"    Skipping grant {grant.id}: No family file found for case {grant.case_id}")
            continue

        # Check if assignment already exists
        result = await db.execute(
            select(CaseAssignment).where(
                CaseAssignment.professional_id == professional.id,
                CaseAssignment.family_file_id == family_file.id,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"    Assignment already exists for family file {family_file.id}")
            continue

        # Map role to assignment role
        assignment_role = COURT_ROLE_TO_ASSIGNMENT_ROLE.get(
            court_professional.role,
            AssignmentRole.LEAD_ATTORNEY.value
        )

        # Map representing based on role
        representing = "court"  # Default for court-appointed
        if court_professional.role == CourtRole.ATTORNEY.value:
            representing = grant.access_scope.get("representing", "parent_a") if grant.access_scope else "parent_a"
        elif court_professional.role == CourtRole.MEDIATOR.value:
            representing = "both"

        # Map access scopes
        access_scopes = []
        if grant.access_scope:
            # Convert old access_scope format to new
            for scope in grant.access_scope.get("scopes", []):
                access_scopes.append(scope)
        if not access_scopes:
            access_scopes = ["agreement", "schedule", "messages", "compliance"]

        assignment = CaseAssignment(
            id=str(uuid4()),
            professional_id=professional.id,
            firm_id=firm.id,
            family_file_id=family_file.id,
            case_id=grant.case_id,
            assignment_role=assignment_role,
            representing=representing,
            access_scopes=access_scopes,
            can_control_aria=True,  # Court professionals typically have full access
            can_message_client=True,
            status=AssignmentStatus.ACTIVE.value,
            assigned_at=grant.granted_at or datetime.utcnow(),
        )

        db.add(assignment)
        migrated += 1
        print(f"    Created assignment for family file {family_file.file_number}")

    await db.flush()
    return migrated


async def migrate_court_professional(
    db: AsyncSession,
    court_professional: CourtProfessional,
) -> bool:
    """Migrate a single court professional."""
    print(f"\nMigrating: {court_professional.full_name} ({court_professional.email})")

    try:
        # 1. Find or create User
        user = await find_or_create_user(
            db,
            court_professional.email,
            court_professional.full_name,
            court_professional.phone,
        )

        # 2. Create ProfessionalProfile
        profile = await create_professional_profile(db, user, court_professional)

        # 3. Create Firm
        firm = await create_solo_firm(
            db,
            profile,
            court_professional.organization,
            user,
        )

        # 4. Create FirmMembership
        await create_firm_membership(db, profile, firm)

        # 5. Migrate access grants
        migrated_grants = await migrate_access_grants(db, profile, firm, court_professional)
        print(f"  Migrated {migrated_grants} access grants")

        return True

    except Exception as e:
        print(f"  ERROR: {e}")
        return False


async def main():
    """Main migration function."""
    print("=" * 60)
    print("Court Professional to Professional Profile Migration")
    print("=" * 60)

    async with async_session() as db:
        try:
            # Get count of court professionals
            result = await db.execute(
                select(func.count(CourtProfessional.id))
            )
            total = result.scalar() or 0
            print(f"\nFound {total} court professionals to migrate")

            if total == 0:
                print("No court professionals to migrate. Exiting.")
                return

            # Get all court professionals
            result = await db.execute(
                select(CourtProfessional).order_by(CourtProfessional.created_at)
            )
            professionals = list(result.scalars().all())

            # Migrate each professional
            success = 0
            failed = 0

            for cp in professionals:
                if await migrate_court_professional(db, cp):
                    success += 1
                else:
                    failed += 1

            # Commit all changes
            await db.commit()

            print("\n" + "=" * 60)
            print("Migration Complete")
            print("=" * 60)
            print(f"Successfully migrated: {success}")
            print(f"Failed: {failed}")
            print(f"Total: {total}")

        except Exception as e:
            print(f"\nMigration failed: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
