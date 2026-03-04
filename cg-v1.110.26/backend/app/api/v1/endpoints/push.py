"""
Push notification endpoints for Web Push subscriptions.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.push_subscription import PushSubscription

router = APIRouter(tags=["Push Notifications"])


class PushSubscriptionCreate(BaseModel):
    """Request body for subscribing to push notifications."""
    endpoint: str
    p256dh_key: str
    auth_key: str


class PushSubscriptionResponse(BaseModel):
    """Response after subscribing to push notifications."""
    id: str
    endpoint: str
    is_active: bool


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    Get the VAPID public key for push subscription.

    Returns the public key needed by the frontend to subscribe to push notifications.
    """
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured"
        )

    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    user_agent: str = Header(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register a push subscription for the current user.

    The subscription data comes from the browser's PushManager.subscribe() call.
    """
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured"
        )

    # Check if this endpoint already exists
    result = await db.execute(
        select(PushSubscription)
        .where(PushSubscription.endpoint == subscription.endpoint)
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update the existing subscription if it belongs to this user
        if existing.user_id == current_user.id:
            existing.p256dh_key = subscription.p256dh_key
            existing.auth_key = subscription.auth_key
            existing.user_agent = user_agent
            existing.is_active = True
            await db.commit()
            await db.refresh(existing)
            return PushSubscriptionResponse(
                id=existing.id,
                endpoint=existing.endpoint,
                is_active=existing.is_active
            )
        else:
            # Endpoint registered to different user - reassign
            existing.user_id = current_user.id
            existing.p256dh_key = subscription.p256dh_key
            existing.auth_key = subscription.auth_key
            existing.user_agent = user_agent
            existing.is_active = True
            await db.commit()
            await db.refresh(existing)
            return PushSubscriptionResponse(
                id=existing.id,
                endpoint=existing.endpoint,
                is_active=existing.is_active
            )

    # Create new subscription
    new_subscription = PushSubscription(
        user_id=current_user.id,
        endpoint=subscription.endpoint,
        p256dh_key=subscription.p256dh_key,
        auth_key=subscription.auth_key,
        user_agent=user_agent,
        is_active=True
    )
    db.add(new_subscription)
    await db.commit()
    await db.refresh(new_subscription)

    return PushSubscriptionResponse(
        id=new_subscription.id,
        endpoint=new_subscription.endpoint,
        is_active=new_subscription.is_active
    )


@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a push subscription for the current user.

    Args:
        endpoint: The push endpoint URL to unsubscribe
    """
    result = await db.execute(
        select(PushSubscription)
        .where(PushSubscription.endpoint == endpoint)
        .where(PushSubscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    await db.execute(
        delete(PushSubscription)
        .where(PushSubscription.id == subscription.id)
    )
    await db.commit()

    return {"message": "Unsubscribed successfully"}


@router.get("/subscriptions")
async def list_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all push subscriptions for the current user.
    """
    result = await db.execute(
        select(PushSubscription)
        .where(PushSubscription.user_id == current_user.id)
        .where(PushSubscription.is_active == True)
    )
    subscriptions = result.scalars().all()

    return {
        "count": len(subscriptions),
        "subscriptions": [
            {
                "id": sub.id,
                "user_agent": sub.user_agent,
                "created_at": sub.created_at.isoformat() if sub.created_at else None
            }
            for sub in subscriptions
        ]
    }
