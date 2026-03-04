"""
User management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.supabase import get_supabase_client
from app.models.user import User, UserProfile
from app.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    NotificationPreferences,
    NotificationPreferencesResponse,
    PasswordChangeRequest,
    PasswordChangeResponse,
)

router = APIRouter()


@router.get("/me/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's profile.
    """
    # Load user with profile relationship
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    profile = user.profile

    return UserProfileResponse(
        id=profile.id,
        user_id=user.id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        preferred_name=profile.preferred_name,
        email=user.email,
        phone=user.phone,
        avatar_url=profile.avatar_url,
        timezone=profile.timezone,
        address_line1=profile.address_line1,
        address_line2=profile.address_line2,
        city=profile.city,
        state=profile.state,
        zip_code=profile.zip_code,
        subscription_tier=profile.subscription_tier,
        subscription_status=profile.subscription_status,
        created_at=profile.created_at,
    )


@router.put("/me/profile", response_model=UserProfileResponse)
async def update_user_profile(
    update: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile.
    """
    # Load user with profile relationship
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    profile = user.profile

    # Update profile fields if provided
    update_data = update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    # Also update user-level name fields if changed
    if update.first_name:
        user.first_name = update.first_name
    if update.last_name:
        user.last_name = update.last_name
    if update.phone:
        user.phone = update.phone

    await db.commit()
    await db.refresh(profile)
    await db.refresh(user)

    return UserProfileResponse(
        id=profile.id,
        user_id=user.id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        preferred_name=profile.preferred_name,
        email=user.email,
        phone=user.phone,
        avatar_url=profile.avatar_url,
        timezone=profile.timezone,
        address_line1=profile.address_line1,
        address_line2=profile.address_line2,
        city=profile.city,
        state=profile.state,
        zip_code=profile.zip_code,
        subscription_tier=profile.subscription_tier,
        subscription_status=profile.subscription_status,
        created_at=profile.created_at,
    )


@router.get("/me/notifications", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's notification preferences.
    """
    # Load user with profile
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    profile = user.profile

    # Return notification preferences (using simplified model)
    # In a full implementation, these would be stored in the profile
    return NotificationPreferencesResponse(
        email_messages=profile.notification_email,
        email_schedule=profile.notification_email,
        email_agreements=profile.notification_email,
        email_payments=profile.notification_email,
        email_court=profile.notification_email,
        email_aria=profile.notification_email,
        push_messages=profile.notification_push,
        push_schedule=profile.notification_push,
        push_agreements=profile.notification_push,
        push_payments=profile.notification_push,
        push_court=profile.notification_push,
        push_aria=profile.notification_push,
    )


@router.put("/me/notifications", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's notification preferences.
    """
    # Load user with profile
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    profile = user.profile

    # Update general notification preferences
    # Check if any email notification is enabled
    profile.notification_email = any([
        preferences.email_messages,
        preferences.email_schedule,
        preferences.email_agreements,
        preferences.email_payments,
        preferences.email_court,
        preferences.email_aria,
    ])

    # Check if any push notification is enabled
    profile.notification_push = any([
        preferences.push_messages,
        preferences.push_schedule,
        preferences.push_agreements,
        preferences.push_payments,
        preferences.push_court,
        preferences.push_aria,
    ])

    await db.commit()
    await db.refresh(profile)

    return NotificationPreferencesResponse(
        email_messages=preferences.email_messages,
        email_schedule=preferences.email_schedule,
        email_agreements=preferences.email_agreements,
        email_payments=preferences.email_payments,
        email_court=preferences.email_court,
        email_aria=preferences.email_aria,
        push_messages=preferences.push_messages,
        push_schedule=preferences.push_schedule,
        push_agreements=preferences.push_agreements,
        push_payments=preferences.push_payments,
        push_court=preferences.push_court,
        push_aria=preferences.push_aria,
    )


@router.put("/me/password", response_model=PasswordChangeResponse)
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change current user's password.

    Requires the current password for verification.
    """
    try:
        supabase = get_supabase_client()

        # First verify current password by attempting to sign in
        try:
            supabase.auth.sign_in_with_password({
                "email": current_user.email,
                "password": request.current_password,
            })
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        # Update password via Supabase
        supabase.auth.update_user({
            "password": request.new_password
        })

        return PasswordChangeResponse(
            message="Password changed successfully",
            success=True
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )
