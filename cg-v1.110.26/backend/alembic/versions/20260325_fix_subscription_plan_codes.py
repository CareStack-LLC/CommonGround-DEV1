"""Ensure subscription plans exist with correct codes and Stripe price IDs.

Revision ID: 20260325_fix_plans
Revises: update_stripe_v3
Create Date: 2026-03-25

Fixes "Plan 'plus' not found" error by upserting all three parent
subscription plans with the current Stripe price IDs from the
production Stripe account.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260325_fix_plans"
down_revision = "update_stripe_v3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upsert subscription plans with correct plan codes and Stripe IDs."""

    # First: rename any legacy plan codes that might still exist
    op.execute("""
        UPDATE subscription_plans
        SET plan_code = 'web_starter'
        WHERE plan_code = 'starter'
    """)

    op.execute("""
        UPDATE subscription_plans
        SET plan_code = 'complete'
        WHERE plan_code = 'family_plus'
    """)

    # Upsert Web Starter plan
    op.execute("""
        INSERT INTO subscription_plans (
            id, plan_code, display_name, description, badge,
            price_monthly, price_annual,
            stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
            features, is_active, display_order, trial_days,
            created_at, updated_at
        ) VALUES (
            'plan_web_starter_001',
            'web_starter',
            'Web Starter',
            'Free web-only access with basic features',
            NULL,
            0.00, 0.00,
            'prod_UCPQdxPYuteQUA',
            'price_1TE0bXBJIivbOFX7luV9H7OZ',
            NULL,
            '{"aria_manual_sentiment": true, "aria_advanced": false, "clearfund_fee_exempt": false, "quick_accords": false, "auto_scheduling": false, "custody_dashboard": false, "pdf_summaries": false, "circle_contacts_limit": 0, "kidcoms_access": false, "theater_mode": false, "court_reporting": false, "silent_handoff_gps": true, "timebridge_calendar": true, "timebridge_manual_only": true, "mobile_access": false}'::jsonb,
            true, 0, 0,
            NOW(), NOW()
        )
        ON CONFLICT (plan_code) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            price_monthly = EXCLUDED.price_monthly,
            price_annual = EXCLUDED.price_annual,
            stripe_product_id = EXCLUDED.stripe_product_id,
            stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
            stripe_price_id_annual = EXCLUDED.stripe_price_id_annual,
            features = EXCLUDED.features,
            is_active = EXCLUDED.is_active,
            display_order = EXCLUDED.display_order,
            updated_at = NOW()
    """)

    # Upsert Plus plan
    op.execute("""
        INSERT INTO subscription_plans (
            id, plan_code, display_name, description, badge,
            price_monthly, price_annual,
            stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
            features, is_active, display_order, trial_days,
            created_at, updated_at
        ) VALUES (
            'plan_plus_001',
            'plus',
            'Plus',
            'Structure & stability with mobile apps and automation.',
            'Most Popular',
            17.99, 199.99,
            'prod_UCPQBUvNRmZ4Cs',
            'price_1TE0bXBJIivbOFX70Ysv656Q',
            'price_1TE0bYBJIivbOFX7atup1qAE',
            '{"aria_manual_sentiment": true, "aria_advanced": false, "clearfund_fee_exempt": true, "quick_accords": true, "auto_scheduling": true, "custody_dashboard": true, "pdf_summaries": true, "circle_contacts_limit": 1, "kidcoms_access": false, "theater_mode": false, "court_reporting": false, "silent_handoff_gps": true, "timebridge_calendar": true, "timebridge_manual_only": false, "mobile_access": true}'::jsonb,
            true, 1, 14,
            NOW(), NOW()
        )
        ON CONFLICT (plan_code) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            badge = EXCLUDED.badge,
            price_monthly = EXCLUDED.price_monthly,
            price_annual = EXCLUDED.price_annual,
            stripe_product_id = EXCLUDED.stripe_product_id,
            stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
            stripe_price_id_annual = EXCLUDED.stripe_price_id_annual,
            features = EXCLUDED.features,
            is_active = EXCLUDED.is_active,
            display_order = EXCLUDED.display_order,
            updated_at = NOW()
    """)

    # Upsert Complete plan
    op.execute("""
        INSERT INTO subscription_plans (
            id, plan_code, display_name, description, badge,
            price_monthly, price_annual,
            stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
            features, is_active, display_order, trial_days,
            created_at, updated_at
        ) VALUES (
            'plan_complete_001',
            'complete',
            'Complete',
            'High-conflict/court-ready with full feature set.',
            'Best Value',
            34.99, 349.99,
            'prod_UCPQxC2eRt7g6K',
            'price_1TE0bYBJIivbOFX7VqmtQH23',
            'price_1TE0bZBJIivbOFX77f2QUPc6',
            '{"aria_manual_sentiment": true, "aria_advanced": true, "clearfund_fee_exempt": true, "quick_accords": true, "auto_scheduling": true, "custody_dashboard": true, "pdf_summaries": true, "circle_contacts_limit": 5, "kidcoms_access": true, "theater_mode": true, "court_reporting": true, "silent_handoff_gps": true, "timebridge_calendar": true, "timebridge_manual_only": false, "mobile_access": true}'::jsonb,
            true, 2, 14,
            NOW(), NOW()
        )
        ON CONFLICT (plan_code) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            badge = EXCLUDED.badge,
            price_monthly = EXCLUDED.price_monthly,
            price_annual = EXCLUDED.price_annual,
            stripe_product_id = EXCLUDED.stripe_product_id,
            stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
            stripe_price_id_annual = EXCLUDED.stripe_price_id_annual,
            features = EXCLUDED.features,
            is_active = EXCLUDED.is_active,
            display_order = EXCLUDED.display_order,
            updated_at = NOW()
    """)

    # Update any users still on legacy tier names
    op.execute("""
        UPDATE user_profiles
        SET subscription_tier = 'web_starter'
        WHERE subscription_tier = 'starter'
    """)

    op.execute("""
        UPDATE user_profiles
        SET subscription_tier = 'complete'
        WHERE subscription_tier = 'family_plus'
    """)

    print("✓ Subscription plans upserted with correct Stripe price IDs")


def downgrade() -> None:
    pass
