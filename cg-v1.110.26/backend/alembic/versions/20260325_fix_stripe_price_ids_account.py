"""Fix Stripe price/product IDs to match correct Stripe account (BJIivbOFX7).

Revision ID: 20260325_fix_stripe_acct
Revises: 20260325_fix_plans
Create Date: 2026-03-25

Previous migrations used price/product IDs from the wrong Stripe account
(B3EXvvERPf). This migration corrects all plans to match the correct
Stripe account (BJIivbOFX7) which has Connect enabled.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260325_fix_stripe_acct"
down_revision = "20260325_fix_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update subscription_plans with correct BJIivbOFX7 Stripe account IDs."""

    # Web Starter ($0/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQdxPYuteQUA',
            stripe_price_id_monthly = 'price_1TE0bXBJIivbOFX7luV9H7OZ',
            stripe_price_id_annual = NULL,
            updated_at = NOW()
        WHERE plan_code = 'web_starter'
    """)

    # Plus ($17.99/mo, $199.99/yr)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQBUvNRmZ4Cs',
            stripe_price_id_monthly = 'price_1TE0bXBJIivbOFX70Ysv656Q',
            stripe_price_id_annual = 'price_1TE0bYBJIivbOFX7atup1qAE',
            updated_at = NOW()
        WHERE plan_code = 'plus'
    """)

    # Complete ($34.99/mo, $349.99/yr)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQxC2eRt7g6K',
            stripe_price_id_monthly = 'price_1TE0bYBJIivbOFX7VqmtQH23',
            stripe_price_id_annual = 'price_1TE0bZBJIivbOFX77f2QUPc6',
            updated_at = NOW()
        WHERE plan_code = 'complete'
    """)

    # Professional Starter ($49/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQevbVaWJDfT',
            stripe_price_id_monthly = 'price_1TE0bZBJIivbOFX7kmvDAoqr',
            updated_at = NOW()
        WHERE plan_code = 'professional_starter'
    """)

    # Solo ($99/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQVLqjYyuiRF',
            stripe_price_id_monthly = 'price_1TE0baBJIivbOFX7dqc7W1Dp',
            updated_at = NOW()
        WHERE plan_code = 'solo'
    """)

    # Small Firm ($299/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQOK9Qpuw1hB',
            stripe_price_id_monthly = 'price_1TE0baBJIivbOFX7smGjiSyj',
            updated_at = NOW()
        WHERE plan_code = 'small_firm'
    """)

    # Mid-Size ($799/mo)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQQwcr2VaCXs',
            stripe_price_id_monthly = 'price_1TE0bbBJIivbOFX78k6VF4wC',
            updated_at = NOW()
        WHERE plan_code = 'mid_size'
    """)

    print("✓ All subscription plans updated with correct BJIivbOFX7 Stripe account IDs")


def downgrade() -> None:
    pass
