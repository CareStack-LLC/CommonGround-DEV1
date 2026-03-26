"""Update Stripe price IDs - Final Sync March 2026 V3.

Revision ID: update_stripe_v3
Revises: update_stripe_v2
Create Date: 2026-03-07
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = 'update_stripe_v3'
down_revision = 'update_stripe_v2'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Update parent plans with latest verified IDs from user CSV
    
    # Web Starter (free)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQdxPYuteQUA',
            stripe_price_id_monthly = 'price_1TE0bXBJIivbOFX7luV9H7OZ',
            stripe_price_id_annual = NULL
        WHERE plan_code = 'web_starter'
    """)

    # Plus
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQBUvNRmZ4Cs',
            stripe_price_id_monthly = 'price_1TE0bXBJIivbOFX70Ysv656Q',
            stripe_price_id_annual = 'price_1TE0bYBJIivbOFX7atup1qAE'
        WHERE plan_code = 'plus'
    """)

    # Complete
    op.execute("""
        UPDATE subscription_plans
        SET stripe_product_id = 'prod_UCPQxC2eRt7g6K',
            stripe_price_id_monthly = 'price_1TE0bYBJIivbOFX7VqmtQH23',
            stripe_price_id_annual = 'price_1TE0bZBJIivbOFX77f2QUPc6'
        WHERE plan_code = 'complete'
    """)
    
    print("✓ Successfully updated Stripe IDs in subscription_plans table (V3)")


def downgrade() -> None:
    pass
