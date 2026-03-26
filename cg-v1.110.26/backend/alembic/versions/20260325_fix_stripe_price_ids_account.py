"""Fix Stripe price/product IDs to match correct Stripe account.

Revision ID: 20260325_fix_stripe_acct
Revises: 20260325_fix_plans
Create Date: 2026-03-25

Previous migrations used price/product IDs from a different Stripe account
(BJIivbOFX7). This migration corrects them to match the actual Stripe
account (B3EXvvERPf) used in production/test.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260325_fix_stripe_acct"
down_revision = "20260325_fix_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update subscription_plans with correct Stripe account price/product IDs."""

    # Web Starter
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_U5i6vWb4ktGrTN',
            stripe_price_id_monthly = 'price_1T7WgnB3EXvvERPfyu40gtfE',
            updated_at = NOW()
        WHERE plan_code = 'web_starter'
    """)

    # Plus
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_U5i6Efw49ipfb3',
            stripe_price_id_monthly = 'price_1T7WgnB3EXvvERPfcpZeMSSH',
            stripe_price_id_annual = 'price_1T7WgnB3EXvvERPfe7NNFlru',
            updated_at = NOW()
        WHERE plan_code = 'plus'
    """)

    # Complete
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_U5i6lsgC2mOHxn',
            stripe_price_id_monthly = 'price_1T7WgoB3EXvvERPfDm7qKpBN',
            stripe_price_id_annual = 'price_1T7WgoB3EXvvERPfmDy9KtDh',
            updated_at = NOW()
        WHERE plan_code = 'complete'
    """)

    print("✓ Subscription plans updated with correct Stripe account price IDs")


def downgrade() -> None:
    pass
