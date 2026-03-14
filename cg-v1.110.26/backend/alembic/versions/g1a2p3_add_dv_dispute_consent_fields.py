"""Add DV case flag, ARIA sensitivity, expense dispute, and GAL consent fields.

Gap assessment identified missing data model fields needed by test personas:
1. FamilyFile.is_dv_case — DV mode flag for tightened ARIA thresholds
2. FamilyFile.aria_sensitivity_level — granular ARIA sensitivity control
3. Obligation.dispute_status — expense dispute tracking
4. Obligation.dispute_reason — reason for dispute
5. Obligation.disputed_at — timestamp of dispute
6. Obligation.disputed_by — user who disputed
7. CaseAssignment.consent_both_parents — GAL dual-parent consent requirement

Revision ID: g1a2p3_gap
Revises: (latest)
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "g1a2p3_gap"
down_revision = None  # Will be set by alembic chain
branch_labels = None
depends_on = None


def upgrade() -> None:
    # FamilyFile: DV case flag and ARIA sensitivity
    op.add_column("family_files", sa.Column("is_dv_case", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("family_files", sa.Column(
        "aria_sensitivity_level", sa.String(20), nullable=False, server_default="standard"
    ))  # standard | elevated | maximum

    # Obligation: dispute tracking
    op.add_column("obligations", sa.Column(
        "dispute_status", sa.String(20), nullable=False, server_default="none"
    ))  # none | disputed | resolved
    op.add_column("obligations", sa.Column("dispute_reason", sa.Text(), nullable=True))
    op.add_column("obligations", sa.Column("disputed_at", sa.DateTime(), nullable=True))
    op.add_column("obligations", sa.Column("disputed_by", sa.String(36), nullable=True))

    # CaseAssignment: GAL consent requirement
    op.add_column("case_assignments", sa.Column(
        "consent_both_parents", sa.Boolean(), nullable=False, server_default="false"
    ))
    op.add_column("case_assignments", sa.Column("consent_parent_a_at", sa.DateTime(), nullable=True))
    op.add_column("case_assignments", sa.Column("consent_parent_b_at", sa.DateTime(), nullable=True))

    # CaseInvitation: delayed send support
    op.add_column("case_invitations", sa.Column("scheduled_send_at", sa.DateTime(), nullable=True))
    op.add_column("case_invitations", sa.Column(
        "send_delayed", sa.Boolean(), nullable=False, server_default="false"
    ))


def downgrade() -> None:
    op.drop_column("case_invitations", "send_delayed")
    op.drop_column("case_invitations", "scheduled_send_at")
    op.drop_column("case_assignments", "consent_parent_b_at")
    op.drop_column("case_assignments", "consent_parent_a_at")
    op.drop_column("case_assignments", "consent_both_parents")
    op.drop_column("obligations", "disputed_by")
    op.drop_column("obligations", "disputed_at")
    op.drop_column("obligations", "dispute_reason")
    op.drop_column("obligations", "dispute_status")
    op.drop_column("family_files", "aria_sensitivity_level")
    op.drop_column("family_files", "is_dv_case")
