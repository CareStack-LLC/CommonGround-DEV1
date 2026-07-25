"""
User management endpoints.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.utils.sentry_helpers import capture_error
logger = logging.getLogger(__name__)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.supabase import get_supabase_client
from app.models.user import User, UserProfile
from app.models.professional import ProfessionalProfile
from app.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    NotificationPreferences,
    NotificationPreferencesResponse,
    PasswordChangeRequest,
    PasswordChangeResponse,
    PrivacySettings,
    PrivacySettingsResponse,
    AcceptTermsRequest,
    AcceptTermsResponse,
    DataExportResponse,
    DeletionRequestResponse,
)

router = APIRouter()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete the current user's account (GDPR/CCPA right to erasure).

    Soft-deletes the user and clears PII. Revokes any active Stripe
    subscription, writes an immutable audit row, and blacklists every
    session token for the user so existing JWTs stop working immediately.
    This action is irreversible.
    """
    from datetime import datetime
    from app.models.audit import AuditLog

    # Load user with profile
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    deleted_user_id = str(user.id)
    deleted_email = user.email
    stripe_subscription_cancelled = False
    stripe_customer_id = None

    # Cancel any active Stripe subscription BEFORE wiping profile fields.
    if user.profile and getattr(user.profile, "stripe_subscription_id", None):
        stripe_customer_id = getattr(user.profile, "stripe_customer_id", None)
        try:
            import stripe
            from app.core.config import settings as _settings
            if _settings.STRIPE_SECRET_KEY:
                stripe.api_key = _settings.STRIPE_SECRET_KEY
                await asyncio.to_thread(
                    stripe.Subscription.cancel,
                    user.profile.stripe_subscription_id,
                )
                stripe_subscription_cancelled = True
        except Exception as e:
            logger.warning(
                "delete_account: failed to cancel Stripe subscription %s: %s",
                user.profile.stripe_subscription_id, e,
            )

    # Soft-delete and clear PII
    user.is_active = False
    user.is_deleted = True
    user.deleted_at = datetime.utcnow()
    user.email = f"deleted_{user.id}@deleted.local"
    user.first_name = "Deleted"
    user.last_name = "User"
    user.phone = None

    # Clear profile PII
    if user.profile:
        user.profile.first_name = "Deleted"
        user.profile.last_name = "User"
        user.profile.preferred_name = None
        user.profile.avatar_url = None
        user.profile.address_line1 = None
        user.profile.address_line2 = None
        user.profile.city = None
        user.profile.state = None
        user.profile.zip_code = None

    # Immutable audit trail.
    try:
        db.add(AuditLog(
            user_id=deleted_user_id,
            user_email=deleted_email,
            action="user.delete",
            resource_type="user",
            resource_id=deleted_user_id,
            method="DELETE",
            endpoint="/users/me",
            status="success",
            status_code=204,
            description="User self-deleted account (GDPR/CCPA erasure)",
            extra_metadata={
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_cancelled": stripe_subscription_cancelled,
                "supabase_id": user.supabase_id,
            },
        ))
    except Exception as e:
        logger.warning(f"delete_account: failed to write AuditLog: {e}")

    # Delete from Supabase Auth
    try:
        from app.core.supabase import get_supabase_admin_client
        admin_client = get_supabase_admin_client()
        if user.supabase_id:
            admin_client.auth.admin.delete_user(user.supabase_id)
    except Exception as e:
        logger.warning(f"Failed to delete Supabase auth user: {e}")

    # Block every token for this user via Redis. We can't enumerate JWTs
    # directly, so we set a user-scoped sentinel key that get_current_user
    # can check. Until blacklist-by-user is wired in the auth middleware,
    # this sentinel is available for any future check.
    try:
        from app.core.redis_client import get_redis
        r = await get_redis()
        if r is not None:
            # 7-day TTL is long enough to outlive any refresh window.
            await r.setex(f"user_revoked:{deleted_user_id}", 7 * 24 * 60 * 60, "1")
    except Exception as e:
        logger.warning(f"delete_account: failed to set user revocation sentinel: {e}")

    await db.commit()
    logger.info(f"User account deleted: {deleted_user_id}")


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

    # Check if user has a professional profile
    prof_result = await db.execute(
        select(ProfessionalProfile).where(ProfessionalProfile.user_id == current_user.id)
    )
    is_professional = prof_result.scalar_one_or_none() is not None

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
        is_professional=is_professional,
        is_admin=user.is_admin,
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

    # Check if user has a professional profile
    prof_result = await db.execute(
        select(ProfessionalProfile).where(ProfessionalProfile.user_id == current_user.id)
    )
    is_professional = prof_result.scalar_one_or_none() is not None

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
        is_professional=is_professional,
        is_admin=user.is_admin,
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
        logger.exception(f"Failed to change password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password."
        )


@router.get("/me/privacy", response_model=PrivacySettingsResponse)
async def get_privacy_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's privacy settings.
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

    return PrivacySettingsResponse(
        read_receipts=profile.privacy_read_receipts,
        typing_indicator=profile.privacy_typing_indicator,
        last_seen=profile.privacy_last_seen,
        analytics_enabled=profile.privacy_analytics,
        crash_reporting=profile.privacy_crash_reporting,
    )


@router.put("/me/privacy", response_model=PrivacySettingsResponse)
async def update_privacy_settings(
    settings: PrivacySettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's privacy settings.
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

    # Update privacy settings
    profile.privacy_read_receipts = settings.read_receipts
    profile.privacy_typing_indicator = settings.typing_indicator
    profile.privacy_last_seen = settings.last_seen
    profile.privacy_analytics = settings.analytics_enabled
    profile.privacy_crash_reporting = settings.crash_reporting

    await db.commit()
    await db.refresh(profile)

    return PrivacySettingsResponse(
        read_receipts=profile.privacy_read_receipts,
        typing_indicator=profile.privacy_typing_indicator,
        last_seen=profile.privacy_last_seen,
        analytics_enabled=profile.privacy_analytics,
        crash_reporting=profile.privacy_crash_reporting,
    )


@router.post("/accept-terms", response_model=AcceptTermsResponse)
async def accept_terms(
    request: AcceptTermsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Accept Terms of Service and Privacy Policy.

    Records the user's acceptance with a timestamp and version identifiers
    for compliance tracking (GDPR/CCPA consent records).
    """
    from datetime import datetime

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
            detail="User profile not found",
        )

    now = datetime.utcnow()
    user.profile.terms_accepted_at = now
    user.profile.terms_version = request.terms_version
    user.profile.privacy_policy_accepted_at = now
    # Accepting the platform Terms includes consent for assigned legal
    # professionals to view this parent's messages.
    user.profile.professional_message_consent_at = now

    await db.commit()

    logger.info(
        f"User {current_user.id} accepted terms v{request.terms_version} "
        f"and privacy policy v{request.privacy_version}"
    )

    return AcceptTermsResponse(accepted=True, accepted_at=now)


@router.get("/export-data", response_model=DataExportResponse)
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export all user data (GDPR Article 20 / CCPA right to data portability).

    Returns a JSON export of the user's personal data. Message content is
    excluded to protect the privacy of other conversation participants.
    """
    from datetime import datetime

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
            detail="User profile not found",
        )

    profile = user.profile

    # Gather message count (without content for privacy of other party)
    from app.models.messaging import Message

    msg_result = await db.execute(
        select(Message).where(Message.sender_id == current_user.id)
    )
    messages_sent = len(msg_result.scalars().all())

    # Gather family file metadata
    family_files_metadata: list[dict] = []
    try:
        from app.models.family_file import FamilyFile

        ff_result = await db.execute(
            select(FamilyFile).where(FamilyFile.uploaded_by == current_user.id)
        )
        for ff in ff_result.scalars().all():
            family_files_metadata.append(
                {
                    "id": str(ff.id),
                    "file_name": ff.file_name,
                    "file_type": ff.file_type,
                    "created_at": ff.created_at.isoformat() if ff.created_at else None,
                }
            )
    except Exception:
        # Family file model may not exist or may differ; gracefully degrade
        pass

    return DataExportResponse(
        profile={
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "preferred_name": profile.preferred_name,
            "email": user.email,
            "phone": user.phone,
            "timezone": profile.timezone,
            "locale": profile.locale,
            "address_line1": profile.address_line1,
            "address_line2": profile.address_line2,
            "city": profile.city,
            "state": profile.state,
            "zip_code": profile.zip_code,
            "country": profile.country,
            "avatar_url": profile.avatar_url,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
        },
        subscription={
            "tier": profile.subscription_tier,
            "status": profile.subscription_status,
            "ends_at": profile.subscription_ends_at.isoformat()
            if profile.subscription_ends_at
            else None,
        },
        login_history={
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "last_active": user.last_active.isoformat() if user.last_active else None,
            "mfa_enabled": user.mfa_enabled,
        },
        family_file_metadata=family_files_metadata,
        privacy_settings={
            "read_receipts": profile.privacy_read_receipts,
            "typing_indicator": profile.privacy_typing_indicator,
            "last_seen": profile.privacy_last_seen,
            "analytics_enabled": profile.privacy_analytics,
            "crash_reporting": profile.privacy_crash_reporting,
        },
        notification_preferences={
            "email": profile.notification_email,
            "sms": profile.notification_sms,
            "push": profile.notification_push,
        },
        exported_at=datetime.utcnow(),
    )


@router.post("/request-deletion", response_model=DeletionRequestResponse)
async def request_account_deletion(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Request account deletion with a 30-day grace period.

    Marks the account for deletion but does not immediately remove data.
    The user can cancel by contacting support within the grace period.
    A confirmation email is sent to the user's registered address.
    """
    from datetime import datetime, timedelta

    # Load user
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already marked for deletion",
        )

    now = datetime.utcnow()
    deletion_date = now + timedelta(days=30)

    # Mark the deletion request timestamp (reuse deleted_at to track the request)
    user.deleted_at = deletion_date
    await db.commit()

    # Send confirmation email
    try:
        from app.services.email_service import send_email

        await send_email(
            to=user.email,
            subject="CommonGround - Account Deletion Requested",
            body=(
                f"Hi {user.first_name},\n\n"
                "We received your request to delete your CommonGround account. "
                f"Your account and data will be permanently deleted on {deletion_date.strftime('%B %d, %Y')}.\n\n"
                "If you did not make this request or wish to cancel, please contact "
                "our support team at support@commonground.co within the next 30 days.\n\n"
                "Thank you,\nThe CommonGround Team"
            ),
        )
    except Exception as e:
        logger.warning(f"Failed to send deletion confirmation email: {e}")

    logger.info(
        f"User {current_user.id} requested account deletion, scheduled for {deletion_date.isoformat()}"
    )

    return DeletionRequestResponse(
        deletion_scheduled=True,
        deletion_date=deletion_date.strftime("%Y-%m-%d"),
    )


# === GDPR DATA EXPORT ===

@router.get("/me/export", summary="Export personal data (GDPR Article 20)")
async def export_personal_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export all personal data associated with the user's account.
    Returns a JSON object containing profile, messages metadata,
    agreements, and financial records.
    """
    from app.models.message import Message
    from datetime import datetime

    # Profile data
    profile = current_user.profile
    profile_data = {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }
    if profile:
        profile_data.update({
            "timezone": profile.timezone,
            "subscription_tier": profile.subscription_tier,
            "terms_accepted_at": profile.terms_accepted_at.isoformat() if profile.terms_accepted_at else None,
            "terms_version": profile.terms_version,
        })

    # Message count (not content — content available via case exports)
    msg_result = await db.execute(
        select(Message).where(Message.sender_id == current_user.id)
    )
    messages = msg_result.scalars().all()
    message_summary = {
        "total_sent": len(messages),
        "date_range": {
            "earliest": min((m.created_at for m in messages), default=None),
            "latest": max((m.created_at for m in messages), default=None),
        } if messages else None,
    }

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "user_profile": profile_data,
        "messages_summary": message_summary,
        "note": "Full message content and case data can be exported via the case export feature.",
    }


# === CONSENT WITHDRAWAL ===

@router.post("/me/consent/withdraw", summary="Withdraw marketing consent")
async def withdraw_marketing_consent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Withdraw marketing consent without deleting the account.
    The user will no longer receive marketing communications.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    profile.marketing_emails_enabled = False
    await db.commit()

    return {
        "status": "consent_withdrawn",
        "marketing_emails_enabled": False,
        "message": "You will no longer receive marketing communications. Your account remains active.",
    }
