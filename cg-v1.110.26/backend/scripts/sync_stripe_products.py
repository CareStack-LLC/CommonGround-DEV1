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
    # Parent Tiers (BJIivbOFX7 account)
    "web_starter": {
        "name": "Web Starter",
        "description": "Free web-only access with basic co-parenting features",
        "metadata": {"tier": "web_starter", "platform": "commonground"},
        "product_id": "prod_UCPQdxPYuteQUA",
        "prices": {
            "monthly": {"amount": Decimal("0.00"), "id": "price_1TE0bXBJIivbOFX7luV9H7OZ"},
        },
    },
    "plus": {
        "name": "Plus",
        "description": "Structure & stability with mobile apps and automation",
        "metadata": {"tier": "plus", "platform": "commonground"},
        "product_id": "prod_UCPQBUvNRmZ4Cs",
        "prices": {
            "monthly": {"amount": Decimal("17.99"), "id": "price_1TE0bXBJIivbOFX70Ysv656Q"},
            "annual": {"amount": Decimal("199.99"), "id": "price_1TE0bYBJIivbOFX7atup1qAE"},
        },
    },
    "complete": {
        "name": "Complete",
        "description": "High-conflict/court-ready with full feature set including Silent Handoff and KidsCom",
        "metadata": {"tier": "complete", "platform": "commonground"},
        "product_id": "prod_UCPQxC2eRt7g6K",
        "prices": {
            "monthly": {"amount": Decimal("34.99"), "id": "price_1TE0bYBJIivbOFX7VqmtQH23"},
            "annual": {"amount": Decimal("349.99"), "id": "price_1TE0bZBJIivbOFX77f2QUPc6"},
        },
    },
    # Professional Tiers (BJIivbOFX7 account)
    # NOTE (2026-07 repricing): the paid "Professional - Starter" ($49) product
    # prod_UCPQevbVaWJDfT is RETIRED — the starter tier is free and needs no
    # Stripe product. Solo took over the $49 price point. New amounts require
    # new Price objects (Stripe prices are immutable), so the entries below
    # have no hardcoded price IDs — the script creates them and writes the IDs
    # into subscription_plans; the webhook resolves them via its DB fallback.
    "professional_solo": {
        "name": "Professional - Solo",
        "description": "For independent attorneys and mediators managing up to 15 active cases. AI intake, court-order OCR, and included compliance reports.",
        "metadata": {"tier": "professional_solo", "type": "professional"},
        "product_id": "prod_UCPQVLqjYyuiRF",
        "plan_code": "solo",
        "display_name": "Solo Practitioner",
        "prices": {
            "monthly": {"amount": Decimal("49.00")},
            "annual": {"amount": Decimal("490.00")},
        },
    },
    "professional_small_firm": {
        "name": "Professional - Firm",
        "description": "For practices with up to 5 team members and 50 active cases. Firm management, case queue, templates, analytics, and featured directory placement.",
        "metadata": {"tier": "professional_small_firm", "type": "professional"},
        "product_id": "prod_UCPQOK9Qpuw1hB",
        "plan_code": "small_firm",
        "display_name": "Firm",
        "prices": {
            "monthly": {"amount": Decimal("249.00")},
            "annual": {"amount": Decimal("2490.00")},
        },
    },
    "professional_mid_size": {
        "name": "Professional - Mid-Size",
        "description": "For growing practices with up to 15 team members and 150 active cases. Everything in Firm plus API access.",
        "metadata": {"tier": "professional_mid_size", "type": "professional"},
        "product_id": "prod_UCPQQwcr2VaCXs",
        "plan_code": "mid_size",
        "display_name": "Mid-Size Firm",
        "prices": {
            "monthly": {"amount": Decimal("599.00")},
            "annual": {"amount": Decimal("5990.00")},
        },
    },
    # Reports (One-time payments, BJIivbOFX7 account)
    "report_financial": {
        "name": "Financial Compliance Report",
        "description": "Detailed audit of all expense reimbursements and obligation payments",
        "metadata": {"type": "report", "report_type": "financial_compliance"},
        "product_id": "prod_UCPQwdLQurLuJL",
        "prices": {
            "one_time": {"amount": Decimal("79.00"), "id": "price_1TE0bdBJIivbOFX7NIrWMiSg"},
        },
    },
    "report_communication": {
        "name": "Communication Analysis Report",
        "description": "Deep dive into message patterns, toxicity levels, and ARIA interventions",
        "metadata": {"type": "report", "report_type": "communication_analysis"},
        "product_id": "prod_UCPQI4zziqm3mM",
        "prices": {
            "one_time": {"amount": Decimal("79.00"), "id": "price_1TE0bcBJIivbOFX7d92QMhVJ"},
        },
    },
    "report_court": {
        "name": "Court Investigation Package",
        "description": "Comprehensive analysis of communication, schedule, and custody exchanges",
        "metadata": {"type": "report", "report_type": "court_investigation"},
        "product_id": "prod_UCPQOlUDOkaF3u",
        "prices": {
            "one_time": {"amount": Decimal("149.00"), "id": "price_1TE0bbBJIivbOFX7FwW5R7E9"},
        },
    },
    "report_kidspace": {
        "name": "KidSpace Court Communication Report",
        "description": "Court-ready KidSpace communication analysis with full session logs and ARIA flags",
        "metadata": {"type": "report", "report_type": "kidspace_court_communication"},
        "product_id": "prod_UDUUl1dVU9jrhf",
        "prices": {
            "one_time": {"amount": Decimal("79.00"), "id": "price_1TF3VXBJIivbOFX7GC4KkYc2"},
        },
    },
    "rush_delivery": {
        "name": "Rush Report Delivery",
        "description": "48 hour turnaround for reports",
        "metadata": {"type": "addon", "addon_type": "rush"},
        "product_id": "prod_UCPQTRgWRvrgc6",
        "prices": {
            "one_time": {"amount": Decimal("50.00"), "id": "price_1TE0bdBJIivbOFX758bn5Kto"},
        },
    },
    "urgent_delivery": {
        "name": "Urgent Report Delivery",
        "description": "24 hour turnaround for reports",
        "metadata": {"type": "addon", "addon_type": "urgent"},
        "product_id": "prod_UCPQ5vVhbWJRRE",
        "prices": {
            "one_time": {"amount": Decimal("100.00"), "id": "price_1TE0beBJIivbOFX7o1Cxoczu"},
        },
    },
}


# Products to archive in Stripe (2026-07 repricing): the paid Professional
# Starter tier was folded into the free starter tier.
RETIRED_PRODUCT_IDS = ["prod_UCPQevbVaWJDfT"]  # Professional - Starter ($49)


async def archive_retired_products(dry_run: bool = False) -> None:
    """Mark retired products inactive in Stripe (existing subs are unaffected)."""
    for product_id in RETIRED_PRODUCT_IDS:
        if dry_run:
            print(f"  [DRY RUN] Would archive retired product: {product_id}")
            continue
        try:
            stripe.Product.modify(product_id, active=False)
            print(f"  ✓ Archived retired product: {product_id}")
        except stripe.error.InvalidRequestError:
            print(f"  ⚠ Retired product not found (already gone?): {product_id}")


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

    # Config intervals -> Stripe recurring intervals (None = one-time)
    stripe_interval = {"monthly": "month", "annual": "year", "one_time": None}[interval]

    # Find a matching active price. Stripe's search API cannot query
    # unit_amount or recurring.interval, so list the product's active
    # prices and filter here.
    existing_prices = stripe.Price.list(product=product_id, active=True, limit=100)
    for price in existing_prices.auto_paging_iter():
        if price.unit_amount != amount_cents:
            continue
        found_interval = price.recurring.interval if price.recurring else None
        if found_interval == stripe_interval:
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
    
    if stripe_interval is not None:
        params["recurring"] = {"interval": stripe_interval}

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
    Update subscription_plans table with Stripe IDs (parent + professional tiers).
    """
    # Professional configs carry an explicit plan_code (e.g. "solo") that
    # differs from their SUBSCRIPTION_PRODUCTS key; parent tiers use the key.
    db_plan_code = config.get("plan_code", plan_code)
    known_plans = ["web_starter", "plus", "complete", "solo", "small_firm", "mid_size"]
    if db_plan_code not in known_plans:
        return

    stmt = (
        update(SubscriptionPlan)
        .where(SubscriptionPlan.plan_code == db_plan_code)
        .values(
            stripe_product_id=product_id,
            stripe_price_id_monthly=prices.get("monthly"),
            stripe_price_id_annual=prices.get("annual"),
            # In-app display name; falls back to the Stripe product name.
            display_name=config.get("display_name", config["name"]),
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

    print("Retiring discontinued products")
    print("-" * 60)
    await archive_retired_products(dry_run=dry_run)

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
