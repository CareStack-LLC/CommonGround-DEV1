"""
Collection Service - Business logic for My Time Collections.

Handles:
- CRUD operations for collections
- Privacy filtering (owner sees real name, other parent sees "Mom's Time")
- Default collection management
"""

from typing import Optional, List
from datetime import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.my_time_collection import MyTimeCollection
from app.models.case import Case, CaseParticipant
from app.models.user import User
from app.models.family_file import FamilyFile


class CollectionService:
    """Service for managing My Time Collections with privacy."""

    @staticmethod
    async def create_collection(
        db: AsyncSession,
        case_id: str,
        owner_id: str,
        name: str,
        color: str = "#3B82F6",
        is_default: bool = False
    ) -> MyTimeCollection:
        """
        Create a new My Time Collection.

        Args:
            db: Database session
            case_id: Case UUID or Family File UUID
            owner_id: User UUID who owns this collection
            name: Private collection name (e.g., "Time with Dad")
            color: Hex color for calendar display
            is_default: Whether this is the default collection

        Returns:
            Created MyTimeCollection
        """
        # Check access and determine if this is a Case or Family File
        effective_case_id = None
        family_file_id = None

        # First try as Case Participant
        result = await db.execute(
            select(CaseParticipant).where(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == owner_id,
                CaseParticipant.is_active == True
            )
        )
        has_access = result.scalar_one_or_none() is not None

        if has_access:
            # It's a case, use case_id directly
            effective_case_id = case_id
        else:
            # Try as Family File
            family_file_result = await db.execute(
                select(FamilyFile).where(
                    FamilyFile.id == case_id,
                    ((FamilyFile.parent_a_id == owner_id) | (FamilyFile.parent_b_id == owner_id))
                )
            )
            family_file = family_file_result.scalar_one_or_none()
            if family_file:
                has_access = True
                family_file_id = family_file.id
                # If family file has a linked case, use that for case_id
                if family_file.legacy_case_id:
                    effective_case_id = family_file.legacy_case_id
                # Otherwise, effective_case_id stays None

        if not has_access:
            raise ValueError("User is not a participant in this case or family file")

        # If this is set as default, unset other defaults
        # Query by either case_id or family_file_id depending on which is set
        if is_default:
            if effective_case_id:
                existing_defaults = await db.execute(
                    select(MyTimeCollection).where(
                        MyTimeCollection.case_id == effective_case_id,
                        MyTimeCollection.owner_id == owner_id,
                        MyTimeCollection.is_default == True
                    )
                )
            elif family_file_id:
                existing_defaults = await db.execute(
                    select(MyTimeCollection).where(
                        MyTimeCollection.family_file_id == family_file_id,
                        MyTimeCollection.owner_id == owner_id,
                        MyTimeCollection.is_default == True
                    )
                )
            else:
                existing_defaults = None

            if existing_defaults:
                for existing in existing_defaults.scalars():
                    existing.is_default = False

        # Get display order (append to end)
        if effective_case_id:
            count_result = await db.execute(
                select(MyTimeCollection).where(
                    MyTimeCollection.case_id == effective_case_id,
                    MyTimeCollection.owner_id == owner_id
                )
            )
        elif family_file_id:
            count_result = await db.execute(
                select(MyTimeCollection).where(
                    MyTimeCollection.family_file_id == family_file_id,
                    MyTimeCollection.owner_id == owner_id
                )
            )
        else:
            count_result = None

        display_order = len(count_result.scalars().all()) if count_result else 0

        # Create collection with either case_id or family_file_id (or both)
        collection = MyTimeCollection(
            id=str(uuid.uuid4()),
            case_id=effective_case_id,  # Can be None for family-file-only
            family_file_id=family_file_id,  # Set if this is a family file
            owner_id=owner_id,
            name=name,
            color=color,
            is_default=is_default,
            is_active=True,
            display_order=display_order
        )

        db.add(collection)
        await db.flush()
        await db.refresh(collection)

        return collection

    @staticmethod
    async def get_collection(
        db: AsyncSession,
        collection_id: str,
        viewer_id: str
    ) -> Optional[MyTimeCollection]:
        """
        Get a collection by ID.

        Args:
            db: Database session
            collection_id: Collection UUID
            viewer_id: User requesting the collection

        Returns:
            MyTimeCollection or None if not found/no access
        """
        result = await db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == collection_id)
        )
        collection = result.scalar_one_or_none()

        if not collection:
            return None

        # Verify viewer has access - check case participant first
        has_access = False
        if collection.case_id:
            access_result = await db.execute(
                select(CaseParticipant).where(
                    CaseParticipant.case_id == collection.case_id,
                    CaseParticipant.user_id == viewer_id,
                    CaseParticipant.is_active == True
                )
            )
            has_access = access_result.scalar_one_or_none() is not None

        # If not a case participant, check family file access
        if not has_access and collection.family_file_id:
            family_file_result = await db.execute(
                select(FamilyFile).where(
                    FamilyFile.id == collection.family_file_id,
                    ((FamilyFile.parent_a_id == viewer_id) | (FamilyFile.parent_b_id == viewer_id))
                )
            )
            has_access = family_file_result.scalar_one_or_none() is not None

        if not has_access:
            return None

        return collection

    @staticmethod
    async def list_collections(
        db: AsyncSession,
        case_id: str,
        viewer_id: str,
        include_other_parent: bool = True
    ) -> List[MyTimeCollection]:
        """
        List all collections for a case or family file.

        Args:
            db: Database session
            case_id: Case UUID or Family File UUID
            viewer_id: User requesting the list
            include_other_parent: Whether to include other parent's collections

        Returns:
            List of MyTimeCollection (privacy filtered)
        """
        from sqlalchemy import or_

        # Check access and determine if this is a Case or Family File
        effective_case_id = None
        family_file_id = None

        # First try as Case Participant
        access_result = await db.execute(
            select(CaseParticipant).where(
                CaseParticipant.case_id == case_id,
                CaseParticipant.user_id == viewer_id,
                CaseParticipant.is_active == True
            )
        )
        has_access = access_result.scalar_one_or_none() is not None

        if has_access:
            effective_case_id = case_id
        else:
            # Try as Family File
            family_file_result = await db.execute(
                select(FamilyFile).where(
                    FamilyFile.id == case_id,
                    ((FamilyFile.parent_a_id == viewer_id) | (FamilyFile.parent_b_id == viewer_id))
                )
            )
            family_file = family_file_result.scalar_one_or_none()
            if family_file:
                has_access = True
                family_file_id = family_file.id
                if family_file.legacy_case_id:
                    effective_case_id = family_file.legacy_case_id

        if not has_access:
            raise ValueError("No access to this case or family file")

        # Build query based on what IDs we have
        if effective_case_id and family_file_id:
            # Query by either case_id or family_file_id
            if include_other_parent:
                result = await db.execute(
                    select(MyTimeCollection).where(
                        or_(
                            MyTimeCollection.case_id == effective_case_id,
                            MyTimeCollection.family_file_id == family_file_id
                        ),
                        MyTimeCollection.is_active == True
                    ).order_by(MyTimeCollection.owner_id, MyTimeCollection.display_order)
                )
            else:
                result = await db.execute(
                    select(MyTimeCollection).where(
                        or_(
                            MyTimeCollection.case_id == effective_case_id,
                            MyTimeCollection.family_file_id == family_file_id
                        ),
                        MyTimeCollection.owner_id == viewer_id,
                        MyTimeCollection.is_active == True
                    ).order_by(MyTimeCollection.display_order)
                )
        elif effective_case_id:
            # Query by case_id only
            if include_other_parent:
                result = await db.execute(
                    select(MyTimeCollection).where(
                        MyTimeCollection.case_id == effective_case_id,
                        MyTimeCollection.is_active == True
                    ).order_by(MyTimeCollection.owner_id, MyTimeCollection.display_order)
                )
            else:
                result = await db.execute(
                    select(MyTimeCollection).where(
                        MyTimeCollection.case_id == effective_case_id,
                        MyTimeCollection.owner_id == viewer_id,
                        MyTimeCollection.is_active == True
                    ).order_by(MyTimeCollection.display_order)
                )
        elif family_file_id:
            # Query by family_file_id only (no linked case)
            if include_other_parent:
                result = await db.execute(
                    select(MyTimeCollection).where(
                        MyTimeCollection.family_file_id == family_file_id,
                        MyTimeCollection.is_active == True
                    ).order_by(MyTimeCollection.owner_id, MyTimeCollection.display_order)
                )
            else:
                result = await db.execute(
                    select(MyTimeCollection).where(
                        MyTimeCollection.family_file_id == family_file_id,
                        MyTimeCollection.owner_id == viewer_id,
                        MyTimeCollection.is_active == True
                    ).order_by(MyTimeCollection.display_order)
                )
        else:
            # No valid IDs
            return []

        return list(result.scalars().all())

    @staticmethod
    async def update_collection(
        db: AsyncSession,
        collection_id: str,
        user_id: str,
        name: Optional[str] = None,
        color: Optional[str] = None,
        is_default: Optional[bool] = None
    ) -> MyTimeCollection:
        """
        Update a collection.

        Args:
            db: Database session
            collection_id: Collection UUID
            user_id: User making the update (must be owner)
            name: New name (optional)
            color: New color (optional)
            is_default: New default status (optional)

        Returns:
            Updated MyTimeCollection

        Raises:
            ValueError: If user is not owner or collection not found
        """
        result = await db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == collection_id)
        )
        collection = result.scalar_one_or_none()

        if not collection:
            raise ValueError("Collection not found")

        if collection.owner_id != user_id:
            raise ValueError("Only the owner can update this collection")

        # Update fields
        if name is not None:
            collection.name = name
        if color is not None:
            collection.color = color
        if is_default is not None:
            if is_default:
                # Unset other defaults
                existing_defaults = await db.execute(
                    select(MyTimeCollection).where(
                        MyTimeCollection.case_id == collection.case_id,
                        MyTimeCollection.owner_id == user_id,
                        MyTimeCollection.is_default == True,
                        MyTimeCollection.id != collection_id
                    )
                )
                for existing in existing_defaults.scalars():
                    existing.is_default = False

            collection.is_default = is_default

        collection.updated_at = datetime.utcnow()
        await db.flush()
        await db.refresh(collection)

        return collection

    @staticmethod
    async def delete_collection(
        db: AsyncSession,
        collection_id: str,
        user_id: str
    ) -> bool:
        """
        Soft delete a collection (set is_active=False).

        Args:
            db: Database session
            collection_id: Collection UUID
            user_id: User requesting deletion (must be owner)

        Returns:
            True if deleted, False if not found

        Raises:
            ValueError: If user is not owner or collection is default
        """
        result = await db.execute(
            select(MyTimeCollection).where(MyTimeCollection.id == collection_id)
        )
        collection = result.scalar_one_or_none()

        if not collection:
            return False

        if collection.owner_id != user_id:
            raise ValueError("Only the owner can delete this collection")

        if collection.is_default:
            raise ValueError("Cannot delete the default collection")

        collection.is_active = False
        collection.updated_at = datetime.utcnow()
        await db.flush()

        return True

    @staticmethod
    async def filter_for_viewer(
        collection: MyTimeCollection,
        viewer_id: str,
        db: AsyncSession
    ) -> dict:
        """
        Filter collection data based on who is viewing.

        Privacy Rules:
        - Owner sees real name and full details
        - Other parent sees generic label like "Mom's Time" or "Dad's Time"

        Args:
            collection: MyTimeCollection to filter
            viewer_id: User viewing the collection
            db: Database session

        Returns:
            Filtered dictionary representation
        """
        if collection.owner_id == viewer_id:
            # Owner sees everything
            return {
                "id": collection.id,
                "case_id": collection.case_id,
                "family_file_id": collection.family_file_id,
                "owner_id": collection.owner_id,
                "name": collection.name,
                "color": collection.color,
                "is_default": collection.is_default,
                "is_active": collection.is_active,
                "display_order": collection.display_order,
                "is_owner": True,
                "created_at": collection.created_at.isoformat(),
                "updated_at": collection.updated_at.isoformat()
            }
        else:
            # Other parent sees generic label
            label = "Other Parent's Time"  # Default fallback

            # First try CaseParticipant
            if collection.case_id:
                participant_result = await db.execute(
                    select(CaseParticipant).where(
                        CaseParticipant.case_id == collection.case_id,
                        CaseParticipant.user_id == collection.owner_id
                    )
                )
                participant = participant_result.scalar_one_or_none()
                if participant:
                    # Use parent_type to generate label
                    parent_role = participant.parent_type.replace("_", " ").title()
                    if parent_role == "Parent A":
                        label = "Parent A's Time"
                    elif parent_role == "Parent B":
                        label = "Parent B's Time"
                    elif parent_role == "Mother":
                        label = "Mom's Time"
                    elif parent_role == "Father":
                        label = "Dad's Time"
                    else:
                        label = f"{parent_role}'s Time"

            # If no CaseParticipant, try FamilyFile parent role
            if label == "Other Parent's Time" and collection.family_file_id:
                family_file_result = await db.execute(
                    select(FamilyFile).where(FamilyFile.id == collection.family_file_id)
                )
                family_file = family_file_result.scalar_one_or_none()
                if family_file:
                    if family_file.parent_a_id == collection.owner_id:
                        parent_role = family_file.parent_a_role or "parent_a"
                    elif family_file.parent_b_id == collection.owner_id:
                        parent_role = family_file.parent_b_role or "parent_b"
                    else:
                        parent_role = None

                    if parent_role:
                        role_label = parent_role.replace("_", " ").title()
                        if role_label == "Parent A":
                            label = "Parent A's Time"
                        elif role_label == "Parent B":
                            label = "Parent B's Time"
                        elif role_label == "Mother":
                            label = "Mom's Time"
                        elif role_label == "Father":
                            label = "Dad's Time"
                        else:
                            label = f"{role_label}'s Time"

            return {
                "id": collection.id,
                "case_id": collection.case_id,
                "family_file_id": collection.family_file_id,
                "owner_id": collection.owner_id,
                "name": label,  # Generic label, not real name
                "color": "#94A3B8",  # Neutral gray
                "is_default": False,  # Don't expose
                "is_active": collection.is_active,
                "display_order": collection.display_order,
                "is_owner": False,
                "created_at": collection.created_at.isoformat(),
                "updated_at": collection.updated_at.isoformat()
            }

    @staticmethod
    async def get_default_collection(
        db: AsyncSession,
        case_id: str,
        user_id: str
    ) -> Optional[MyTimeCollection]:
        """
        Get the user's default collection for a case.

        Args:
            db: Database session
            case_id: Case UUID
            user_id: User UUID

        Returns:
            Default MyTimeCollection or None
        """
        result = await db.execute(
            select(MyTimeCollection).where(
                MyTimeCollection.case_id == case_id,
                MyTimeCollection.owner_id == user_id,
                MyTimeCollection.is_default == True,
                MyTimeCollection.is_active == True
            )
        )
        return result.scalar_one_or_none()
