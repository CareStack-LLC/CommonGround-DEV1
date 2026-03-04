"""
My Time Collection endpoints for privacy-first schedule organization.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.schedule import (
    MyTimeCollectionCreate,
    MyTimeCollectionUpdate,
    MyTimeCollectionResponse,
)
from app.services.collection import CollectionService

router = APIRouter()


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=MyTimeCollectionResponse,
    summary="Create My Time collection",
    description="Create a new private collection for organizing your schedule."
)
async def create_collection(
    collection_data: MyTimeCollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new My Time collection.

    - **name**: Private name (e.g., "Work Hours", "Time with Kids")
    - **color**: Hex color for calendar display (default: #3B82F6)
    - **is_default**: Set as default collection for quick event creation
    """
    try:
        collection = await CollectionService.create_collection(
            db=db,
            case_id=collection_data.case_id,
            owner_id=current_user.id,
            name=collection_data.name,
            color=collection_data.color,
            is_default=collection_data.is_default
        )

        # Filter for owner (they created it, so they own it)
        filtered_data = await CollectionService.filter_for_viewer(
            collection=collection,
            viewer_id=current_user.id,
            db=db
        )

        return MyTimeCollectionResponse(**filtered_data)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{collection_id}",
    response_model=MyTimeCollectionResponse,
    summary="Get collection",
    description="Get a collection by ID (privacy filtered)."
)
async def get_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a collection by ID.

    Privacy rules:
    - Owner sees real name and color
    - Other parent sees generic label (e.g., "Mom's Time")
    """
    collection = await CollectionService.get_collection(
        db=db,
        collection_id=collection_id,
        viewer_id=current_user.id
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found or no access"
        )

    # Apply privacy filtering
    filtered_data = await CollectionService.filter_for_viewer(
        collection=collection,
        viewer_id=current_user.id,
        db=db
    )

    return MyTimeCollectionResponse(**filtered_data)


@router.get(
    "/cases/{case_id}",
    response_model=List[MyTimeCollectionResponse],
    summary="List collections for case",
    description="Get all collections for a case (privacy filtered)."
)
async def list_collections(
    case_id: str,
    include_other_parent: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all collections for a case.

    - **include_other_parent**: If true, includes other parent's collections (filtered)

    Returns collections with privacy filtering applied.
    """
    try:
        collections = await CollectionService.list_collections(
            db=db,
            case_id=case_id,
            viewer_id=current_user.id,
            include_other_parent=include_other_parent
        )

        # Apply privacy filtering to each collection
        filtered_collections = []
        for collection in collections:
            filtered_data = await CollectionService.filter_for_viewer(
                collection=collection,
                viewer_id=current_user.id,
                db=db
            )
            filtered_collections.append(MyTimeCollectionResponse(**filtered_data))

        return filtered_collections

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{collection_id}",
    response_model=MyTimeCollectionResponse,
    summary="Update collection",
    description="Update a collection (owner only)."
)
async def update_collection(
    collection_id: str,
    collection_data: MyTimeCollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a collection.

    Only the owner can update their collection.
    """
    try:
        collection = await CollectionService.update_collection(
            db=db,
            collection_id=collection_id,
            user_id=current_user.id,
            name=collection_data.name,
            color=collection_data.color,
            is_default=collection_data.is_default
        )

        # Filter for owner
        filtered_data = await CollectionService.filter_for_viewer(
            collection=collection,
            viewer_id=current_user.id,
            db=db
        )

        return MyTimeCollectionResponse(**filtered_data)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{collection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete collection",
    description="Soft delete a collection (owner only)."
)
async def delete_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a collection (soft delete).

    Cannot delete default collections.
    """
    try:
        deleted = await CollectionService.delete_collection(
            db=db,
            collection_id=collection_id,
            user_id=current_user.id
        )

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )

        return None

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/cases/{case_id}/default",
    response_model=MyTimeCollectionResponse,
    summary="Get default collection",
    description="Get user's default collection for a case."
)
async def get_default_collection(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the user's default collection for quick event creation.
    """
    collection = await CollectionService.get_default_collection(
        db=db,
        case_id=case_id,
        user_id=current_user.id
    )

    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default collection found"
        )

    # Filter for owner
    filtered_data = await CollectionService.filter_for_viewer(
        collection=collection,
        viewer_id=current_user.id,
        db=db
    )

    return MyTimeCollectionResponse(**filtered_data)
