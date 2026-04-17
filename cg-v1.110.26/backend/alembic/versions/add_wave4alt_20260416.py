"""Wave 4-Alt — SDU payment log + Stripe webhook idempotency + recurring parent card.

Revision ID: add_wave4alt_20260416
Revises: add_chores_rewards_20260416
Create Date: 2026-04-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_wave4alt_20260416"
down_revision: Union[str, Sequence[str], None] = "add_chores_rewards_20260416"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Child support payment log — CG records parent-reported SDU payments.
    op.create_table(
        "child_support_payment_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "family_file_id",
            sa.String(length=36),
            sa.ForeignKey("family_files.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("obligation_id", sa.String(length=36), sa.ForeignKey("obligations.id"), nullable=True),
        sa.Column("logged_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("payer_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("state_code", sa.String(length=2), nullable=False),
        sa.Column("county", sa.String(length=100), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("payment_date", sa.DateTime(), nullable=False),
        sa.Column("confirmation_number", sa.String(length=200), nullable=True),
        sa.Column("receipt_url", sa.String(length=500), nullable=True),
        sa.Column("payment_channel", sa.String(length=20), nullable=False, server_default="sdu"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="logged"),
        sa.Column("contested_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("contested_reason", sa.Text(), nullable=True),
        sa.Column("contested_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_cs_payment_logs_family_file_id", "child_support_payment_logs", ["family_file_id"])
    op.create_index("ix_cs_payment_logs_obligation_id", "child_support_payment_logs", ["obligation_id"])
    op.create_index("ix_cs_payment_logs_logged_by", "child_support_payment_logs", ["logged_by"])
    op.create_index("ix_cs_payment_logs_payment_date", "child_support_payment_logs", ["payment_date"])
    op.create_index("ix_cs_payment_logs_confirmation_number", "child_support_payment_logs", ["confirmation_number"])
    op.create_index("ix_cs_payment_logs_status", "child_support_payment_logs", ["status"])
    op.create_index(
        "ix_cs_payment_logs_family_date",
        "child_support_payment_logs",
        ["family_file_id", "payment_date"],
    )

    # Stripe webhook event idempotency — dedupe retries.
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("stripe_event_id", sa.String(length=100), nullable=False, unique=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
    )
    op.create_index("ix_stripe_webhook_events_stripe_event_id", "stripe_webhook_events", ["stripe_event_id"], unique=True)
    op.create_index("ix_stripe_webhook_events_event_type", "stripe_webhook_events", ["event_type"])

    # Recurring parent card — one per parent per family file.
    op.create_table(
        "recurring_parent_cards",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "family_file_id",
            sa.String(length=36),
            sa.ForeignKey("family_files.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("parent_user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stripe_cardholder_id", sa.String(length=100), nullable=True),
        sa.Column("stripe_card_id", sa.String(length=100), nullable=True),
        sa.Column("monthly_limit_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("current_cycle_spent", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("allowed_mccs", sa.JSON(), nullable=True),
        sa.Column("cycle_start", sa.DateTime(), nullable=False),
        sa.Column("cycle_end", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_recurring_parent_cards_family_parent", "recurring_parent_cards", ["family_file_id", "parent_user_id"])
    op.create_index("ix_recurring_parent_cards_stripe_card_id", "recurring_parent_cards", ["stripe_card_id"])


def downgrade() -> None:
    op.drop_index("ix_recurring_parent_cards_stripe_card_id", table_name="recurring_parent_cards")
    op.drop_index("ix_recurring_parent_cards_family_parent", table_name="recurring_parent_cards")
    op.drop_table("recurring_parent_cards")
    op.drop_index("ix_stripe_webhook_events_event_type", table_name="stripe_webhook_events")
    op.drop_index("ix_stripe_webhook_events_stripe_event_id", table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
    for name in (
        "ix_cs_payment_logs_family_date",
        "ix_cs_payment_logs_status",
        "ix_cs_payment_logs_confirmation_number",
        "ix_cs_payment_logs_payment_date",
        "ix_cs_payment_logs_logged_by",
        "ix_cs_payment_logs_obligation_id",
        "ix_cs_payment_logs_family_file_id",
    ):
        op.drop_index(name, table_name="child_support_payment_logs")
    op.drop_table("child_support_payment_logs")
