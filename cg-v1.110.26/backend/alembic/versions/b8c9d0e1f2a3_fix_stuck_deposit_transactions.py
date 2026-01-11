"""Fix stuck deposit transactions

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-01-11 00:45:00.000000

This migration fixes deposit transactions that got stuck in 'processing' status.
Before the confirm_deposit endpoint was added, the frontend would complete 3D Secure
with Stripe but never notify the backend, leaving transactions in 'processing' status.

These transactions should be marked as 'completed' since the Stripe payment succeeded.
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = 'b8c9d0e1f2a3'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update stuck deposit transactions from 'processing' to 'completed'
    # These are deposits that completed on Stripe but backend was never notified
    op.execute("""
        UPDATE wallet_transactions
        SET status = 'completed',
            completed_at = COALESCE(completed_at, NOW())
        WHERE transaction_type IN ('deposit_card', 'deposit_ach')
        AND status = 'processing'
        AND stripe_payment_intent_id IS NOT NULL
    """)

    # Also fix any that are stuck in 'pending' with a payment intent
    # (edge case where payment succeeded but status never updated)
    op.execute("""
        UPDATE wallet_transactions
        SET status = 'completed',
            completed_at = COALESCE(completed_at, NOW())
        WHERE transaction_type IN ('deposit_card', 'deposit_ach')
        AND status = 'pending'
        AND stripe_payment_intent_id IS NOT NULL
    """)


def downgrade() -> None:
    # Cannot reliably downgrade - we don't know which transactions
    # were originally in processing vs completed
    pass
