"""
KidsCubbie API endpoints for managing high-value items.

Items tracked here are things parents would want documented for court
if lost or damaged (Nintendo Switch, school laptops, tablets, etc.)
"""

from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.cubbie import CubbieService
from app.schemas.cubbie import (
    CubbieItemCreate,
    CubbieItemUpdate,
    CubbieItemResponse,
    CubbieItemListResponse,
    CubbieExchangeItemCreate,
    CubbieExchangeItemAcknowledge,
    CubbieExchangeItemDispute,
    CubbieExchangeItemResponse,
    ExchangeItemsResponse,
    ChildPhotoCreate,
    ChildPhotoResponse,
)

router = APIRouter()


# === CUBBIE ITEM ENDPOINTS ===

@router.post(
    "/items",
    response_model=CubbieItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add item to cubbie",
    description="Add a high-value item to track for a child.",
)
async def create_item(
    item_data: CubbieItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new cubbie item for a child."""
    service = CubbieService(db)
    item = await service.create_item(item_data, current_user)
    return item


@router.get(
    "/items/child/{child_id}",
    response_model=CubbieItemListResponse,
    summary="List child's cubbie items",
    description="Get all high-value items for a specific child.",
)
async def list_child_items(
    child_id: str,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all cubbie items for a child."""
    service = CubbieService(db)
    child, items, total_value = await service.list_items_for_child(
        child_id, current_user, include_inactive
    )
    return CubbieItemListResponse(
        child_id=child.id,
        child_name=child.display_name,
        items=items,
        total_value=total_value,
        active_count=sum(1 for item in items if item.is_active),
    )


@router.get(
    "/items/case/{case_id}",
    summary="List all items for a case",
    description="Get all cubbie items for all children in a case.",
)
async def list_case_items(
    case_id: str,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all cubbie items for all children in a case."""
    service = CubbieService(db)
    result = await service.list_items_for_case(
        case_id, current_user, include_inactive
    )

    # Format response
    children_data = []
    for child_id, data in result.items():
        child = data["child"]
        items = data["items"]
        children_data.append({
            "child_id": child.id,
            "child_name": child.display_name,
            "items": items,
            "total_value": data["total_value"],
            "active_count": sum(1 for item in items if item.is_active),
        })

    return {"children": children_data}


@router.get(
    "/items/{item_id}",
    response_model=CubbieItemResponse,
    summary="Get item details",
    description="Get details of a specific cubbie item.",
)
async def get_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific cubbie item."""
    service = CubbieService(db)
    return await service.get_item(item_id, current_user)


@router.put(
    "/items/{item_id}",
    response_model=CubbieItemResponse,
    summary="Update item",
    description="Update a cubbie item's details or location.",
)
async def update_item(
    item_id: str,
    item_data: CubbieItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a cubbie item."""
    service = CubbieService(db)
    return await service.update_item(item_id, item_data, current_user)


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove item",
    description="Soft delete (deactivate) a cubbie item.",
)
async def delete_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete (deactivate) a cubbie item."""
    service = CubbieService(db)
    await service.delete_item(item_id, current_user)


@router.post(
    "/items/{item_id}/photo",
    response_model=CubbieItemResponse,
    summary="Set item photo URL",
    description="Set or update the photo URL for a cubbie item.",
)
async def update_item_photo(
    item_id: str,
    photo_url: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an item's photo URL."""
    service = CubbieService(db)
    return await service.update_item_photo(item_id, photo_url, current_user)


@router.post(
    "/items/{item_id}/photo/upload",
    response_model=CubbieItemResponse,
    summary="Upload item photo file",
    description="Upload a photo file for a cubbie item.",
)
async def upload_item_photo(
    item_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and save an item's photo file."""
    import os
    import uuid
    from pathlib import Path

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, GIF, or WebP."
        )

    # Create uploads directory if needed
    uploads_dir = Path(__file__).parent.parent.parent.parent.parent / "uploads" / "cubbie"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{item_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = uploads_dir / filename

    # Save file
    try:
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Update item with photo URL
    photo_url = f"/uploads/cubbie/{filename}"
    service = CubbieService(db)
    return await service.update_item_photo(item_id, photo_url, current_user)


# === EXCHANGE ITEM ENDPOINTS ===

@router.post(
    "/exchange/{exchange_id}/items",
    response_model=List[CubbieExchangeItemResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add items to exchange",
    description="Select cubbie items to travel with child during an exchange.",
)
async def add_items_to_exchange(
    exchange_id: str,
    item_data: CubbieExchangeItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add cubbie items to a custody exchange."""
    service = CubbieService(db)
    items = await service.add_items_to_exchange(
        exchange_id, item_data, current_user
    )

    # Format response with item names
    result = []
    for item in items:
        result.append(CubbieExchangeItemResponse(
            id=item.id,
            exchange_id=item.exchange_id,
            cubbie_item_id=item.cubbie_item_id,
            item_name=item.cubbie_item.name if item.cubbie_item else "Unknown",
            item_photo_url=item.cubbie_item.photo_url if item.cubbie_item else None,
            sent_by=item.sent_by,
            sent_at=item.sent_at,
            condition_sent=item.condition_sent,
            is_disputed=item.is_disputed,
            created_at=item.created_at,
        ))
    return result


@router.get(
    "/exchange/{exchange_id}/items",
    response_model=ExchangeItemsResponse,
    summary="Get exchange items",
    description="Get all cubbie items included in an exchange.",
)
async def get_exchange_items(
    exchange_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get items for a custody exchange."""
    service = CubbieService(db)
    items = await service.get_exchange_items(exchange_id, current_user)

    # Format and count
    formatted_items = []
    pending_count = 0
    disputed_count = 0

    for item in items:
        if not item.acknowledged_at:
            pending_count += 1
        if item.is_disputed:
            disputed_count += 1

        formatted_items.append(CubbieExchangeItemResponse(
            id=item.id,
            exchange_id=item.exchange_id,
            cubbie_item_id=item.cubbie_item_id,
            item_name=item.cubbie_item.name if item.cubbie_item else "Unknown",
            item_photo_url=item.cubbie_item.photo_url if item.cubbie_item else None,
            sent_by=item.sent_by,
            sent_at=item.sent_at,
            acknowledged_by=item.acknowledged_by,
            acknowledged_at=item.acknowledged_at,
            condition_sent=item.condition_sent,
            condition_received=item.condition_received,
            condition_notes=item.condition_notes,
            photo_sent_url=item.photo_sent_url,
            photo_received_url=item.photo_received_url,
            is_disputed=item.is_disputed,
            dispute_notes=item.dispute_notes,
            dispute_resolved=item.dispute_resolved,
            dispute_resolved_at=item.dispute_resolved_at,
            created_at=item.created_at,
        ))

    return ExchangeItemsResponse(
        exchange_id=exchange_id,
        items=formatted_items,
        pending_acknowledgment=pending_count,
        disputed_count=disputed_count,
    )


@router.put(
    "/exchange/{exchange_id}/items/{item_id}/acknowledge",
    response_model=CubbieExchangeItemResponse,
    summary="Acknowledge item receipt",
    description="Acknowledge receiving an item and optionally report condition.",
)
async def acknowledge_item(
    exchange_id: str,
    item_id: str,
    ack_data: CubbieExchangeItemAcknowledge,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acknowledge receipt of an exchange item."""
    service = CubbieService(db)
    item = await service.acknowledge_item(
        exchange_id, item_id, ack_data, current_user
    )
    return CubbieExchangeItemResponse(
        id=item.id,
        exchange_id=item.exchange_id,
        cubbie_item_id=item.cubbie_item_id,
        item_name=item.cubbie_item.name if item.cubbie_item else "Unknown",
        sent_by=item.sent_by,
        sent_at=item.sent_at,
        acknowledged_by=item.acknowledged_by,
        acknowledged_at=item.acknowledged_at,
        condition_sent=item.condition_sent,
        condition_received=item.condition_received,
        condition_notes=item.condition_notes,
        is_disputed=item.is_disputed,
        created_at=item.created_at,
    )


@router.put(
    "/exchange/{exchange_id}/items/{item_id}/condition",
    response_model=CubbieExchangeItemResponse,
    summary="Report item condition",
    description="Update the received condition of an item.",
)
async def update_item_condition(
    exchange_id: str,
    item_id: str,
    ack_data: CubbieExchangeItemAcknowledge,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update condition report for an exchange item."""
    # Reuse acknowledge logic
    service = CubbieService(db)
    item = await service.acknowledge_item(
        exchange_id, item_id, ack_data, current_user
    )
    return CubbieExchangeItemResponse(
        id=item.id,
        exchange_id=item.exchange_id,
        cubbie_item_id=item.cubbie_item_id,
        item_name=item.cubbie_item.name if item.cubbie_item else "Unknown",
        sent_by=item.sent_by,
        sent_at=item.sent_at,
        acknowledged_by=item.acknowledged_by,
        acknowledged_at=item.acknowledged_at,
        condition_sent=item.condition_sent,
        condition_received=item.condition_received,
        condition_notes=item.condition_notes,
        is_disputed=item.is_disputed,
        created_at=item.created_at,
    )


@router.post(
    "/exchange/{exchange_id}/items/{item_id}/dispute",
    response_model=CubbieExchangeItemResponse,
    summary="Flag item as disputed",
    description="Flag an item as disputed (lost, damaged, etc.).",
)
async def dispute_item(
    exchange_id: str,
    item_id: str,
    dispute_data: CubbieExchangeItemDispute,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Flag an exchange item as disputed."""
    service = CubbieService(db)
    item = await service.dispute_item(
        exchange_id, item_id, dispute_data, current_user
    )
    return CubbieExchangeItemResponse(
        id=item.id,
        exchange_id=item.exchange_id,
        cubbie_item_id=item.cubbie_item_id,
        item_name=item.cubbie_item.name if item.cubbie_item else "Unknown",
        sent_by=item.sent_by,
        sent_at=item.sent_at,
        is_disputed=item.is_disputed,
        dispute_notes=item.dispute_notes,
        created_at=item.created_at,
    )


# === CHILD PHOTO ENDPOINTS ===

@router.get(
    "/children/{child_id}/photos",
    response_model=List[ChildPhotoResponse],
    summary="Get child photos",
    description="Get all photos in a child's gallery.",
)
async def get_child_photos(
    child_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all photos for a child."""
    service = CubbieService(db)
    return await service.get_child_photos(child_id, current_user)


@router.post(
    "/children/{child_id}/photos",
    response_model=ChildPhotoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add child photo",
    description="Add a photo to a child's gallery.",
)
async def add_child_photo(
    child_id: str,
    photo_data: ChildPhotoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a photo to a child's gallery."""
    service = CubbieService(db)
    return await service.add_child_photo(child_id, photo_data, current_user)


@router.put(
    "/children/{child_id}/photos/{photo_id}/profile",
    response_model=ChildPhotoResponse,
    summary="Set profile photo",
    description="Set a photo as the child's profile picture.",
)
async def set_profile_photo(
    child_id: str,
    photo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a photo as the child's profile photo."""
    service = CubbieService(db)
    return await service.set_profile_photo(child_id, photo_id, current_user)
