"""
Family Messaging endpoints — persistent parent↔child text inbox.

Unlike kidcoms.py's session-scoped chat (which requires an ACTIVE video call),
these endpoints expose a standalone inbox: parents can always text their kids,
children can always text their parents, and messages are stored permanently.

All messages are analyzed by ARIA (see FamilyMessagingService).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_current_child_user,
    get_current_user,
    decode_token,
)
from app.models.child import Child
from app.models.family_file import FamilyFile
from app.models.kidcoms import ChildUser
from app.models.user import User
from app.schemas.parent_child_message import (
    ParentChildMessageCreate,
    ParentChildMessageListResponse,
    ParentChildMessageResponse,
    ParentChildThreadListResponse,
)
from app.services.family_messaging import family_messaging_service

logger = logging.getLogger(__name__)

router = APIRouter()
bearer_scheme = HTTPBearer()


# ============================================================
# Helpers
# ============================================================


async def _get_family_file_with_access(
    db: AsyncSession, family_file_id: str, user_id: str
) -> FamilyFile:
    """Load a family file and verify the user is parent_a or parent_b."""
    result = await db.execute(
        select(FamilyFile).where(FamilyFile.id == family_file_id)
    )
    ff = result.scalar_one_or_none()
    if ff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Family file not found"
        )
    if ff.parent_a_id != user_id and ff.parent_b_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this family file",
        )
    return ff


async def _get_child_for_parent(
    db: AsyncSession, child_id: str, parent_user: User
) -> tuple[Child, FamilyFile]:
    """Load a child + its family file, checking the parent is a member."""
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None or child.family_file_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Child not found"
        )
    ff = await _get_family_file_with_access(db, child.family_file_id, parent_user.id)
    return child, ff


async def _require_child_owns_thread(child_user: ChildUser, child_id: str) -> None:
    """A child can only touch their own thread."""
    if child_user.child_id != child_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own messages",
        )


async def _get_requester(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> tuple[str, str, object]:
    """
    Accept either a parent (User) JWT or a child (ChildUser) JWT. Returns a
    tuple of (requester_type, requester_id, user_object) so endpoints that
    both parents AND children can hit share code.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_type = payload.get("type")

    if token_type == "child_user":
        child_user_id = payload.get("sub")
        if not child_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid child token"
            )
        result = await db.execute(
            select(ChildUser).where(ChildUser.id == child_user_id)
        )
        cu = result.scalar_one_or_none()
        if cu is None or not cu.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Child not found"
            )
        return "child", cu.child_id, cu

    # Fall through to treating this as a parent token.
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return "parent", user.id, user


# ============================================================
# Parent inbox — list all child threads
# ============================================================


@router.get(
    "/threads",
    response_model=ParentChildThreadListResponse,
    summary="List parent inbox threads",
    description="One entry per child in any family file the parent belongs to.",
)
async def list_parent_threads(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    summaries = await family_messaging_service.list_parent_threads(db, current_user)
    return ParentChildThreadListResponse(items=summaries, total=len(summaries))


# ============================================================
# Thread messages — parent OR child
# ============================================================


@router.get(
    "/threads/{child_id}/messages",
    response_model=ParentChildMessageListResponse,
    summary="List thread messages",
    description="Accessible by the parents on the child's family file or the child themselves.",
)
async def list_thread_messages(
    child_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    requester: tuple[str, str, object] = Depends(_get_requester),
    db: AsyncSession = Depends(get_db),
):
    requester_type, requester_id, requester_obj = requester

    if requester_type == "child":
        await _require_child_owns_thread(requester_obj, child_id)
        family_file_id = requester_obj.family_file_id
    else:
        child, ff = await _get_child_for_parent(db, child_id, requester_obj)
        family_file_id = ff.id

    messages, total, unread = await family_messaging_service.list_thread(
        db,
        family_file_id=family_file_id,
        child_id=child_id,
        requester_id=requester_id,
        requester_type=requester_type,
        limit=limit,
        offset=offset,
    )
    return ParentChildMessageListResponse(
        items=[ParentChildMessageResponse.model_validate(m) for m in messages],
        total=total,
        unread_count=unread,
    )


# ============================================================
# Send message (parent)
# ============================================================


@router.post(
    "/threads/{child_id}/messages",
    response_model=ParentChildMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send message from parent to child",
)
async def send_parent_message(
    child_id: str,
    payload: ParentChildMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    child, family_file = await _get_child_for_parent(db, child_id, current_user)
    message = await family_messaging_service.send_from_parent(
        db,
        family_file=family_file,
        parent_user=current_user,
        child=child,
        content=payload.content,
    )
    return ParentChildMessageResponse.model_validate(message)


# ============================================================
# Send message (child)
# ============================================================


@router.post(
    "/threads/{child_id}/messages/from-child",
    response_model=ParentChildMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send message from child to parents",
)
async def send_child_message(
    child_id: str,
    payload: ParentChildMessageCreate,
    current_child: ChildUser = Depends(get_current_child_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_child_owns_thread(current_child, child_id)
    message = await family_messaging_service.send_from_child(
        db,
        child_user=current_child,
        content=payload.content,
    )
    return ParentChildMessageResponse.model_validate(message)


# ============================================================
# Mark thread read
# ============================================================


@router.post(
    "/threads/{child_id}/mark-read",
    summary="Mark messages from the other side as read",
)
async def mark_thread_read(
    child_id: str,
    requester: tuple[str, str, object] = Depends(_get_requester),
    db: AsyncSession = Depends(get_db),
):
    requester_type, _requester_id, requester_obj = requester

    if requester_type == "child":
        await _require_child_owns_thread(requester_obj, child_id)
        family_file_id = requester_obj.family_file_id
    else:
        _child, ff = await _get_child_for_parent(db, child_id, requester_obj)
        family_file_id = ff.id

    updated = await family_messaging_service.mark_thread_read(
        db,
        family_file_id=family_file_id,
        child_id=child_id,
        requester_type=requester_type,
    )
    return {"updated": updated}
