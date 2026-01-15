"""
Grant code management endpoints.

Handles nonprofit grant code redemption for the DV partnership program.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.subscription import GrantCode, GrantRedemption
from app.schemas.subscription import (
    GrantRedemptionRequest,
    GrantRedemptionResponse,
    GrantStatusResponse,
    GrantCodeInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/redeem", response_model=GrantRedemptionResponse)
async def redeem_grant_code(
    request: GrantRedemptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Redeem a nonprofit grant code.

    Grant codes are provided by DV nonprofits and unlock Plus tier for free.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    # Check if user already has an active grant
    if profile.active_grant_id:
        result = await db.execute(
            select(GrantRedemption)
            .where(GrantRedemption.id == profile.active_grant_id)
        )
        existing_grant = result.scalar_one_or_none()
        if existing_grant and existing_grant.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active grant. Only one grant can be active at a time."
            )

    # Check if user has a paid subscription
    if profile.subscription_status == "active" and profile.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have an active paid subscription. Cancel it first to use a grant code."
        )

    # Find the grant code (case-insensitive)
    code_upper = request.code.upper().strip()
    result = await db.execute(
        select(GrantCode)
        .where(GrantCode.code == code_upper)
    )
    grant_code = result.scalar_one_or_none()

    if not grant_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid grant code. Please check the code and try again."
        )

    # Validate the grant code
    if not grant_code.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This grant code has been deactivated."
        )

    now = datetime.utcnow()

    if now < grant_code.valid_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This grant code is not yet active."
        )

    if grant_code.valid_until and now > grant_code.valid_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This grant code has expired."
        )

    if grant_code.max_redemptions and grant_code.redemption_count >= grant_code.max_redemptions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This grant code has reached its maximum number of redemptions."
        )

    # Check if user already redeemed this code before
    result = await db.execute(
        select(GrantRedemption)
        .where(
            GrantRedemption.grant_code_id == grant_code.id,
            GrantRedemption.user_id == current_user.id,
        )
    )
    previous_redemption = result.scalar_one_or_none()

    if previous_redemption:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already redeemed this grant code."
        )

    # Calculate expiration
    expires_at = None
    if grant_code.grant_duration_days:
        expires_at = now + timedelta(days=grant_code.grant_duration_days)

    # Create redemption
    redemption = GrantRedemption(
        grant_code_id=grant_code.id,
        user_id=current_user.id,
        granted_at=now,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(redemption)

    # Update grant code redemption count
    grant_code.redemption_count += 1

    # Update user profile
    profile.subscription_tier = grant_code.granted_plan_code
    profile.subscription_status = "grant"
    profile.active_grant_id = redemption.id
    profile.subscription_ends_at = expires_at

    await db.commit()

    logger.info(
        f"Grant code {code_upper} redeemed by user {current_user.id} "
        f"(nonprofit: {grant_code.nonprofit_name})"
    )

    return GrantRedemptionResponse(
        success=True,
        message=f"Grant code redeemed successfully! You now have {grant_code.granted_plan_code.title()} access.",
        nonprofit_name=grant_code.nonprofit_name,
        granted_tier=grant_code.granted_plan_code,
        expires_at=expires_at,
    )


@router.get("/status", response_model=GrantStatusResponse)
async def get_grant_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if the current user has an active grant.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    if not profile.active_grant_id:
        return GrantStatusResponse(
            has_active_grant=False,
        )

    # Get the grant redemption
    result = await db.execute(
        select(GrantRedemption)
        .where(GrantRedemption.id == profile.active_grant_id)
    )
    redemption = result.scalar_one_or_none()

    if not redemption or not redemption.is_valid:
        # Grant expired or revoked
        return GrantStatusResponse(
            has_active_grant=False,
        )

    # Load the grant code for details
    await db.refresh(redemption, ["grant_code"])

    return GrantStatusResponse(
        has_active_grant=True,
        grant_code=redemption.grant_code.code if redemption.grant_code else None,
        nonprofit_name=redemption.grant_code.nonprofit_name if redemption.grant_code else None,
        granted_tier=redemption.grant_code.granted_plan_code if redemption.grant_code else None,
        granted_at=redemption.granted_at,
        expires_at=redemption.expires_at,
    )


@router.get("/validate/{code}", response_model=GrantCodeInfo)
async def validate_grant_code(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a grant code without redeeming it.

    Public endpoint - does not require authentication.
    """
    code_upper = code.upper().strip()

    result = await db.execute(
        select(GrantCode)
        .where(GrantCode.code == code_upper)
    )
    grant_code = result.scalar_one_or_none()

    if not grant_code:
        return GrantCodeInfo(
            code=code_upper,
            nonprofit_name="",
            granted_tier="",
            is_valid=False,
            reason="Invalid grant code"
        )

    if not grant_code.is_active:
        return GrantCodeInfo(
            code=code_upper,
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code,
            is_valid=False,
            reason="Grant code has been deactivated"
        )

    now = datetime.utcnow()

    if now < grant_code.valid_from:
        return GrantCodeInfo(
            code=code_upper,
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code,
            is_valid=False,
            reason="Grant code is not yet active"
        )

    if grant_code.valid_until and now > grant_code.valid_until:
        return GrantCodeInfo(
            code=code_upper,
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code,
            is_valid=False,
            reason="Grant code has expired"
        )

    if grant_code.max_redemptions and grant_code.redemption_count >= grant_code.max_redemptions:
        return GrantCodeInfo(
            code=code_upper,
            nonprofit_name=grant_code.nonprofit_name,
            granted_tier=grant_code.granted_plan_code,
            is_valid=False,
            reason="Grant code has reached maximum redemptions"
        )

    return GrantCodeInfo(
        code=code_upper,
        nonprofit_name=grant_code.nonprofit_name,
        granted_tier=grant_code.granted_plan_code,
        is_valid=True,
    )
