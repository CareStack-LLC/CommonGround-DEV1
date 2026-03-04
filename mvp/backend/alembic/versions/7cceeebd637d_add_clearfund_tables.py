"""add_clearfund_tables

Revision ID: 7cceeebd637d
Revises: 8329cf5409d0
Create Date: 2025-12-31 21:46:38.744817

ClearFund: Purpose-locked financial obligations with court-ready records.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7cceeebd637d'
down_revision: Union[str, Sequence[str], None] = '8329cf5409d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if tables already exist and skip if so
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Create obligations table (main ClearFund table)
    if 'obligations' not in existing_tables:
        op.create_table(
            'obligations',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id'), nullable=False),
            sa.Column('source_type', sa.String(length=20), nullable=False),
            sa.Column('source_id', sa.String(length=36), nullable=True),
            sa.Column('purpose_category', sa.String(length=30), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('child_ids', sa.JSON(), nullable=True, default=[]),
            sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('petitioner_share', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('respondent_share', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('petitioner_percentage', sa.Integer(), nullable=False, default=50),
            sa.Column('due_date', sa.DateTime(), nullable=True),
            sa.Column('status', sa.String(length=25), nullable=False, default='open'),
            sa.Column('amount_funded', sa.Numeric(precision=10, scale=2), nullable=False, default=0),
            sa.Column('amount_spent', sa.Numeric(precision=10, scale=2), nullable=False, default=0),
            sa.Column('amount_verified', sa.Numeric(precision=10, scale=2), nullable=False, default=0),
            sa.Column('verification_required', sa.Boolean(), nullable=False, default=True),
            sa.Column('receipt_required', sa.Boolean(), nullable=False, default=False),
            sa.Column('receipt_deadline_hours', sa.Integer(), nullable=False, default=72),
            sa.Column('allowed_vendor_categories', sa.JSON(), nullable=True),
            sa.Column('allowed_vendors', sa.JSON(), nullable=True),
            sa.Column('is_recurring', sa.Boolean(), nullable=False, default=False),
            sa.Column('recurrence_rule', sa.String(length=200), nullable=True),
            sa.Column('parent_obligation_id', sa.String(length=36), nullable=True),
            sa.Column('created_by', sa.String(length=36), nullable=False),
            sa.Column('funded_at', sa.DateTime(), nullable=True),
            sa.Column('verified_at', sa.DateTime(), nullable=True),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.Column('expired_at', sa.DateTime(), nullable=True),
            sa.Column('cancelled_at', sa.DateTime(), nullable=True),
            sa.Column('cancellation_reason', sa.Text(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_obligations_case_id', 'obligations', ['case_id'])
        op.create_index('ix_obligations_status', 'obligations', ['status'])
        op.create_index('ix_obligations_created_by', 'obligations', ['created_by'])
        op.create_index('ix_obligations_due_date', 'obligations', ['due_date'])

    # Create obligation_funding table
    if 'obligation_funding' not in existing_tables:
        op.create_table(
            'obligation_funding',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('obligation_id', sa.String(length=36), sa.ForeignKey('obligations.id'), nullable=False),
            sa.Column('parent_id', sa.String(length=36), nullable=False),
            sa.Column('amount_required', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('amount_funded', sa.Numeric(precision=10, scale=2), nullable=False, default=0),
            sa.Column('stripe_payment_intent_id', sa.String(length=100), nullable=True),
            sa.Column('payment_method', sa.String(length=50), nullable=True),
            sa.Column('is_fully_funded', sa.Boolean(), nullable=False, default=False),
            sa.Column('funded_at', sa.DateTime(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_obligation_funding_obligation_id', 'obligation_funding', ['obligation_id'])
        op.create_index('ix_obligation_funding_parent_id', 'obligation_funding', ['parent_id'])

    # Create attestations table
    if 'attestations' not in existing_tables:
        op.create_table(
            'attestations',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('obligation_id', sa.String(length=36), sa.ForeignKey('obligations.id'), nullable=False, unique=True),
            sa.Column('attesting_parent_id', sa.String(length=36), nullable=False),
            sa.Column('attestation_text', sa.Text(), nullable=False),
            sa.Column('purpose_declaration', sa.Text(), nullable=False),
            sa.Column('receipt_commitment', sa.Boolean(), nullable=False, default=False),
            sa.Column('purpose_commitment', sa.Boolean(), nullable=False, default=True),
            sa.Column('legal_acknowledgment', sa.Boolean(), nullable=False, default=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('user_agent', sa.String(length=500), nullable=True),
            sa.Column('attested_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )

    # Create verification_artifacts table
    if 'verification_artifacts' not in existing_tables:
        op.create_table(
            'verification_artifacts',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('obligation_id', sa.String(length=36), sa.ForeignKey('obligations.id'), nullable=False),
            sa.Column('artifact_type', sa.String(length=30), nullable=False),
            sa.Column('stripe_transaction_id', sa.String(length=100), nullable=True),
            sa.Column('vendor_name', sa.String(length=200), nullable=True),
            sa.Column('vendor_mcc', sa.String(length=10), nullable=True),
            sa.Column('transaction_date', sa.DateTime(), nullable=True),
            sa.Column('amount_verified', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('receipt_url', sa.String(length=500), nullable=True),
            sa.Column('receipt_file_name', sa.String(length=200), nullable=True),
            sa.Column('receipt_file_type', sa.String(length=50), nullable=True),
            sa.Column('verified_by', sa.String(length=36), nullable=True),
            sa.Column('verification_method', sa.String(length=30), nullable=True),
            sa.Column('verification_notes', sa.Text(), nullable=True),
            sa.Column('verified_at', sa.DateTime(), nullable=False),
            sa.Column('receipt_hash', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_verification_artifacts_obligation_id', 'verification_artifacts', ['obligation_id'])

    # Create virtual_card_authorizations table (for v2)
    if 'virtual_card_authorizations' not in existing_tables:
        op.create_table(
            'virtual_card_authorizations',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('obligation_id', sa.String(length=36), sa.ForeignKey('obligations.id'), nullable=False, unique=True),
            sa.Column('stripe_card_id', sa.String(length=100), nullable=True),
            sa.Column('stripe_cardholder_id', sa.String(length=100), nullable=True),
            sa.Column('card_last_four', sa.String(length=4), nullable=True),
            sa.Column('amount_authorized', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('amount_spent', sa.Numeric(precision=10, scale=2), nullable=False, default=0),
            sa.Column('allowed_mccs', sa.JSON(), nullable=True),
            sa.Column('blocked_mccs', sa.JSON(), nullable=True),
            sa.Column('vendor_name', sa.String(length=200), nullable=True),
            sa.Column('vendor_category', sa.String(length=100), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('used_at', sa.DateTime(), nullable=True),
            sa.Column('cancelled_at', sa.DateTime(), nullable=True),
            sa.Column('activated_at', sa.DateTime(), nullable=True),
            sa.Column('activated_by', sa.String(length=36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )

    # Now add ClearFund columns to payment_ledger
    # Check which columns already exist
    existing_columns = [c['name'] for c in inspector.get_columns('payment_ledger')]

    if 'obligation_id' not in existing_columns:
        op.add_column('payment_ledger', sa.Column('obligation_id', sa.String(length=36), nullable=True))
        op.create_index(op.f('ix_payment_ledger_obligation_id'), 'payment_ledger', ['obligation_id'], unique=False)
        op.create_foreign_key('fk_payment_ledger_obligation', 'payment_ledger', 'obligations', ['obligation_id'], ['id'])

    if 'fifo_applied_to' not in existing_columns:
        op.add_column('payment_ledger', sa.Column('fifo_applied_to', sa.String(length=36), nullable=True))

    if 'credit_source' not in existing_columns:
        op.add_column('payment_ledger', sa.Column('credit_source', sa.String(length=20), nullable=True))

    if 'fifo_applied_at' not in existing_columns:
        op.add_column('payment_ledger', sa.Column('fifo_applied_at', sa.DateTime(), nullable=True))

    if 'fifo_remaining' not in existing_columns:
        op.add_column('payment_ledger', sa.Column('fifo_remaining', sa.Numeric(precision=10, scale=2), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Get existing info
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    existing_columns = [c['name'] for c in inspector.get_columns('payment_ledger')] if 'payment_ledger' in existing_tables else []

    # Remove payment_ledger ClearFund columns
    if 'obligation_id' in existing_columns:
        op.drop_constraint('fk_payment_ledger_obligation', 'payment_ledger', type_='foreignkey')
        op.drop_index(op.f('ix_payment_ledger_obligation_id'), table_name='payment_ledger')
        op.drop_column('payment_ledger', 'obligation_id')

    if 'fifo_remaining' in existing_columns:
        op.drop_column('payment_ledger', 'fifo_remaining')

    if 'fifo_applied_at' in existing_columns:
        op.drop_column('payment_ledger', 'fifo_applied_at')

    if 'credit_source' in existing_columns:
        op.drop_column('payment_ledger', 'credit_source')

    if 'fifo_applied_to' in existing_columns:
        op.drop_column('payment_ledger', 'fifo_applied_to')

    # Drop ClearFund tables in reverse order
    if 'virtual_card_authorizations' in existing_tables:
        op.drop_table('virtual_card_authorizations')

    if 'verification_artifacts' in existing_tables:
        op.drop_index('ix_verification_artifacts_obligation_id', 'verification_artifacts')
        op.drop_table('verification_artifacts')

    if 'attestations' in existing_tables:
        op.drop_table('attestations')

    if 'obligation_funding' in existing_tables:
        op.drop_index('ix_obligation_funding_parent_id', 'obligation_funding')
        op.drop_index('ix_obligation_funding_obligation_id', 'obligation_funding')
        op.drop_table('obligation_funding')

    if 'obligations' in existing_tables:
        op.drop_index('ix_obligations_due_date', 'obligations')
        op.drop_index('ix_obligations_created_by', 'obligations')
        op.drop_index('ix_obligations_status', 'obligations')
        op.drop_index('ix_obligations_case_id', 'obligations')
        op.drop_table('obligations')
