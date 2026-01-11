"""
Family File service for managing family containers.

A Family File is the root container for a family's CommonGround data,
housing parents, children, agreements, and optionally a Court Custody Case.
"""

from datetime import datetime
from typing import List, Optional, Tuple
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family_file import (
    FamilyFile,
    CourtCustodyCase,
    QuickAccord,
    FamilyFileStatus,
    ConflictLevel,
    ParentRole,
    generate_family_file_number,
    generate_quick_accord_number,
)
from app.models.case import Case
from app.models.child import Child, ChildProfileStatus
from app.models.user import User
from app.schemas.family_file import (
    FamilyFileCreate,
    FamilyFileUpdate,
    InviteParentB,
    ChildBasic,
    CourtCustodyCaseCreate,
)
from app.services.email import EmailService
from app.core.config import settings


class FamilyFileService:
    """Service for handling Family File operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize Family File service.

        Args:
            db: Database session
        """
        self.db = db
        self.email_service = EmailService()

    async def create_family_file(
        self,
        data: FamilyFileCreate,
        creator: User
    ) -> FamilyFile:
        """
        Create a new Family File.

        A single parent can create a Family File. The other parent can be
        invited later.

        Args:
            data: Family File creation data
            creator: User creating the file

        Returns:
            Created FamilyFile

        Raises:
            HTTPException: If creation fails
        """
        try:
            # Create the Family File
            family_file = FamilyFile(
                id=str(uuid.uuid4()),
                family_file_number=generate_family_file_number(),
                title=data.title,
                created_by=creator.id,
                parent_a_id=creator.id,
                parent_a_role=data.parent_a_role,
                state=data.state,
                county=data.county,
                status=FamilyFileStatus.ACTIVE.value,
                conflict_level=ConflictLevel.LOW.value,
            )

            # If Parent B email is provided, set up invitation
            if data.parent_b_email:
                family_file.parent_b_email = data.parent_b_email
                family_file.parent_b_role = data.parent_b_role
                family_file.parent_b_invited_at = datetime.utcnow()

                # Check if Parent B already has an account
                result = await self.db.execute(
                    select(User).where(User.email == data.parent_b_email)
                )
                existing_parent_b = result.scalar_one_or_none()
                if existing_parent_b:
                    # Don't auto-add them, but we could send notification
                    pass

            self.db.add(family_file)
            await self.db.flush()

            # Add children if provided
            if data.children:
                for child_data in data.children:
                    child = Child(
                        id=str(uuid.uuid4()),
                        family_file_id=family_file.id,
                        first_name=child_data.first_name,
                        middle_name=child_data.middle_name,
                        last_name=child_data.last_name,
                        date_of_birth=datetime.fromisoformat(child_data.date_of_birth).date(),
                        gender=child_data.gender,
                        created_by=creator.id,
                        status=ChildProfileStatus.PENDING_APPROVAL.value,
                    )
                    self.db.add(child)

            await self.db.commit()
            await self.db.refresh(family_file)

            # Send invitation email if Parent B email provided
            if data.parent_b_email:
                await self._send_parent_b_invitation(family_file, creator)

            return family_file

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Family File: {str(e)}"
            )

    async def get_family_file(
        self,
        family_file_id: str,
        user: User
    ) -> FamilyFile:
        """
        Get a Family File by ID.

        Args:
            family_file_id: ID of the Family File
            user: User requesting access

        Returns:
            FamilyFile

        Raises:
            HTTPException: If not found or access denied
        """
        result = await self.db.execute(
            select(FamilyFile)
            .options(
                selectinload(FamilyFile.children),
                selectinload(FamilyFile.agreements),
                selectinload(FamilyFile.quick_accords),
                selectinload(FamilyFile.court_custody_case),
                selectinload(FamilyFile.cases).selectinload(Case.agreements),  # Load linked cases with their agreements
                selectinload(FamilyFile.cases).selectinload(Case.children),  # Load linked cases with their children
            )
            .where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Family File not found"
            )

        # Check access
        if not self._has_access(family_file, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this Family File"
            )

        return family_file

    async def get_user_family_files(self, user: User) -> List[FamilyFile]:
        """
        Get all Family Files for a user.

        Args:
            user: User to get files for

        Returns:
            List of FamilyFiles
        """
        result = await self.db.execute(
            select(FamilyFile)
            .options(
                selectinload(FamilyFile.children),
                selectinload(FamilyFile.quick_accords),
            )
            .where(
                or_(
                    FamilyFile.parent_a_id == user.id,
                    FamilyFile.parent_b_id == user.id,
                )
            )
            .order_by(FamilyFile.updated_at.desc())
        )
        return list(result.scalars().all())

    async def update_family_file(
        self,
        family_file_id: str,
        data: FamilyFileUpdate,
        user: User
    ) -> FamilyFile:
        """
        Update a Family File.

        Args:
            family_file_id: ID of the Family File
            data: Update data
            user: User making the update

        Returns:
            Updated FamilyFile
        """
        family_file = await self.get_family_file(family_file_id, user)

        # Apply updates
        if data.title is not None:
            family_file.title = data.title
        if data.state is not None:
            family_file.state = data.state
        if data.county is not None:
            family_file.county = data.county
        if data.aria_enabled is not None:
            old_aria = family_file.aria_enabled
            family_file.aria_enabled = data.aria_enabled
            if not data.aria_enabled and old_aria:
                family_file.aria_disabled_at = datetime.utcnow()
                family_file.aria_disabled_by = user.id
            elif data.aria_enabled and not old_aria:
                family_file.aria_disabled_at = None
                family_file.aria_disabled_by = None
        if data.aria_provider is not None:
            family_file.aria_provider = data.aria_provider

        family_file.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(family_file)

        return family_file

    async def invite_parent_b(
        self,
        family_file_id: str,
        data: InviteParentB,
        user: User
    ) -> FamilyFile:
        """
        Invite Parent B to join a Family File.

        Args:
            family_file_id: ID of the Family File
            data: Invitation data
            user: User sending the invitation

        Returns:
            Updated FamilyFile
        """
        family_file = await self.get_family_file(family_file_id, user)

        # Only Parent A can invite
        if family_file.parent_a_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the initiating parent can send invitations"
            )

        # Check if Parent B already joined
        if family_file.parent_b_id and family_file.parent_b_joined_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent B has already joined this Family File"
            )

        # Update invitation
        family_file.parent_b_email = data.email
        family_file.parent_b_role = data.role
        family_file.parent_b_invited_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(family_file)

        # Send invitation email
        await self._send_parent_b_invitation(family_file, user)

        return family_file

    async def accept_invitation(
        self,
        family_file_id: str,
        user: User
    ) -> FamilyFile:
        """
        Accept an invitation to join a Family File.

        Args:
            family_file_id: ID of the Family File
            user: User accepting the invitation

        Returns:
            Updated FamilyFile
        """
        result = await self.db.execute(
            select(FamilyFile).where(FamilyFile.id == family_file_id)
        )
        family_file = result.scalar_one_or_none()

        if not family_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Family File not found"
            )

        # Check if this user was invited
        if family_file.parent_b_email and family_file.parent_b_email.lower() != user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You were not invited to this Family File"
            )

        # Check if already joined
        if family_file.parent_b_id == user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already joined this Family File"
            )

        # Join the Family File
        family_file.parent_b_id = user.id
        family_file.parent_b_joined_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(family_file)

        return family_file

    async def get_pending_invitations(self, user: User) -> List[FamilyFile]:
        """
        Get pending Family File invitations for a user.

        Args:
            user: User to check invitations for

        Returns:
            List of FamilyFiles with pending invitations
        """
        result = await self.db.execute(
            select(FamilyFile)
            .where(
                and_(
                    FamilyFile.parent_b_email == user.email,
                    FamilyFile.parent_b_id.is_(None),
                )
            )
        )
        return list(result.scalars().all())

    async def add_child(
        self,
        family_file_id: str,
        child_data: ChildBasic,
        user: User
    ) -> Child:
        """
        Add a child to a Family File.

        Args:
            family_file_id: ID of the Family File
            child_data: Child information
            user: User adding the child

        Returns:
            Created Child
        """
        family_file = await self.get_family_file(family_file_id, user)

        child = Child(
            id=str(uuid.uuid4()),
            family_file_id=family_file.id,
            first_name=child_data.first_name,
            middle_name=child_data.middle_name,
            last_name=child_data.last_name,
            date_of_birth=datetime.fromisoformat(child_data.date_of_birth).date(),
            gender=child_data.gender,
            created_by=user.id,
            status=ChildProfileStatus.PENDING_APPROVAL.value,
        )
        self.db.add(child)
        await self.db.commit()
        await self.db.refresh(child)

        return child

    async def create_court_custody_case(
        self,
        family_file_id: str,
        data: CourtCustodyCaseCreate,
        user: User
    ) -> CourtCustodyCase:
        """
        Link a Court Custody Case to a Family File.

        When a Court Custody Case exists, parents can only create QuickAccords,
        not new SharedCare Agreements.

        Args:
            family_file_id: ID of the Family File
            data: Court case data
            user: User creating the link

        Returns:
            Created CourtCustodyCase
        """
        family_file = await self.get_family_file(family_file_id, user)

        # Check if court case already exists
        if family_file.court_custody_case:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A Court Custody Case is already linked to this Family File"
            )

        # Create the court custody case
        court_case = CourtCustodyCase(
            id=str(uuid.uuid4()),
            family_file_id=family_file.id,
            case_number=data.case_number,
            case_type=data.case_type,
            jurisdiction_state=data.jurisdiction_state,
            jurisdiction_county=data.jurisdiction_county,
            court_name=data.court_name,
            petitioner_id=user.id,
            filing_date=data.filing_date,
        )
        self.db.add(court_case)

        # Update Family File status
        family_file.status = FamilyFileStatus.COURT_LINKED.value

        await self.db.commit()
        await self.db.refresh(court_case)

        return court_case

    def _has_access(self, family_file: FamilyFile, user: User) -> bool:
        """Check if user has access to a Family File."""
        return (
            family_file.parent_a_id == user.id or
            family_file.parent_b_id == user.id or
            (family_file.parent_b_email and family_file.parent_b_email.lower() == user.email.lower())
        )

    async def _send_parent_b_invitation(
        self,
        family_file: FamilyFile,
        inviter: User
    ) -> None:
        """Send invitation email to Parent B."""
        try:
            # Build invitation link
            invite_link = f"{settings.FRONTEND_URL}/family-files/{family_file.id}/accept"

            await self.email_service.send_email(
                to_email=family_file.parent_b_email,
                subject=f"You've been invited to {family_file.title} on CommonGround",
                template_name="family_file_invitation",
                context={
                    "inviter_name": f"{inviter.first_name} {inviter.last_name}",
                    "family_file_title": family_file.title,
                    "invite_link": invite_link,
                }
            )
        except Exception:
            # Don't fail the operation if email fails
            pass
