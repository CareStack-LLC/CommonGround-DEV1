"""Deactivate the stale paid professional_starter plan row.

The paid $49 "Professional - Starter" tier was retired in the
free-to-practice repricing (Starter is free and needs no plan row), but an
active subscription_plans row for it remains in prod with a Stripe price ID
from the wrong Stripe account. Deactivate it so nothing can ever offer it.

Revision ID: retire_pro_starter_2807
Revises: ca_firm_nullable_2807
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "retire_pro_starter_2807"
down_revision = "ca_firm_nullable_2807"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE subscription_plans
        SET is_active = false, updated_at = NOW()
        WHERE plan_code = 'professional_starter'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE subscription_plans
        SET is_active = true, updated_at = NOW()
        WHERE plan_code = 'professional_starter'
        """
    )
