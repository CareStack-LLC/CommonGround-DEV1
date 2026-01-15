"""
Subscription management endpoints.

Handles:
- Listing subscription plans
- Getting current subscription status
- Creating Stripe Checkout sessions
- Creating Stripe Customer Portal sessions
- Cancelling and reactivating subscriptions
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.subscription import SubscriptionPlan, GrantRedemption
from app.schemas.subscription import (
    PlanResponse,
    PlansListResponse,
    SubscriptionStatusResponse,
    CheckoutRequest,
    CheckoutSessionResponse,
    PortalSessionRequest,
    PortalSessionResponse,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse,
    ReactivateSubscriptionResponse,
    FeatureAccessResponse,
    FeaturesListResponse,
)
from app.services.feature_gate import feature_gate, FEATURE_DEFINITIONS, TIER_DISPLAY_NAMES
from app.services.stripe_service import stripe_service

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Plan Listing
# =============================================================================


@router.get("/plans", response_model=PlansListResponse)
async def list_subscription_plans(
    db: AsyncSession = Depends(get_db)
):
    """
    List all available subscription plans.

    Returns plans ordered by display_order for consistent presentation.
    Falls back to hardcoded plans if database query fails.
    """
    try:
        result = await db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active == True)
            .order_by(SubscriptionPlan.display_order)
        )
        plans = result.scalars().all()

        if plans:
            return PlansListResponse(
                plans=[PlanResponse.model_validate(plan) for plan in plans]
            )
    except Exception as e:
        logger.warning(f"Failed to fetch plans from database: {e}")

    # Fallback to hardcoded plans if database unavailable or empty
    hardcoded_plans = [
        PlanResponse(
            id="plan_starter_001",
            plan_code="starter",
            display_name="Starter",
            description="Everything you need to get started with better co-parenting.",
            badge=None,
            price_monthly=0.00,
            price_annual=0.00,
            features={
                "aria_manual_sentiment": True,
                "clearfund_fee_exempt": False,
                "quick_accords": False,
                "circle_contacts_limit": 0,
                "kidcoms_access": False,
            },
            trial_days=14,
            display_order=0,
        ),
        PlanResponse(
            id="plan_plus_001",
            plan_code="plus",
            display_name="Plus",
            description="Better scheduling, no fees, and a trusted contact.",
            badge="Most Popular",
            price_monthly=12.00,
            price_annual=120.00,
            features={
                "aria_manual_sentiment": True,
                "clearfund_fee_exempt": True,
                "quick_accords": True,
                "circle_contacts_limit": 1,
                "kidcoms_access": False,
            },
            trial_days=14,
            display_order=1,
        ),
        PlanResponse(
            id="plan_family_plus_001",
            plan_code="family_plus",
            display_name="Family+",
            description="Full access including KidComs video calls and theater mode.",
            badge=None,
            price_monthly=25.00,
            price_annual=250.00,
            features={
                "aria_manual_sentiment": True,
                "aria_advanced": True,
                "clearfund_fee_exempt": True,
                "quick_accords": True,
                "circle_contacts_limit": 5,
                "kidcoms_access": True,
                "theater_mode": True,
            },
            trial_days=14,
            display_order=2,
        ),
    ]
    return PlansListResponse(plans=hardcoded_plans)


# =============================================================================
# Current Subscription Status
# =============================================================================


@router.get("/current", response_model=SubscriptionStatusResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current user's subscription status.

    Returns tier, status, features, and any active grant information.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    # Get effective tier (accounting for grants)
    effective_tier = feature_gate.get_effective_tier(current_user)

    # Build feature access map
    features = {}
    for feature_name in FEATURE_DEFINITIONS:
        features[feature_name] = {
            "has_access": feature_gate.has_feature(current_user, feature_name),
            "limit": feature_gate.get_limit(current_user, feature_name),
        }

    # Check for active grant
    has_active_grant = False
    grant_nonprofit_name = None
    grant_expires_at = None

    if profile.active_grant_id:
        result = await db.execute(
            select(GrantRedemption)
            .where(GrantRedemption.id == profile.active_grant_id)
        )
        grant = result.scalar_one_or_none()
        if grant and grant.is_valid:
            has_active_grant = True
            # Load grant code for nonprofit name
            await db.refresh(grant, ["grant_code"])
            if grant.grant_code:
                grant_nonprofit_name = grant.grant_code.nonprofit_name
            grant_expires_at = grant.expires_at

    return SubscriptionStatusResponse(
        tier=effective_tier,
        tier_display_name=TIER_DISPLAY_NAMES.get(effective_tier, effective_tier),
        status=profile.subscription_status,
        stripe_subscription_id=profile.stripe_subscription_id,
        period_start=profile.subscription_period_start,
        period_end=profile.subscription_period_end,
        has_active_grant=has_active_grant,
        grant_nonprofit_name=grant_nonprofit_name,
        grant_expires_at=grant_expires_at,
        features=features,
        is_trial=profile.subscription_status == "trial",
        trial_ends_at=profile.subscription_ends_at if profile.subscription_status == "trial" else None,
    )


# =============================================================================
# Checkout
# =============================================================================


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Stripe Checkout session for subscription.

    Redirects user to Stripe-hosted checkout page.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    # Validate plan code
    if request.plan_code not in ("plus", "family_plus"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan code. Must be 'plus' or 'family_plus'"
        )

    # Check if user is already on this plan
    current_tier = feature_gate.get_effective_tier(current_user)
    if current_tier == request.plan_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already subscribed to the {request.plan_code} plan"
        )

    # Prevent downgrade via checkout (use portal for downgrades)
    tier_order = {"starter": 0, "plus": 1, "family_plus": 2}
    if tier_order.get(request.plan_code, 0) < tier_order.get(current_tier, 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To downgrade your plan, please use the Manage Subscription button"
        )

    # Get plan for price ID
    result = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.plan_code == request.plan_code)
    )
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan '{request.plan_code}' not found"
        )

    # Get appropriate price ID
    price_id = (
        plan.stripe_price_id_annual if request.period == "annual"
        else plan.stripe_price_id_monthly
    )

    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe price not configured for this plan"
        )

    # Ensure customer exists
    if not profile.stripe_customer_id:
        customer = await stripe_service.create_customer(
            email=current_user.email,
            name=profile.full_name,
            user_id=str(current_user.id),
        )
        profile.stripe_customer_id = customer["id"]
        await db.commit()

    # Create checkout session
    trial_days = plan.trial_days if profile.subscription_status == "trial" else 0

    checkout_data = await stripe_service.create_subscription_checkout(
        customer_id=profile.stripe_customer_id,
        price_id=price_id,
        success_url=request.success_url,
        cancel_url=request.cancel_url,
        trial_days=trial_days,
        metadata={"user_id": str(current_user.id), "plan_code": request.plan_code},
    )

    return CheckoutSessionResponse(
        checkout_url=checkout_data["url"],
        session_id=checkout_data["id"]
    )


# =============================================================================
# Customer Portal
# =============================================================================


@router.post("/portal", response_model=PortalSessionResponse)
async def create_customer_portal(
    request: PortalSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Stripe Customer Portal session.

    Allows users to manage their subscription, update payment methods, etc.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    if not profile.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer found. Subscribe to a plan first."
        )

    portal_url = await stripe_service.create_customer_portal_session(
        customer_id=profile.stripe_customer_id,
        return_url=request.return_url,
    )

    return PortalSessionResponse(portal_url=portal_url)


# =============================================================================
# Cancel & Reactivate
# =============================================================================


@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel the current subscription.

    By default, cancels at period end. Set immediate=true to cancel immediately.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    if not profile.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel"
        )

    result = await stripe_service.cancel_subscription(
        subscription_id=profile.stripe_subscription_id,
        at_period_end=not request.immediate,
    )

    # Update local status
    if request.immediate:
        profile.subscription_status = "cancelled"
        profile.subscription_tier = "starter"
    # Note: If cancelling at period end, Stripe webhook will update status

    await db.commit()

    return CancelSubscriptionResponse(
        cancelled=True,
        cancel_at=result.get("cancel_at"),
        message="Subscription will be cancelled at the end of the billing period."
        if not request.immediate
        else "Subscription cancelled immediately."
    )


@router.post("/reactivate", response_model=ReactivateSubscriptionResponse)
async def reactivate_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reactivate a cancelled subscription before it ends.

    Only works if subscription was cancelled to end at period end.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    if not profile.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscription to reactivate"
        )

    result = await stripe_service.reactivate_subscription(
        subscription_id=profile.stripe_subscription_id,
    )

    if result.get("status") == "active":
        profile.subscription_status = "active"
        await db.commit()

        return ReactivateSubscriptionResponse(
            reactivated=True,
            message="Subscription reactivated successfully."
        )

    return ReactivateSubscriptionResponse(
        reactivated=False,
        message="Unable to reactivate subscription."
    )


# =============================================================================
# Feature Access
# =============================================================================


@router.get("/features/{feature}", response_model=FeatureAccessResponse)
async def check_feature_access(
    feature: str,
    current_user: User = Depends(get_current_user),
):
    """
    Check if the current user has access to a specific feature.
    """
    has_access = feature_gate.has_feature(current_user, feature)
    current_tier = feature_gate.get_effective_tier(current_user)
    required_tier = feature_gate.get_required_tier(feature)
    limit = feature_gate.get_limit(current_user, feature)

    return FeatureAccessResponse(
        feature=feature,
        has_access=has_access,
        current_tier=current_tier,
        required_tier=required_tier,
        limit=limit if isinstance(limit, int) else None,
        upgrade_message=None if has_access else feature_gate.get_upgrade_message(feature)
    )


@router.get("/features", response_model=FeaturesListResponse)
async def list_features(
    current_user: User = Depends(get_current_user),
):
    """
    List all features and the current user's access level.
    """
    tier = feature_gate.get_effective_tier(current_user)

    features = {}
    for feature_name in FEATURE_DEFINITIONS:
        features[feature_name] = {
            "has_access": feature_gate.has_feature(current_user, feature_name),
            "limit": feature_gate.get_limit(current_user, feature_name),
            "required_tier": feature_gate.get_required_tier(feature_name),
        }

    return FeaturesListResponse(
        tier=tier,
        features=features
    )


# =============================================================================
# Sync from Stripe
# =============================================================================


@router.post("/sync", response_model=SubscriptionStatusResponse)
async def sync_subscription_from_stripe(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync subscription status from Stripe.

    This is a fallback endpoint to pull subscription status directly from Stripe
    when webhooks are delayed or not working. Call this after checkout success.
    """
    from datetime import datetime

    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    if not profile.stripe_customer_id:
        # No Stripe customer - return current status
        return await get_current_subscription(current_user, db)

    try:
        # Get subscriptions from Stripe
        subscriptions = await stripe_service.get_customer_subscriptions(
            profile.stripe_customer_id
        )

        if not subscriptions:
            # No subscriptions found - return current status
            return await get_current_subscription(current_user, db)

        # Find the most recent active/trialing subscription
        active_sub = None
        for sub in subscriptions:
            if sub["status"] in ("active", "trialing"):
                active_sub = sub
                break

        if not active_sub:
            # No active subscription - might be cancelled
            for sub in subscriptions:
                if sub["status"] in ("canceled", "cancelled"):
                    # Subscription was cancelled
                    profile.subscription_tier = "starter"
                    profile.subscription_status = "cancelled"
                    profile.stripe_subscription_id = None
                    await db.commit()
                    break
            return await get_current_subscription(current_user, db)

        # Map price ID to tier
        price_id = active_sub.get("price_id")
        if price_id:
            result = await db.execute(
                select(SubscriptionPlan).where(
                    (SubscriptionPlan.stripe_price_id_monthly == price_id) |
                    (SubscriptionPlan.stripe_price_id_annual == price_id)
                )
            )
            plan = result.scalar_one_or_none()
            tier = plan.plan_code if plan else "starter"
        else:
            tier = "starter"

        # Update profile
        profile.subscription_tier = tier
        profile.subscription_status = active_sub["status"]
        profile.stripe_subscription_id = active_sub["id"]

        if active_sub.get("current_period_start"):
            profile.subscription_period_start = datetime.fromtimestamp(
                active_sub["current_period_start"]
            )
        if active_sub.get("current_period_end"):
            profile.subscription_period_end = datetime.fromtimestamp(
                active_sub["current_period_end"]
            )
            profile.subscription_ends_at = datetime.fromtimestamp(
                active_sub["current_period_end"]
            )

        # Handle cancel_at_period_end
        if active_sub.get("cancel_at_period_end") and active_sub["status"] == "active":
            profile.subscription_status = "cancelling"

        await db.commit()
        await db.refresh(profile)

        logger.info(
            f"Synced subscription for user {current_user.id}: "
            f"tier={tier}, status={profile.subscription_status}"
        )

    except Exception as e:
        logger.error(f"Failed to sync subscription from Stripe: {e}")
        # Don't raise - return current status

    return await get_current_subscription(current_user, db)
