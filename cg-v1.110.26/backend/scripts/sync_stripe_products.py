"""
Sync Stripe Products and Prices for v1.120.0 Subscription Tiers

This script creates or updates Stripe products and prices to match
the new subscription structure:
- Web Starter: Free ($0/mo)
- Plus: $17.99/mo, $199.99/year
- Complete: $34.99/mo, $349.99/year

Run this script after deploying the subscription model migrations.

Usage:
    python -m scripts.sync_stripe_products
    python -m scripts.sync_stripe_products --mode=test  # Test mode (default)
    python -m scripts.sync_stripe_products --mode=live  # Live mode (use with caution!)
"""

import asyncio
import argparse
import stripe
from decimal import Decimal
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.subscription import SubscriptionPlan


# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


# Subscription tier configuration matching new pricing
SUBSCRIPTION_PRODUCTS = {
    "web_starter": {
        "name": "Web Starter",
        "description": "Free web-only access with basic co-parenting features",
        "metadata": {
            "tier": "web_starter",
            "platform": "commonground",
            "version": "v1.120",
        },
        "prices": {
            "monthly": Decimal("0.00"),
            "annual": Decimal("0.00"),
        },
    },
    "plus": {
        "name": "Plus",
        "description": "Structure & stability with mobile apps and automation",
        "metadata": {
            "tier": "plus",
            "platform": "commonground",
            "version": "v1.120",
            "features": "mobile_apps,automated_scheduling,custody_tracking,quick_accords,my_circle",
        },
        "prices": {
            "monthly": Decimal("17.99"),
            "annual": Decimal("199.99"),  # ~$16.67/mo (7% discount)
        },
    },
    "complete": {
        "name": "Complete",
        "description": "High-conflict/court-ready with full feature set including Silent Handoff and KidsCom",
        "metadata": {
            "tier": "complete",
            "platform": "commonground",
            "version": "v1.120",
            "features": "all_plus_features,silent_handoff,kidscoms,shared_care_agreements,court_exports,advanced_analytics",
        },
        "prices": {
            "monthly": Decimal("34.99"),
            "annual": Decimal("349.99"),  # ~$29.17/mo (16% discount)
        },
    },
}


async def create_or_update_product(plan_code: str, config: dict) -> str:
    """
    Create or update a Stripe Product.

    Returns:
        Product ID
    """
    # Search for existing product by metadata
    existing_products = stripe.Product.search(
        query=f"metadata['tier']:'{plan_code}' AND active:'true'",
        limit=1,
    )

    if existing_products.data:
        # Update existing product
        product = existing_products.data[0]
        print(f"  ✓ Found existing product: {product.id}")

        updated_product = stripe.Product.modify(
            product.id,
            name=config["name"],
            description=config["description"],
            metadata=config["metadata"],
        )
        print(f"  ✓ Updated product: {updated_product.id}")
        return updated_product.id
    else:
        # Create new product
        product = stripe.Product.create(
            name=config["name"],
            description=config["description"],
            metadata=config["metadata"],
            default_price_data=None,  # We'll create prices separately
        )
        print(f"  ✓ Created product: {product.id}")
        return product.id


async def create_or_update_price(
    product_id: str,
    amount: Decimal,
    interval: str,
    plan_code: str,
) -> str:
    """
    Create or update a Stripe Price.

    Args:
        product_id: Stripe Product ID
        amount: Price amount in dollars
        interval: "month" or "year"
        plan_code: Tier code for metadata

    Returns:
        Price ID
    """
    amount_cents = int(amount * 100)

    # Search for existing price
    existing_prices = stripe.Price.search(
        query=f"product:'{product_id}' AND active:'true' AND metadata['interval']:'{interval}'",
        limit=1,
    )

    if existing_prices.data and amount_cents > 0:
        # For paid tiers, check if price matches
        existing_price = existing_prices.data[0]
        if existing_price.unit_amount == amount_cents:
            print(f"    ✓ Price already exists: {existing_price.id} (${amount}/{interval})")
            return existing_price.id
        else:
            # Archive old price and create new one
            stripe.Price.modify(existing_price.id, active=False)
            print(f"    ✓ Archived old price: {existing_price.id}")

    # Create new price (for free tier or updated pricing)
    price = stripe.Price.create(
        product=product_id,
        unit_amount=amount_cents,
        currency="usd",
        recurring={"interval": interval},
        metadata={
            "tier": plan_code,
            "interval": interval,
            "platform": "commonground",
            "version": "v1.120",
        },
    )
    print(f"    ✓ Created price: {price.id} (${amount}/{interval})")
    return price.id


async def update_database_plan(
    db: AsyncSession,
    plan_code: str,
    product_id: str,
    monthly_price_id: str,
    annual_price_id: str,
    config: dict,
) -> None:
    """
    Update subscription_plans table with Stripe IDs.
    """
    stmt = (
        update(SubscriptionPlan)
        .where(SubscriptionPlan.plan_code == plan_code)
        .values(
            stripe_product_id=product_id,
            stripe_price_id_monthly=monthly_price_id,
            stripe_price_id_annual=annual_price_id,
            display_name=config["name"],
            description=config["description"],
            price_monthly=config["prices"]["monthly"],
            price_annual=config["prices"]["annual"],
        )
    )

    await db.execute(stmt)
    await db.commit()
    print(f"  ✓ Updated database record for {plan_code}")


async def sync_all_products(db: AsyncSession, dry_run: bool = False) -> None:
    """
    Sync all subscription products and prices to Stripe.

    Args:
        db: Database session
        dry_run: If True, only print what would be done
    """
    print("\n" + "=" * 60)
    print("CommonGround Subscription Sync - v1.120.0")
    print("=" * 60)

    if dry_run:
        print("⚠️  DRY RUN MODE - No changes will be made")
    else:
        print("🔴 LIVE MODE - Changes will be made to Stripe")

    print(f"Stripe API Key: {'*' * 20}{settings.STRIPE_SECRET_KEY[-6:]}")
    print("=" * 60 + "\n")

    for plan_code, config in SUBSCRIPTION_PRODUCTS.items():
        print(f"Processing: {config['name']} ({plan_code})")
        print("-" * 60)

        if dry_run:
            print(f"  Would create/update product: {config['name']}")
            print(f"  Would create prices: ${config['prices']['monthly']}/mo, ${config['prices']['annual']}/year")
            print(f"  Would update database for: {plan_code}")
            continue

        # Create or update product
        product_id = await create_or_update_product(plan_code, config)

        # Create or update prices
        monthly_price_id = await create_or_update_price(
            product_id,
            config["prices"]["monthly"],
            "month",
            plan_code,
        )

        annual_price_id = await create_or_update_price(
            product_id,
            config["prices"]["annual"],
            "year",
            plan_code,
        )

        # Update database
        await update_database_plan(
            db,
            plan_code,
            product_id,
            monthly_price_id,
            annual_price_id,
            config,
        )

        print()

    print("=" * 60)
    if dry_run:
        print("✅ Dry run complete - no changes made")
    else:
        print("✅ Sync complete!")
    print("=" * 60 + "\n")


async def verify_plans(db: AsyncSession) -> None:
    """
    Verify subscription plans in database.
    """
    print("\n📋 Current Subscription Plans in Database:")
    print("-" * 60)

    stmt = select(SubscriptionPlan).where(SubscriptionPlan.is_active == True)
    result = await db.execute(stmt)
    plans = result.scalars().all()

    for plan in plans:
        print(f"\n{plan.display_name} ({plan.plan_code})")
        print(f"  Monthly: ${plan.price_monthly}")
        print(f"  Annual: ${plan.price_annual}")
        print(f"  Stripe Product: {plan.stripe_product_id or 'NOT SET'}")
        print(f"  Stripe Price (monthly): {plan.stripe_price_id_monthly or 'NOT SET'}")
        print(f"  Stripe Price (annual): {plan.stripe_price_id_annual or 'NOT SET'}")

    print()


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Sync Stripe products and prices for CommonGround v1.120.0"
    )
    parser.add_argument(
        "--mode",
        choices=["test", "live"],
        default="test",
        help="Run mode: 'test' for dry run, 'live' to make changes (default: test)",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify current plans without syncing",
    )

    args = parser.parse_args()
    dry_run = args.mode == "test"

    async with AsyncSessionLocal() as db:
        if args.verify_only:
            await verify_plans(db)
        else:
            await sync_all_products(db, dry_run=dry_run)
            await verify_plans(db)


if __name__ == "__main__":
    asyncio.run(main())
