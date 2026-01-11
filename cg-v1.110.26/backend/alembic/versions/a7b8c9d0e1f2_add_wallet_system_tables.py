"""Add wallet system tables

Revision ID: a7b8c9d0e1f2
Revises: 39cfacf2f90f
Create Date: 2026-01-10 12:00:00.000000

This migration adds the wallet system for ClearFund payments:
- wallets: Parent wallets (Stripe Connect) and child wallets (internal ledger)
- wallet_transactions: Immutable transaction records
- wallet_fundings: Links obligations to wallet payments
- child_wallet_contributions: Guest contributions to child wallets
- payouts: Transfers to parent wallets when obligations are funded
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7b8c9d0e1f2'
down_revision = '39cfacf2f90f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create wallets table
    op.create_table(
        'wallets',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('owner_type', sa.String(20), nullable=False),  # parent, child
        sa.Column('owner_id', sa.String(36), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=True, index=True),
        sa.Column('wallet_type', sa.String(30), nullable=False),  # parent_connect, child_ledger
        sa.Column('display_name', sa.String(100), nullable=True),

        # Stripe Connect (parent wallets)
        sa.Column('stripe_account_id', sa.String(100), unique=True, nullable=True, index=True),
        sa.Column('stripe_account_status', sa.String(30), nullable=True),
        sa.Column('bank_last_four', sa.String(4), nullable=True),
        sa.Column('bank_name', sa.String(100), nullable=True),

        # Onboarding
        sa.Column('onboarding_completed', sa.Boolean, default=False),
        sa.Column('onboarding_started_at', sa.DateTime, nullable=True),
        sa.Column('onboarding_completed_at', sa.DateTime, nullable=True),

        # Verification
        sa.Column('charges_enabled', sa.Boolean, default=False),
        sa.Column('payouts_enabled', sa.Boolean, default=False),

        # Status
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('suspended_at', sa.DateTime, nullable=True),
        sa.Column('suspension_reason', sa.Text, nullable=True),

        # Extra data and timestamps
        sa.Column('extra_data', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create composite indexes for wallets
    op.create_index('ix_wallets_owner', 'wallets', ['owner_type', 'owner_id'])
    op.create_index('ix_wallets_family', 'wallets', ['family_file_id', 'owner_type'])

    # Create wallet_transactions table
    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('wallet_id', sa.String(36), sa.ForeignKey('wallets.id'), nullable=False, index=True),

        # Transaction details
        sa.Column('transaction_type', sa.String(30), nullable=False, index=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('status', sa.String(20), default='pending', index=True),

        # Stripe references
        sa.Column('stripe_payment_intent_id', sa.String(100), nullable=True, index=True),
        sa.Column('stripe_charge_id', sa.String(100), nullable=True),
        sa.Column('stripe_transfer_id', sa.String(100), nullable=True),
        sa.Column('stripe_payout_id', sa.String(100), nullable=True),

        # Source/destination
        sa.Column('source_type', sa.String(30), nullable=True),
        sa.Column('source_id', sa.String(100), nullable=True),
        sa.Column('destination_type', sa.String(30), nullable=True),
        sa.Column('destination_id', sa.String(100), nullable=True),

        # Related entities
        sa.Column('obligation_id', sa.String(36), sa.ForeignKey('obligations.id'), nullable=True, index=True),
        sa.Column('payout_id', sa.String(36), nullable=True, index=True),  # FK added after payouts table

        # Fees
        sa.Column('fee_amount', sa.Numeric(10, 2), default=0),
        sa.Column('net_amount', sa.Numeric(10, 2), default=0),
        sa.Column('balance_after', sa.Numeric(10, 2), nullable=True),

        # Extra data
        sa.Column('extra_data', sa.JSON, nullable=True),

        # Timestamps
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('failed_at', sa.DateTime, nullable=True),
        sa.Column('failure_reason', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create composite indexes for wallet_transactions
    op.create_index('ix_wallet_transactions_wallet_status', 'wallet_transactions', ['wallet_id', 'status'])
    op.create_index('ix_wallet_transactions_wallet_created', 'wallet_transactions', ['wallet_id', 'created_at'])

    # Create wallet_fundings table (links obligations to wallet payments)
    op.create_table(
        'wallet_fundings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('obligation_id', sa.String(36), sa.ForeignKey('obligations.id'), nullable=False, index=True),
        sa.Column('wallet_id', sa.String(36), sa.ForeignKey('wallets.id'), nullable=True, index=True),
        sa.Column('payer_id', sa.String(36), nullable=False, index=True),

        # Amount
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),

        # Payment source
        sa.Column('payment_source', sa.String(30), nullable=False),  # wallet, card, ach

        # Transaction links
        sa.Column('wallet_transaction_id', sa.String(36), sa.ForeignKey('wallet_transactions.id'), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.String(100), nullable=True, index=True),
        sa.Column('stripe_charge_id', sa.String(100), nullable=True),

        # Status
        sa.Column('status', sa.String(20), default='pending'),

        # Timestamps
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('failed_at', sa.DateTime, nullable=True),
        sa.Column('failure_reason', sa.Text, nullable=True),

        # Extra data
        sa.Column('extra_data', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create composite index for wallet_fundings
    op.create_index('ix_wallet_fundings_obligation_payer', 'wallet_fundings', ['obligation_id', 'payer_id'])

    # Create child_wallet_contributions table
    op.create_table(
        'child_wallet_contributions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('child_wallet_id', sa.String(36), sa.ForeignKey('wallets.id'), nullable=False, index=True),
        sa.Column('child_id', sa.String(36), sa.ForeignKey('children.id'), nullable=False, index=True),
        sa.Column('family_file_id', sa.String(36), sa.ForeignKey('family_files.id'), nullable=False, index=True),

        # Contributor info
        sa.Column('contributor_name', sa.String(200), nullable=False),
        sa.Column('contributor_email', sa.String(255), nullable=False),
        sa.Column('contributor_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('contributor_circle_contact_id', sa.String(36), sa.ForeignKey('circle_contacts.id'), nullable=True),

        # Amount
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),

        # Purpose and message
        sa.Column('purpose', sa.String(500), nullable=True),
        sa.Column('message', sa.Text, nullable=True),

        # Stripe payment
        sa.Column('stripe_payment_intent_id', sa.String(100), nullable=False, index=True),
        sa.Column('stripe_charge_id', sa.String(100), nullable=True),

        # Fees
        sa.Column('fee_amount', sa.Numeric(10, 2), default=0),
        sa.Column('net_amount', sa.Numeric(10, 2), default=0),

        # Status
        sa.Column('status', sa.String(20), default='pending'),

        # Transaction link
        sa.Column('wallet_transaction_id', sa.String(36), sa.ForeignKey('wallet_transactions.id'), nullable=True),

        # Timestamps
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('failed_at', sa.DateTime, nullable=True),
        sa.Column('failure_reason', sa.Text, nullable=True),
        sa.Column('receipt_sent_at', sa.DateTime, nullable=True),

        # Extra data
        sa.Column('extra_data', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create indexes for child_wallet_contributions
    op.create_index('ix_child_contributions_child', 'child_wallet_contributions', ['child_id', 'created_at'])
    op.create_index('ix_child_contributions_email', 'child_wallet_contributions', ['contributor_email'])

    # Create payouts table
    op.create_table(
        'payouts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('obligation_id', sa.String(36), sa.ForeignKey('obligations.id'), unique=True, nullable=False, index=True),
        sa.Column('recipient_wallet_id', sa.String(36), sa.ForeignKey('wallets.id'), nullable=False, index=True),
        sa.Column('recipient_user_id', sa.String(36), nullable=False, index=True),

        # Amounts
        sa.Column('gross_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('fee_amount', sa.Numeric(10, 2), default=0),
        sa.Column('net_amount', sa.Numeric(10, 2), nullable=False),

        # Stripe references
        sa.Column('stripe_transfer_id', sa.String(100), nullable=True, index=True),
        sa.Column('stripe_payout_id', sa.String(100), nullable=True),

        # Status
        sa.Column('status', sa.String(20), default='pending', index=True),

        # Approval
        sa.Column('requires_approval', sa.Boolean, default=True),
        sa.Column('approved_at', sa.DateTime, nullable=True),
        sa.Column('approved_by', sa.String(36), nullable=True),

        # Timestamps
        sa.Column('initiated_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('processing_at', sa.DateTime, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('failed_at', sa.DateTime, nullable=True),
        sa.Column('failure_reason', sa.Text, nullable=True),
        sa.Column('estimated_arrival', sa.DateTime, nullable=True),

        # Extra data
        sa.Column('extra_data', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create composite index for payouts
    op.create_index('ix_payouts_recipient_status', 'payouts', ['recipient_user_id', 'status'])

    # Now add the foreign key for wallet_transactions.payout_id
    op.create_foreign_key(
        'fk_wallet_transactions_payout',
        'wallet_transactions', 'payouts',
        ['payout_id'], ['id']
    )


def downgrade() -> None:
    # Drop foreign key first
    op.drop_constraint('fk_wallet_transactions_payout', 'wallet_transactions', type_='foreignkey')

    # Drop tables in reverse order
    op.drop_table('payouts')
    op.drop_table('child_wallet_contributions')
    op.drop_table('wallet_fundings')
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')
