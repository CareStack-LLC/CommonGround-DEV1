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
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
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


class SubscribeResponse(BaseModel):
    """Response for subscribe/checkout endpoint."""
    action: str  # "checkout" or "upgraded"
    checkout_url: Optional[str] = None
    session_id: Optional[str] = None
    new_tier: Optional[str] = None
    message: Optional[str] = None


@router.post("/checkout")
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SubscribeResponse:
    """
    Subscribe to a plan or upgrade existing subscription.

    - If user has NO subscription: Creates Stripe Checkout session
    - If user HAS subscription: Updates it directly (no checkout needed)
    """
    from datetime import datetime

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

    # Ensure customer exists in Stripe
    if not profile.stripe_customer_id:
        customer = await stripe_service.create_customer(
            email=current_user.email,
            name=profile.full_name,
            user_id=str(current_user.id),
        )
        profile.stripe_customer_id = customer["id"]
        await db.commit()

    # =========================================================================
    # CRITICAL: Check Stripe directly for existing subscriptions
    # =========================================================================
    existing_subscription_id = None

    logger.info(
        f"Checking subscriptions for customer {profile.stripe_customer_id} "
        f"(user {current_user.id}, email {current_user.email})"
    )

    try:
        existing_subs = await stripe_service.get_customer_subscriptions(
            profile.stripe_customer_id
        )
        logger.info(f"Found {len(existing_subs)} subscriptions for customer: {existing_subs}")

        # Include past_due since that's still an active subscription
        active_subs = [s for s in existing_subs if s["status"] in ("active", "trialing", "past_due")]
        logger.info(f"Active subscriptions (active/trialing/past_due): {len(active_subs)}")

        if active_subs:
            existing_subscription_id = active_subs[0]["id"]
            current_price_id = active_subs[0].get("price_id")

            logger.info(
                f"User has active subscription {existing_subscription_id} "
                f"with price_id {current_price_id}, requested price_id {price_id}"
            )

            # Sync to our DB if needed
            if not profile.stripe_subscription_id:
                profile.stripe_subscription_id = existing_subscription_id
                profile.subscription_status = active_subs[0]["status"]

            # Check if already on this plan
            if current_price_id == price_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You are already subscribed to the {request.plan_code} plan"
                )

            logger.info(
                f"Will UPGRADE subscription {existing_subscription_id} from "
                f"{current_price_id} to {price_id}"
            )
        else:
            logger.info(f"No active subscriptions found, will create new checkout session")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CRITICAL: Failed to check existing subscriptions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check subscription status: {str(e)}"
        )

    # =========================================================================
    # If user has existing subscription: UPDATE IT (don't create new)
    # =========================================================================
    if existing_subscription_id:
        try:
            updated_sub = await stripe_service.update_subscription_price(
                subscription_id=existing_subscription_id,
                new_price_id=price_id,
                proration_behavior="create_prorations",
            )

            # Update our database
            profile.subscription_tier = request.plan_code
            profile.subscription_status = updated_sub["status"]
            profile.stripe_subscription_id = existing_subscription_id

            if updated_sub.get("current_period_start"):
                profile.subscription_period_start = datetime.fromtimestamp(
                    updated_sub["current_period_start"]
                )
            if updated_sub.get("current_period_end"):
                profile.subscription_period_end = datetime.fromtimestamp(
                    updated_sub["current_period_end"]
                )

            await db.commit()

            logger.info(
                f"UPGRADED subscription {existing_subscription_id} to {request.plan_code} "
                f"for user {current_user.id}"
            )

            return SubscribeResponse(
                action="upgraded",
                new_tier=request.plan_code,
                message=f"Successfully upgraded to {plan.display_name}!"
            )

        except Exception as e:
            logger.error(f"Failed to upgrade subscription: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upgrade subscription: {str(e)}"
            )

    # =========================================================================
    # No existing subscription: Create Stripe Checkout session
    # =========================================================================
    trial_days = plan.trial_days if profile.subscription_status == "trial" else 0

    logger.info(
        f"Creating NEW checkout session: customer={profile.stripe_customer_id}, "
        f"price={price_id}, plan={request.plan_code}"
    )

    try:
        checkout_data = await stripe_service.create_subscription_checkout(
            customer_id=profile.stripe_customer_id,
            price_id=price_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            trial_days=trial_days,
            metadata={"user_id": str(current_user.id), "plan_code": request.plan_code},
        )

        logger.info(
            f"Checkout session created: id={checkout_data['id']}, "
            f"url={checkout_data['url'][:50]}..."
        )

        return SubscribeResponse(
            action="checkout",
            checkout_url=checkout_data["url"],
            session_id=checkout_data["id"]
        )
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


# =============================================================================
# Upgrade/Change Plan
# =============================================================================


class UpgradeRequest(BaseModel):
    """Request to upgrade/change subscription plan."""
    plan_code: str = Field(..., description="Plan to switch to: 'plus' or 'family_plus'")
    period: str = Field(default="monthly", description="Billing period: 'monthly' or 'annual'")


class UpgradeResponse(BaseModel):
    """Response after plan upgrade."""
    success: bool
    new_tier: str
    message: str


@router.post("/upgrade", response_model=UpgradeResponse)
async def upgrade_subscription(
    request: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upgrade or change an existing subscription's plan.

    This updates the existing subscription to a new price instead of
    creating a new subscription. Prorations are applied automatically.
    """
    from datetime import datetime

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

    # Must have an existing subscription to upgrade
    subscription_id = profile.stripe_subscription_id

    # If no subscription in DB, check Stripe directly
    if not subscription_id and profile.stripe_customer_id:
        try:
            existing_subs = await stripe_service.get_customer_subscriptions(
                profile.stripe_customer_id
            )
            active_subs = [s for s in existing_subs if s["status"] in ("active", "trialing")]
            if active_subs:
                subscription_id = active_subs[0]["id"]
                profile.stripe_subscription_id = subscription_id
        except Exception as e:
            logger.warning(f"Failed to check existing subscriptions: {e}")

    if not subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found. Use checkout to subscribe first."
        )

    # Get the new plan's price ID
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

    price_id = (
        plan.stripe_price_id_annual if request.period == "annual"
        else plan.stripe_price_id_monthly
    )

    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe price not configured for this plan"
        )

    # Update the subscription in Stripe
    try:
        updated_sub = await stripe_service.update_subscription_price(
            subscription_id=subscription_id,
            new_price_id=price_id,
            proration_behavior="create_prorations",  # Charge/credit difference
        )

        # Update our database
        profile.subscription_tier = request.plan_code
        profile.subscription_status = updated_sub["status"]

        if updated_sub.get("current_period_start"):
            profile.subscription_period_start = datetime.fromtimestamp(
                updated_sub["current_period_start"]
            )
        if updated_sub.get("current_period_end"):
            profile.subscription_period_end = datetime.fromtimestamp(
                updated_sub["current_period_end"]
            )

        await db.commit()

        logger.info(
            f"Upgraded subscription {subscription_id} to {request.plan_code} "
            f"for user {current_user.id}"
        )

        return UpgradeResponse(
            success=True,
            new_tier=request.plan_code,
            message=f"Successfully upgraded to {plan.display_name}!"
        )

    except Exception as e:
        logger.error(f"Failed to upgrade subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upgrade subscription: {str(e)}"
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
# Debug / Verify Stripe Setup
# =============================================================================


@router.get("/debug/stripe-status")
async def debug_stripe_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Debug endpoint to verify Stripe configuration.

    Returns information about prices, customer, and subscriptions.
    """
    import stripe
    from app.core.config import settings

    stripe.api_key = settings.STRIPE_SECRET_KEY

    profile = current_user.profile
    result = {
        "stripe_configured": bool(settings.STRIPE_SECRET_KEY),
        "customer_id": profile.stripe_customer_id if profile else None,
        "prices": {},
        "customer_subscriptions": [],
        "checkout_sessions": [],
    }

    # Check prices in database
    plans_result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.is_active == True)
    )
    plans = plans_result.scalars().all()

    for plan in plans:
        price_id = plan.stripe_price_id_monthly
        result["prices"][plan.plan_code] = {
            "price_id": price_id,
            "exists_in_stripe": False,
            "is_recurring": False,
            "error": None,
        }

        if price_id:
            try:
                price = stripe.Price.retrieve(price_id)
                result["prices"][plan.plan_code]["exists_in_stripe"] = True
                result["prices"][plan.plan_code]["is_recurring"] = price.type == "recurring"
                result["prices"][plan.plan_code]["unit_amount"] = price.unit_amount
                result["prices"][plan.plan_code]["currency"] = price.currency
            except stripe.error.InvalidRequestError as e:
                result["prices"][plan.plan_code]["error"] = str(e)
            except Exception as e:
                result["prices"][plan.plan_code]["error"] = str(e)

    # Check customer subscriptions
    if profile and profile.stripe_customer_id:
        try:
            subscriptions = stripe.Subscription.list(
                customer=profile.stripe_customer_id,
                limit=5
            )
            for sub in subscriptions.data:
                # Access items via dict-style (sub["items"]) not attribute (sub.items)
                items_data = sub.get("items", {}).get("data", [])
                price_id = items_data[0]["price"]["id"] if items_data else None
                result["customer_subscriptions"].append({
                    "id": sub.id,
                    "status": sub.status,
                    "price_id": price_id,
                })
        except Exception as e:
            result["customer_subscriptions_error"] = str(e)

        # Check recent checkout sessions
        try:
            sessions = stripe.checkout.Session.list(
                customer=profile.stripe_customer_id,
                limit=5
            )
            result["checkout_sessions"] = [
                {
                    "id": sess.id,
                    "status": sess.status,
                    "mode": sess.mode,
                    "payment_status": sess.payment_status,
                    "subscription": sess.subscription,
                }
                for sess in sessions.data
            ]
        except Exception as e:
            result["checkout_sessions_error"] = str(e)

        # Test price mapping for first subscription
        if result["customer_subscriptions"]:
            test_price_id = result["customer_subscriptions"][0].get("price_id")
            if test_price_id:
                try:
                    plan_result = await db.execute(
                        select(SubscriptionPlan).where(
                            (SubscriptionPlan.stripe_price_id_monthly == test_price_id) |
                            (SubscriptionPlan.stripe_price_id_annual == test_price_id)
                        )
                    )
                    plan = plan_result.scalar_one_or_none()
                    result["price_mapping_test"] = {
                        "price_id": test_price_id,
                        "mapped_plan_code": plan.plan_code if plan else None,
                        "plan_found": plan is not None,
                    }
                except Exception as e:
                    result["price_mapping_error"] = str(e)

    return result


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
        logger.info(f"Sync: Getting subscriptions for customer {profile.stripe_customer_id}")
        subscriptions = await stripe_service.get_customer_subscriptions(
            profile.stripe_customer_id
        )
        logger.info(f"Sync: Found {len(subscriptions)} subscriptions: {subscriptions}")

        if not subscriptions:
            # No subscriptions found - return current status
            logger.info("Sync: No subscriptions found, returning current status")
            return await get_current_subscription(current_user, db)

        # Find the most recent active/trialing subscription
        active_sub = None
        for sub in subscriptions:
            logger.info(f"Sync: Checking subscription {sub['id']} with status {sub['status']}")
            if sub["status"] in ("active", "trialing"):
                active_sub = sub
                logger.info(f"Sync: Found active subscription: {active_sub}")
                break

        if not active_sub:
            logger.info("Sync: No active subscription found")
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
        logger.info(f"Sync: Mapping price_id {price_id} to tier")
        if price_id:
            result = await db.execute(
                select(SubscriptionPlan).where(
                    (SubscriptionPlan.stripe_price_id_monthly == price_id) |
                    (SubscriptionPlan.stripe_price_id_annual == price_id)
                )
            )
            plan = result.scalar_one_or_none()
            tier = plan.plan_code if plan else "starter"
            logger.info(f"Sync: Found plan {plan.plan_code if plan else 'None'}, tier={tier}")
        else:
            tier = "starter"
            logger.info("Sync: No price_id, defaulting to starter")

        # Update profile
        logger.info(f"Sync: Updating profile to tier={tier}, subscription_id={active_sub['id']}")
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
        logger.error(f"Failed to sync subscription from Stripe: {e}", exc_info=True)
        # Don't raise - return current status

    return await get_current_subscription(current_user, db)


@router.post("/debug/sync")
async def debug_sync_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Debug version of sync that returns detailed error info instead of swallowing errors.
    """
    from datetime import datetime

    profile = current_user.profile
    if not profile:
        return {"error": "User profile not found"}

    if not profile.stripe_customer_id:
        return {"error": "No Stripe customer ID", "profile_tier": profile.subscription_tier}

    result = {
        "customer_id": profile.stripe_customer_id,
        "before_sync": {
            "tier": profile.subscription_tier,
            "status": profile.subscription_status,
            "subscription_id": profile.stripe_subscription_id,
        },
        "steps": [],
    }

    try:
        # Step 1: Get subscriptions
        result["steps"].append("1. Getting subscriptions from Stripe...")
        subscriptions = await stripe_service.get_customer_subscriptions(
            profile.stripe_customer_id
        )
        result["subscriptions_found"] = len(subscriptions)
        result["subscriptions"] = subscriptions

        if not subscriptions:
            result["steps"].append("2. No subscriptions found")
            return result

        # Step 2: Find active subscription
        result["steps"].append("2. Looking for active subscription...")
        active_sub = None
        for sub in subscriptions:
            if sub["status"] in ("active", "trialing"):
                active_sub = sub
                break

        if not active_sub:
            result["steps"].append("3. No active subscription found")
            return result

        result["active_subscription"] = active_sub
        result["steps"].append(f"3. Found active subscription: {active_sub['id']}")

        # Step 3: Map price to tier
        price_id = active_sub.get("price_id")
        result["price_id"] = price_id
        result["steps"].append(f"4. Mapping price_id {price_id} to tier...")

        if price_id:
            plan_result = await db.execute(
                select(SubscriptionPlan).where(
                    (SubscriptionPlan.stripe_price_id_monthly == price_id) |
                    (SubscriptionPlan.stripe_price_id_annual == price_id)
                )
            )
            plan = plan_result.scalar_one_or_none()
            tier = plan.plan_code if plan else "starter"
            result["plan_found"] = plan is not None
            result["tier"] = tier
            result["steps"].append(f"5. Mapped to tier: {tier}")
        else:
            tier = "starter"
            result["tier"] = tier
            result["steps"].append("5. No price_id, defaulting to starter")

        # Step 4: Update profile
        result["steps"].append("6. Updating profile...")
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

        result["steps"].append("7. Committing to database...")
        await db.commit()
        await db.refresh(profile)

        result["after_sync"] = {
            "tier": profile.subscription_tier,
            "status": profile.subscription_status,
            "subscription_id": profile.stripe_subscription_id,
        }
        result["steps"].append("8. Sync complete!")
        result["success"] = True

    except Exception as e:
        import traceback
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
        result["success"] = False

    return result
