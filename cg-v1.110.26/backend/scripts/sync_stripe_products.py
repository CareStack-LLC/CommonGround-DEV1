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
from typing import Optional, Dict, Any, List
import stripe
from decimal import Decimal
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.subscription import SubscriptionPlan


# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


# Products and Prices configuration matching user provided data
SUBSCRIPTION_PRODUCTS = {
    # Parent Tiers
    "web_starter": {
        "name": "Web Starter",
        "description": "Free web-only access with basic co-parenting features",
        "metadata": {"tier": "web_starter", "platform": "commonground"},
        "product_id": "prod_U5i6vWb4ktGrTN",
        "prices": {
            "monthly": {"amount": Decimal("0.00"), "id": "price_1T7WgnB3EXvvERPfyu40gtfE"},
        },
    },
    "plus": {
        "name": "Plus",
        "description": "Structure & stability with mobile apps and automation",
        "metadata": {"tier": "plus", "platform": "commonground"},
        "product_id": "prod_U5i6Efw49ipfb3",
        "prices": {
            "monthly": {"amount": Decimal("17.99"), "id": "price_1T7WgnB3EXvvERPfcpZeMSSH"},
            "annual": {"amount": Decimal("199.99"), "id": "price_1T7WgnB3EXvvERPfe7NNFlru"},
        },
    },
    "complete": {
        "name": "Complete",
        "description": "High-conflict/court-ready with full feature set including Silent Handoff and KidsCom",
        "metadata": {"tier": "complete", "platform": "commonground"},
        "product_id": "prod_U5i6lsgC2mOHxn",
        "prices": {
            "monthly": {"amount": Decimal("34.99"), "id": "price_1T7WgoB3EXvvERPfDm7qKpBN"},
            "annual": {"amount": Decimal("349.99"), "id": "price_1T7WgoB3EXvvERPfmDy9KtDh"},
        },
    },
    # Professional Tiers
    "professional_starter": {
        "name": "Professional - Starter",
        "description": "For professionals getting started with CommonGround",
        "metadata": {"tier": "professional_starter", "type": "professional"},
        "product_id": "prod_U5i6Vfe7E6vHtZ",
        "prices": {
            "monthly": {"amount": Decimal("0.00"), "id": "price_1T7WgoB3EXvvERPfO7RszlVq"},
        },
    },
    "professional_solo": {
        "name": "Professional - Solo",
        "description": "For solo practitioners",
        "metadata": {"tier": "professional_solo", "type": "professional"},
        "product_id": "prod_U5i6qK0y9S8s4f",
        "prices": {
            "monthly": {"amount": Decimal("99.00"), "id": "price_1T7WgoB3EXvvERPf5lqYlPsn"},
        },
    },
    "professional_small_firm": {
        "name": "Professional - Small Firm",
        "description": "For small firms and teams",
        "metadata": {"tier": "professional_small_firm", "type": "professional"},
        "product_id": "prod_U5i6Wfe7E6vHtZ",
        "prices": {
            "monthly": {"amount": Decimal("299.00"), "id": "price_1T7WgoB3EXvvERPfTe6d3Ccx"},
        },
    },
    "professional_mid_size": {
        "name": "Professional - Mid-Size",
        "description": "For mid-size firms with expanded case and team limits",
        "metadata": {"tier": "professional_mid_size", "type": "professional"},
        "product_id": "prod_U5i76092E7v6uB",
        "prices": {
            "monthly": {"amount": Decimal("799.00"), "id": "price_1T7WgoB3EXvvERPfoq938f4f"},
        },
    },
    # Reports (One-time payments, but tracked here for sync)
    "report_financial": {
        "name": "Financial Compliance Report",
        "description": "Detailed audit of all expense reimbursements and obligation payments",
        "metadata": {"type": "report", "report_type": "financial_compliance"},
        "product_id": "prod_U5i6uitcZE1ykf",
        "prices": {
            "one_time": {"amount": Decimal("79.00"), "id": "price_1T7WgrB3EXvvERPfR1NuSnre"},
        },
    },
    "report_communication": {
        "name": "Communication Analysis Report",
        "description": "Deep dive into message patterns, toxicity levels, and ARIA interventions",
        "metadata": {"type": "report", "report_type": "communication_analysis"},
        "product_id": "prod_U5i6T4xMbbYmrh",
        "prices": {
            "one_time": {"amount": Decimal("49.00"), "id": "price_1T7WgrB3EXvvERPfgGIUwJwa"},
        },
    },
    "report_court": {
        "name": "Court Investigation Package",
        "description": "Comprehensive analysis of communication, schedule, and custody exchanges",
        "metadata": {"type": "report", "report_type": "court_investigation"},
        "product_id": "prod_U5i76092E7v6uB",
        "prices": {
            "one_time": {"amount": Decimal("149.00"), "id": "price_1T7WgrB3EXvvERPfv7Qz9yOq"},
        },
    },
    "rush_delivery": {
        "name": "Rush Report Delivery",
        "description": "48 hour turnaround for reports",
        "metadata": {"type": "addon", "addon_type": "rush"},
        "product_id": "prod_U5i7U0VOUv5SSz",
        "prices": {
            "one_time": {"amount": Decimal("50.00"), "id": "price_1T7WgsB3EXvvERPfzQwnJ8yq"},
        },
    },
    "urgent_delivery": {
        "name": "Urgent Report Delivery",
        "description": "24 hour turnaround for reports",
        "metadata": {"type": "addon", "addon_type": "urgent"},
        "product_id": "prod_U5i7ekUzdGW0sX",
        "prices": {
            "one_time": {"amount": Decimal("100.00"), "id": "price_1T7WgsB3EXvvERPfSV4M1DmI"},
        },
    },
}


async def create_or_update_product(config: dict) -> str:
    """
    Ensure Stripe Product exists and matches config.
    """
    product_id = config.get("product_id")
    
    if product_id:
        try:
            product = stripe.Product.retrieve(product_id)
            print(f"  ✓ Found product by ID: {product_id}")
            # Update product to match metadata/desc if needed
            stripe.Product.modify(
                product_id,
                name=config["name"],
                description=config["description"],
                metadata=config["metadata"],
            )
            return product_id
        except stripe.error.InvalidRequestError:
            print(f"  ⚠ Product ID {product_id} not found, creating...")

    # Fallback to search by name/metadata
    existing_products = stripe.Product.search(
        query=f"name:'{config['name']}' AND active:'true'",
        limit=1,
    )

    if existing_products.data:
        product = existing_products.data[0]
        print(f"  ✓ Found product by name: {product.id}")
        stripe.Product.modify(
            product.id,
            description=config["description"],
            metadata=config["metadata"],
        )
        return product.id
    else:
        product = stripe.Product.create(
            name=config["name"],
            description=config["description"],
            metadata=config["metadata"],
        )
        print(f"  ✓ Created new product: {product.id}")
        return product.id


async def create_or_update_price(
    product_id: str,
    amount: Decimal,
    interval: str,
    config: dict,
    price_id: Optional[str] = None,
) -> str:
    """
    Ensure Stripe Price exists and matches config.
    """
    amount_cents = int(amount * 100)

    if price_id:
        try:
            price = stripe.Price.retrieve(price_id)
            print(f"    ✓ Found price by ID: {price_id} (${amount}/{interval})")
            return price_id
        except stripe.error.InvalidRequestError:
            print(f"    ⚠ Price ID {price_id} not found, creating...")

    # Search for matching active price
    query = f"product:'{product_id}' AND active:'true' AND unit_amount:'{amount_cents}'"
    if interval != "one_time":
        query += f" AND recurring['interval']:'{interval}'"
    
    existing_prices = stripe.Price.search(query=query, limit=1)

    if existing_prices.data:
        price = existing_prices.data[0]
        print(f"    ✓ Found matching price: {price.id} (${amount}/{interval})")
        return price.id

    # Create new price
    params = {
        "product": product_id,
        "unit_amount": amount_cents,
        "currency": "usd",
        "metadata": {
            **config.get("metadata", {}),
            "interval": interval,
            "platform": "commonground",
        },
    }
    
    if interval != "one_time":
        params["recurring"] = {"interval": interval}

    price = stripe.Price.create(**params)
    print(f"    ✓ Created new price: {price.id} (${amount}/{interval})")
    return price.id


async def update_database_plan(
    db: AsyncSession,
    plan_code: str,
    product_id: str,
    prices: dict,
    config: dict,
) -> None:
    """
    Update subscription_plans table with Stripe IDs (for parent tiers).
    """
    # Only update if it's a known parent tier
    parent_plans = ["web_starter", "plus", "complete"]
    if plan_code not in parent_plans:
        return

    stmt = (
        update(SubscriptionPlan)
        .where(SubscriptionPlan.plan_code == plan_code)
        .values(
            stripe_product_id=product_id,
            stripe_price_id_monthly=prices.get("monthly"),
            stripe_price_id_annual=prices.get("annual"),
            display_name=config["name"],
            description=config["description"],
            price_monthly=config["prices"].get("monthly", {}).get("amount", 0),
            price_annual=config["prices"].get("annual", {}).get("amount", 0),
        )
    )

    await db.execute(stmt)
    await db.commit()
    print(f"  ✓ Updated database record for {plan_code}")


async def sync_all_products(db: AsyncSession, dry_run: bool = False) -> None:
    """
    Sync all subscription products and prices to Stripe.
    """
    print("\n" + "=" * 60)
    print("CommonGround Subscription & Product Sync")
    print("=" * 60)

    if dry_run:
        print("⚠️  DRY RUN MODE - No changes will be made to Stripe (but DB would update)")
    else:
        print("🔴 LIVE MODE - Changes will be made to Stripe and DB")

    print(f"Stripe API Key: {'*' * 20}{settings.STRIPE_SECRET_KEY[-6:] if settings.STRIPE_SECRET_KEY else 'MISSING'}")
    print("=" * 60 + "\n")

    for plan_code, config in SUBSCRIPTION_PRODUCTS.items():
        print(f"Processing: {config['name']} ({plan_code})")
        print("-" * 60)

        if dry_run:
            print(f"  [DRY RUN] Would sync product: {config['name']}")
            for interval, price_config in config["prices"].items():
                print(f"  [DRY RUN] Would sync price: {price_config['id']} (${price_config['amount']}/{interval})")
            continue

        # Create or update product
        product_id = await create_or_update_product(config)

        # Create or update prices
        synced_prices = {}
        for interval, price_config in config["prices"].items():
            price_id = await create_or_update_price(
                product_id,
                price_config["amount"],
                interval,
                config,
                price_id=price_config.get("id"),
            )
            synced_prices[interval] = price_id

        # Update database for subscription plans
        await update_database_plan(
            db,
            plan_code,
            product_id,
            synced_prices,
            config,
        )

        print()

    print("=" * 60)
    if dry_run:
        print("✅ Dry run complete")
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
