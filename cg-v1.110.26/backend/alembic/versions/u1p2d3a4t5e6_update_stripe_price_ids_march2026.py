"""Update Stripe price IDs to March 2026 test account.

Revision ID: u1p2d3a4t5e6
Revises: f1x2p3r4i5c6e7
Create Date: 2026-03-05

Updates subscription plan price IDs to match the CommonGround
Stripe test account products created March 2026.

New Products:
  Web Starter:              prod_U5i6vWb4ktGrTN
  Plus:                     prod_U5i6Efw49ipfb3
  Complete:                 prod_U5i6lsgC2mOHxn
  Professional - Starter:   prod_U5i6Vfe7E6vHtZ
  Professional - Solo:      prod_U5i6WdwYSiC9wc
  Professional - Small Firm: prod_U5i6tXPi3LbW5h
  Professional - Mid-Size:  prod_U5i6Pvkzonm0fe
  Court Investigation:      prod_U5i6ZMoAoSQBEH
  Custody Compliance Report: prod_U5i6FizFNRc51F
  Comm Analysis Report:     prod_U5i6T4xMbbYmrh
  Financial Compliance:     prod_U5i6uitcZE1ykf
  Rush Report Delivery:     prod_U5i7U0VOUv5SSz
  Urgent Report Delivery:   prod_U5i7ekUzdGW0sX
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "u1p2d3a4t5e6"
down_revision = "f1x2p3r4i5c6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update to March 2026 Stripe test price IDs."""

    # Web Starter (free)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1T7WgnB3EXvvERPfyu40gtfE',
            stripe_price_id_annual = NULL,
            stripe_product_id = 'prod_U5i6vWb4ktGrTN'
        WHERE plan_code = 'web_starter'
    """)

    # Plus plan - monthly & annual
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1T7WgnB3EXvvERPfcpZeMSSH',
            stripe_price_id_annual = 'price_1T7WgnB3EXvvERPfe7NNFlru',
            stripe_product_id = 'prod_U5i6Efw49ipfb3'
        WHERE plan_code = 'plus'
    """)

    # Complete plan - monthly & annual
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1T7WgoB3EXvvERPfDm7qKpBN',
            stripe_price_id_annual = 'price_1T7WgoB3EXvvERPfmDy9KtDh',
            stripe_product_id = 'prod_U5i6lsgC2mOHxn'
        WHERE plan_code = 'complete'
    """)


def downgrade() -> None:
    """Revert to previous test price IDs."""
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpxbVBQiJH5qPMuvFiaAc0m',
            stripe_price_id_annual = NULL
        WHERE plan_code = 'plus'
    """)
    op.execute("""
        UPDATE subscription_plans
        SET stripe_price_id_monthly = 'price_1SpxbpBQiJH5qPMu2hVbTv2F',
            stripe_price_id_annual = NULL
        WHERE plan_code IN ('complete', 'family_plus')
    """)
