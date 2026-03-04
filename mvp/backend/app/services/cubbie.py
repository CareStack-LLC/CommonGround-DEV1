"""
KidsCubbie service for managing high-value items that travel with children.

This service handles:
- Creating and managing cubbie items
- Tracking items during custody exchanges
- Item acknowledgment and condition reporting
- Dispute management
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cubbie import CubbieItem, CubbieExchangeItem, ChildPhoto
from app.models.child import Child
from app.models.case import Case, CaseParticipant
from app.models.family_file import FamilyFile
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.user import User
from app.services.access_control import check_case_or_family_file_access, AccessResult
from app.schemas.cubbie import (
    CubbieItemCreate,
    CubbieItemUpdate,
    CubbieExchangeItemCreate,
    CubbieExchangeItemAcknowledge,
    CubbieExchangeItemDispute,
    ChildPhotoCreate,
)


class CubbieService:
    """Service for managing KidsCubbie items and exchange tracking."""

    def __init__(self, db: AsyncSession):
        """Initialize cubbie service."""
        self.db = db

    async def _verify_case_access(
        self, case_id: str, user_id: str
    ) -> AccessResult:
        """Verify user has access to the case or family file."""
        access = await check_case_or_family_file_access(
            self.db, case_id, user_id
        )
        if not access.has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this case",
            )
        return access

    async def _get_child_with_case(self, child_id: str) -> Child:
        """Get child and verify it exists."""
        result = await self.db.execute(
            select(Child).where(Child.id == child_id)
        )
        child = result.scalar_one_or_none()
        if not child:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Child not found",
            )
        return child

    # === CUBBIE ITEM OPERATIONS ===

    async def create_item(
        self,
        item_data: CubbieItemCreate,
        user: User,
    ) -> CubbieItem:
        """
        Create a new cubbie item.

        Args:
            item_data: Item creation data
            user: User creating the item

        Returns:
            Created CubbieItem
        """
        # Get child and verify access
        child = await self._get_child_with_case(item_data.child_id)
        # Use case_id or family_file_id depending on which is set
        case_or_ff_id = child.case_id or child.family_file_id
        await self._verify_case_access(case_or_ff_id, user.id)

        # Create the item - set case_id or family_file_id based on child's parent
        item = CubbieItem(
            child_id=child.id,
            case_id=child.case_id,  # Will be None for family file children
            family_file_id=child.family_file_id,  # Will be None for case children
            name=item_data.name,
            description=item_data.description,
            category=item_data.category.value,
            estimated_value=item_data.estimated_value,
            purchase_date=item_data.purchase_date,
            serial_number=item_data.serial_number,
            notes=item_data.notes,
            added_by=user.id,
            current_location=item_data.current_location.value,
            last_location_update=datetime.utcnow(),
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def get_item(
        self,
        item_id: str,
        user: User,
    ) -> CubbieItem:
        """Get a cubbie item by ID."""
        result = await self.db.execute(
            select(CubbieItem).where(CubbieItem.id == item_id)
        )
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found",
            )

        # Verify access - use case_id or family_file_id
        case_or_ff_id = item.case_id or item.family_file_id
        await self._verify_case_access(case_or_ff_id, user.id)
        return item

    async def list_items_for_child(
        self,
        child_id: str,
        user: User,
        include_inactive: bool = False,
    ) -> Tuple[Child, List[CubbieItem], Decimal]:
        """
        List all cubbie items for a child.

        Returns:
            Tuple of (child, items, total_value)
        """
        child = await self._get_child_with_case(child_id)
        case_or_ff_id = child.case_id or child.family_file_id
        await self._verify_case_access(case_or_ff_id, user.id)

        query = select(CubbieItem).where(CubbieItem.child_id == child_id)
        if not include_inactive:
            query = query.where(CubbieItem.is_active == True)
        query = query.order_by(CubbieItem.created_at.desc())

        result = await self.db.execute(query)
        items = result.scalars().all()

        # Calculate total value
        total_value = sum(
            item.estimated_value or Decimal("0") for item in items
        )

        return child, list(items), total_value

    async def list_items_for_case(
        self,
        case_id: str,
        user: User,
        include_inactive: bool = False,
    ) -> dict:
        """
        List all cubbie items for a case or family file, grouped by child.

        Returns:
            Dict with children and their items
        """
        access = await self._verify_case_access(case_id, user.id)

        # Get all children for the case or family file
        if access.is_family_file:
            children_result = await self.db.execute(
                select(Child).where(
                    and_(
                        Child.family_file_id == case_id,
                        Child.is_active == True,
                    )
                )
            )
        else:
            children_result = await self.db.execute(
                select(Child).where(
                    and_(
                        Child.case_id == access.effective_case_id,
                        Child.is_active == True,
                    )
                )
            )
        children = children_result.scalars().all()

        result = {}
        for child in children:
            query = select(CubbieItem).where(
                CubbieItem.child_id == child.id
            )
            if not include_inactive:
                query = query.where(CubbieItem.is_active == True)

            items_result = await self.db.execute(query)
            items = items_result.scalars().all()

            result[child.id] = {
                "child": child,
                "items": list(items),
                "total_value": sum(
                    item.estimated_value or Decimal("0") for item in items
                ),
            }

        return result

    async def update_item(
        self,
        item_id: str,
        item_data: CubbieItemUpdate,
        user: User,
    ) -> CubbieItem:
        """Update a cubbie item."""
        item = await self.get_item(item_id, user)

        # Update fields if provided
        update_data = item_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "current_location" and value:
                setattr(item, field, value.value)
                item.last_location_update = datetime.utcnow()
            elif field == "category" and value:
                setattr(item, field, value.value)
            else:
                setattr(item, field, value)

        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete_item(
        self,
        item_id: str,
        user: User,
    ) -> bool:
        """Soft delete (deactivate) a cubbie item."""
        item = await self.get_item(item_id, user)
        item.is_active = False
        await self.db.commit()
        return True

    async def update_item_photo(
        self,
        item_id: str,
        photo_url: str,
        user: User,
    ) -> CubbieItem:
        """Update item photo."""
        item = await self.get_item(item_id, user)
        item.photo_url = photo_url
        await self.db.commit()
        await self.db.refresh(item)
        return item

    # === EXCHANGE ITEM OPERATIONS ===

    async def add_items_to_exchange(
        self,
        exchange_id: str,
        item_data: CubbieExchangeItemCreate,
        user: User,
    ) -> List[CubbieExchangeItem]:
        """
        Add cubbie items to a custody exchange.

        Args:
            exchange_id: Exchange instance ID
            item_data: List of cubbie item IDs to add
            user: Sending parent

        Returns:
            List of created CubbieExchangeItem records
        """
        # Verify exchange exists
        exchange_result = await self.db.execute(
            select(CustodyExchangeInstance).where(
                CustodyExchangeInstance.id == exchange_id
            )
        )
        exchange = exchange_result.scalar_one_or_none()
        if not exchange:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exchange not found",
            )

        created_items = []
        for cubbie_item_id in item_data.cubbie_item_ids:
            # Verify item exists and user has access
            item = await self.get_item(cubbie_item_id, user)

            # Create exchange item record
            exchange_item = CubbieExchangeItem(
                exchange_id=exchange_id,
                cubbie_item_id=cubbie_item_id,
                sent_by=user.id,
                sent_at=datetime.utcnow(),
                condition_sent=item_data.condition_sent.value if item_data.condition_sent else None,
            )
            self.db.add(exchange_item)

            # Update item location to traveling
            item.current_location = "child_traveling"
            item.last_location_update = datetime.utcnow()

            created_items.append(exchange_item)

        await self.db.commit()

        # Refresh all items
        for item in created_items:
            await self.db.refresh(item)

        return created_items

    async def get_exchange_items(
        self,
        exchange_id: str,
        user: User,
    ) -> List[CubbieExchangeItem]:
        """Get all items for an exchange."""
        result = await self.db.execute(
            select(CubbieExchangeItem)
            .options(selectinload(CubbieExchangeItem.cubbie_item))
            .where(CubbieExchangeItem.exchange_id == exchange_id)
        )
        items = result.scalars().all()
        return list(items)

    async def acknowledge_item(
        self,
        exchange_id: str,
        item_id: str,
        ack_data: CubbieExchangeItemAcknowledge,
        user: User,
    ) -> CubbieExchangeItem:
        """Acknowledge receipt of an item in an exchange."""
        # Find the exchange item with its cubbie item
        result = await self.db.execute(
            select(CubbieExchangeItem)
            .options(selectinload(CubbieExchangeItem.cubbie_item))
            .where(
                and_(
                    CubbieExchangeItem.exchange_id == exchange_id,
                    CubbieExchangeItem.cubbie_item_id == item_id,
                )
            )
        )
        exchange_item = result.scalar_one_or_none()
        if not exchange_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exchange item not found",
            )

        # Verify user is the receiving parent (not the sender)
        if exchange_item.sent_by == user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sender cannot acknowledge their own items",
            )

        # Update acknowledgment
        exchange_item.acknowledged_by = user.id
        exchange_item.acknowledged_at = datetime.utcnow()
        exchange_item.condition_received = ack_data.condition_received.value if ack_data.condition_received else None
        exchange_item.condition_notes = ack_data.condition_notes

        # Update the cubbie item's location based on receiving parent
        cubbie_item = exchange_item.cubbie_item

        # Get the exchange instance and its parent to find case_id
        instance_result = await self.db.execute(
            select(CustodyExchangeInstance)
            .options(selectinload(CustodyExchangeInstance.exchange))
            .where(CustodyExchangeInstance.id == exchange_id)
        )
        instance = instance_result.scalar_one_or_none()

        if instance and instance.exchange:
            case_id = instance.exchange.case_id

            # Get the case participants to determine parent_a vs parent_b
            participants_result = await self.db.execute(
                select(CaseParticipant)
                .where(CaseParticipant.case_id == case_id)
                .order_by(CaseParticipant.joined_at)  # First to join is parent_a
            )
            participants = participants_result.scalars().all()

            if len(participants) >= 2:
                # First participant is parent_a, second is parent_b
                parent_a_id = participants[0].user_id
                parent_b_id = participants[1].user_id

                # Determine which parent is receiving
                if user.id == parent_a_id:
                    cubbie_item.current_location = "parent_a"
                elif user.id == parent_b_id:
                    cubbie_item.current_location = "parent_b"
                else:
                    # Fallback - shouldn't happen
                    cubbie_item.current_location = "parent_a"
            else:
                # Only one participant - use parent_a
                cubbie_item.current_location = "parent_a"

            cubbie_item.last_location_update = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(exchange_item)
        return exchange_item

    async def dispute_item(
        self,
        exchange_id: str,
        item_id: str,
        dispute_data: CubbieExchangeItemDispute,
        user: User,
    ) -> CubbieExchangeItem:
        """Flag an exchange item as disputed."""
        result = await self.db.execute(
            select(CubbieExchangeItem).where(
                and_(
                    CubbieExchangeItem.exchange_id == exchange_id,
                    CubbieExchangeItem.cubbie_item_id == item_id,
                )
            )
        )
        exchange_item = result.scalar_one_or_none()
        if not exchange_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exchange item not found",
            )

        exchange_item.is_disputed = True
        exchange_item.dispute_notes = dispute_data.dispute_notes

        await self.db.commit()
        await self.db.refresh(exchange_item)
        return exchange_item

    # === CHILD PHOTO OPERATIONS ===

    async def add_child_photo(
        self,
        child_id: str,
        photo_data: ChildPhotoCreate,
        user: User,
    ) -> ChildPhoto:
        """Add a photo to a child's gallery."""
        child = await self._get_child_with_case(child_id)
        case_or_ff_id = child.case_id or child.family_file_id
        await self._verify_case_access(case_or_ff_id, user.id)

        # If setting as profile photo, unset other profile photos
        if photo_data.is_profile_photo:
            await self.db.execute(
                select(ChildPhoto)
                .where(
                    and_(
                        ChildPhoto.child_id == child_id,
                        ChildPhoto.is_profile_photo == True,
                    )
                )
            )
            # Update existing profile photos
            existing_result = await self.db.execute(
                select(ChildPhoto).where(
                    and_(
                        ChildPhoto.child_id == child_id,
                        ChildPhoto.is_profile_photo == True,
                    )
                )
            )
            for existing in existing_result.scalars().all():
                existing.is_profile_photo = False

        photo = ChildPhoto(
            child_id=child_id,
            uploaded_by=user.id,
            photo_url=photo_data.photo_url,
            thumbnail_url=photo_data.thumbnail_url,
            caption=photo_data.caption,
            is_profile_photo=photo_data.is_profile_photo,
            taken_at=photo_data.taken_at,
        )
        self.db.add(photo)

        # If profile photo, also update child's photo_url
        if photo_data.is_profile_photo:
            child.photo_url = photo_data.photo_url

        await self.db.commit()
        await self.db.refresh(photo)
        return photo

    async def get_child_photos(
        self,
        child_id: str,
        user: User,
    ) -> List[ChildPhoto]:
        """Get all photos for a child."""
        child = await self._get_child_with_case(child_id)
        case_or_ff_id = child.case_id or child.family_file_id
        await self._verify_case_access(case_or_ff_id, user.id)

        result = await self.db.execute(
            select(ChildPhoto)
            .where(
                and_(
                    ChildPhoto.child_id == child_id,
                    ChildPhoto.is_active == True,
                )
            )
            .order_by(ChildPhoto.created_at.desc())
        )
        return list(result.scalars().all())

    async def set_profile_photo(
        self,
        child_id: str,
        photo_id: str,
        user: User,
    ) -> ChildPhoto:
        """Set a photo as the child's profile photo."""
        child = await self._get_child_with_case(child_id)
        case_or_ff_id = child.case_id or child.family_file_id
        await self._verify_case_access(case_or_ff_id, user.id)

        # Get the photo
        result = await self.db.execute(
            select(ChildPhoto).where(
                and_(
                    ChildPhoto.id == photo_id,
                    ChildPhoto.child_id == child_id,
                )
            )
        )
        photo = result.scalar_one_or_none()
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found",
            )

        # Unset existing profile photos
        existing_result = await self.db.execute(
            select(ChildPhoto).where(
                and_(
                    ChildPhoto.child_id == child_id,
                    ChildPhoto.is_profile_photo == True,
                )
            )
        )
        for existing in existing_result.scalars().all():
            existing.is_profile_photo = False

        # Set new profile photo
        photo.is_profile_photo = True
        child.photo_url = photo.photo_url

        await self.db.commit()
        await self.db.refresh(photo)
        return photo
