"""Recording access request workflow.

Creates recording_access_requests: a professional's request to view ONE
specific KidSpace/Circle call recording, gated by parent approval and a
time-limited grant. Idempotent.

Revision ID: pro_recording_requests_20260618
Revises: user_promsg_consent_20260618
Create Date: 2026-06-18
"""

from alembic import op


revision = "pro_recording_requests_20260618"
down_revision = "user_promsg_consent_20260618"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS recording_access_requests (
            id VARCHAR(36) PRIMARY KEY,
            family_file_id VARCHAR(36) NOT NULL REFERENCES family_files(id),
            session_id VARCHAR(36) NOT NULL REFERENCES circle_call_sessions(id),
            professional_id VARCHAR(36) NOT NULL REFERENCES professional_profiles(id),
            requested_by_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
            reason TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            parent_a_approved BOOLEAN NOT NULL DEFAULT FALSE,
            parent_b_approved BOOLEAN NOT NULL DEFAULT FALSE,
            parent_a_approved_at TIMESTAMP,
            parent_b_approved_at TIMESTAMP,
            approved_at TIMESTAMP,
            declined_at TIMESTAMP,
            decline_reason TEXT,
            expires_at TIMESTAMP,
            access_expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_recording_access_requests_family "
        "ON recording_access_requests (family_file_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_recording_access_requests_professional "
        "ON recording_access_requests (professional_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_recording_access_requests_status "
        "ON recording_access_requests (status)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS recording_access_requests")
