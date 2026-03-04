"""
Case management service for creating and managing co-parenting cases.
"""

from datetime import datetime, date
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.case import Case, CaseParticipant
from app.models.child import Child
from app.models.user import User
from app.schemas.case import CaseCreate, CaseUpdate
from app.services.email import EmailService
from app.core.config import settings


class CaseService:
    """Service for handling case operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize case service.

        Args:
            db: Database session
        """
        self.db = db
        self.email_service = EmailService()

    async def create_case(
        self,
        case_data: CaseCreate,
        creator: User
    ) -> Tuple[Case, str]:
        """
        Create a new co-parenting case.

        Creates a case with the creator as the first participant and sends
        an invitation to the other parent.

        Args:
            case_data: Case creation data
            creator: User creating the case

        Returns:
            Tuple of (Case, invitation_token)

        Raises:
            HTTPException: If case creation fails
        """
        try:
            # Create the case
            case = Case(
                case_name=case_data.case_name,
                state=case_data.state,
                county=case_data.county,
                status="pending",  # Pending until other parent joins
            )
            self.db.add(case)
            await self.db.flush()

            # Add creator as first participant
            creator_participant = CaseParticipant(
                case_id=case.id,
                user_id=creator.id,
                role="petitioner",
                parent_type="parent_a",
                is_active=True,
                joined_at=datetime.utcnow(),
            )
            self.db.add(creator_participant)

            # Create pending participant for invited user
            # First, check if a user with that email exists
            invited_user_result = await self.db.execute(
                select(User).where(User.email == case_data.other_parent_email)
            )
            invited_user = invited_user_result.scalar_one_or_none()

            # If user exists, create pending participant record
            if invited_user:
                invited_participant = CaseParticipant(
                    case_id=case.id,
                    user_id=invited_user.id,
                    role="respondent",
                    parent_type="parent_b",
                    is_active=False,  # Not active until they accept
                    invited_at=datetime.utcnow(),
                    # joined_at will be set when they accept
                )
                self.db.add(invited_participant)

            # Add children if provided
            if case_data.children:
                for child_data in case_data.children:
                    # Parse date_of_birth if it's a string
                    dob = child_data.get("date_of_birth")
                    if isinstance(dob, str):
                        dob = date.fromisoformat(dob)

                    child = Child(
                        case_id=case.id,
                        first_name=child_data.get("first_name"),
                        last_name=child_data.get("last_name"),
                        middle_name=child_data.get("middle_name"),
                        date_of_birth=dob,
                        gender=child_data.get("gender"),
                    )
                    self.db.add(child)

            await self.db.commit()
            await self.db.refresh(case)

            # Generate invitation token (simplified - in production use JWT or secure token)
            invitation_token = f"{case.id}:{case_data.other_parent_email}"

            # Send invitation email to other parent
            try:
                # Get children names for the email
                children_names = [
                    child_data.get("first_name", "")
                    for child_data in (case_data.children or [])
                ]

                # Build invitation link (frontend URL + token)
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
                invitation_link = f"{frontend_url}/accept-invitation?token={invitation_token}"

                # Send the email
                await self.email_service.send_case_invitation(
                    to_email=case_data.other_parent_email,
                    to_name=case_data.other_parent_email.split('@')[0],  # Use email prefix as name
                    inviter_name=f"{creator.first_name} {creator.last_name}",
                    case_name=case_data.case_name,
                    invitation_link=invitation_link,
                    children_names=children_names
                )
            except Exception as email_error:
                # Log email error but don't fail case creation
                print(f"Warning: Failed to send invitation email: {email_error}")

            return case, invitation_token

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create case: {str(e)}"
            ) from e

    async def accept_invitation(
        self,
        case_id: str,
        user: User,
        invitation_token: str
    ) -> Case:
        """
        Accept a case invitation.

        Updates the pending participant with the accepting user's information.

        Args:
            case_id: ID of the case
            user: User accepting the invitation
            invitation_token: Invitation token for verification

        Returns:
            Updated case

        Raises:
            HTTPException: If acceptance fails
        """
        try:
            # Get the case
            result = await self.db.execute(
                select(Case)
                .options(selectinload(Case.participants))
                .where(Case.id == case_id)
            )
            case = result.scalar_one_or_none()

            if not case:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Case not found"
                )

            # Check if user already has an active participant record
            existing_participant = next(
                (p for p in case.participants if p.user_id == user.id), None
            )

            if existing_participant and existing_participant.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You have already accepted this invitation"
                )

            if existing_participant and not existing_participant.is_active:
                # Activate the pending participant
                existing_participant.is_active = True
                existing_participant.joined_at = datetime.utcnow()
            else:
                # Create new participant (for cases created before this change)
                new_participant = CaseParticipant(
                    case_id=case.id,
                    user_id=user.id,
                    role="respondent",
                    parent_type="parent_b",
                    is_active=True,
                    invited_at=datetime.utcnow(),
                    joined_at=datetime.utcnow(),
                )
                self.db.add(new_participant)

            # Activate the case (now has both parents)
            case.status = "active"

            await self.db.commit()
            await self.db.refresh(case)

            return case

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to accept invitation: {str(e)}"
            ) from e

    async def get_user_cases(self, user: User) -> List[Case]:
        """
        Get all cases for a user.

        Includes both active cases and pending invitations.

        Args:
            user: User to get cases for

        Returns:
            List of cases
        """
        result = await self.db.execute(
            select(Case)
            .join(CaseParticipant)
            .options(
                selectinload(Case.participants),
                selectinload(Case.children)
            )
            .where(CaseParticipant.user_id == user.id)
            # Include both active participants and pending invitations
            # Frontend will filter based on is_active status
        )
        return list(result.scalars().all())

    async def get_case(self, case_id: str, user: User) -> Case:
        """
        Get a specific case.

        Args:
            case_id: ID of the case
            user: User requesting the case

        Returns:
            Case details

        Raises:
            HTTPException: If case not found or user doesn't have access
        """
        result = await self.db.execute(
            select(Case)
            .options(
                selectinload(Case.participants),
                selectinload(Case.children)
            )
            .where(Case.id == case_id)
        )
        case = result.scalar_one_or_none()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found"
            )

        # Verify user has access to this case
        has_access = any(
            p.user_id == user.id and p.is_active
            for p in case.participants
        )

        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this case"
            )

        return case

    async def update_case(
        self,
        case_id: str,
        update_data: CaseUpdate,
        user: User
    ) -> Case:
        """
        Update case details.

        Args:
            case_id: ID of the case
            update_data: Update data
            user: User making the update

        Returns:
            Updated case

        Raises:
            HTTPException: If update fails
        """
        # First verify access
        case = await self.get_case(case_id, user)

        # Update fields
        if update_data.case_name is not None:
            case.case_name = update_data.case_name
        if update_data.county is not None:
            case.county = update_data.county
        if update_data.court is not None:
            case.court = update_data.court

        try:
            await self.db.commit()
            await self.db.refresh(case)
            return case
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update case: {str(e)}"
            ) from e

    async def add_child(
        self,
        case_id: str,
        child_data: dict,
        user: User
    ) -> Child:
        """
        Add a child to a case.

        Args:
            case_id: ID of the case
            child_data: Child information
            user: User adding the child

        Returns:
            Created child

        Raises:
            HTTPException: If creation fails
        """
        # Verify access to case
        await self.get_case(case_id, user)

        try:
            # Parse date_of_birth if it's a string
            dob = child_data.get("date_of_birth")
            if isinstance(dob, str):
                dob = date.fromisoformat(dob)

            child = Child(
                case_id=case_id,
                first_name=child_data.get("first_name"),
                last_name=child_data.get("last_name"),
                middle_name=child_data.get("middle_name"),
                date_of_birth=dob,
                gender=child_data.get("gender"),
                pronouns=child_data.get("pronouns"),
            )
            self.db.add(child)
            await self.db.commit()
            await self.db.refresh(child)
            return child

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to add child: {str(e)}"
            ) from e

    async def update_child(
        self,
        child_id: str,
        child_data: dict,
        user: User
    ) -> Child:
        """
        Update child information.

        Args:
            child_id: ID of the child
            child_data: Updated child information
            user: User making the update

        Returns:
            Updated child

        Raises:
            HTTPException: If update fails
        """
        # Get child and verify access
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()

        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child not found"
            )

        # Verify user has access to the case
        await self.get_case(child.case_id, user)

        # Update fields
        for key, value in child_data.items():
            if hasattr(child, key) and value is not None:
                setattr(child, key, value)

        try:
            await self.db.commit()
            await self.db.refresh(child)
            return child

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update child: {str(e)}"
            ) from e

    async def delete_child(self, child_id: str, user: User) -> None:
        """
        Delete a child from a case.

        Args:
            child_id: ID of the child
            user: User deleting the child

        Raises:
            HTTPException: If deletion fails
        """
        # Get child and verify access
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()

        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child not found"
            )

        # Verify user has access to the case
        await self.get_case(child.case_id, user)

        try:
            await self.db.delete(child)
            await self.db.commit()

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete child: {str(e)}"
            ) from e
