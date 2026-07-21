"""Add messages.sentiment_score + backfill from existing flags.

The Message model now maps `sentiment_score` — a communication-tone signal in
[0.0, 1.0] (higher = more positive), written at send time as
(1 - ARIA v2 toxicity). The professional ARIA metrics endpoint aggregates it
into per-sender averages and the case tone trend; without the column those
aggregations 500'd (and were temporarily stubbed to neutral).

Idempotent ADD COLUMN IF NOT EXISTS (additive, nullable — safe on the live
table), followed by a one-time backfill so historical cases have a tone signal:
- flagged messages: 1 - (max toxicity across their flags)
- everything else (never flagged): 1.0

Revision ID: msg_sentiment_score_20260721
Revises: aria_v2_mflags_heal_20260708
Create Date: 2026-07-21
"""
from alembic import op

revision = 'msg_sentiment_score_20260721'
down_revision = 'aria_v2_mflags_heal_20260708'
branch_labels = None
depends_on = None


def upgrade():
    # 1) Column (idempotent — a no-op if a prior deploy already added it).
    op.execute(
        'ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment_score DOUBLE PRECISION'
    )

    # 2) Backfill flagged messages from their worst flag: sentiment = 1 - max_tox.
    op.execute(
        """
        UPDATE messages m
        SET sentiment_score = GREATEST(0.0, LEAST(1.0, 1.0 - sub.max_tox))
        FROM (
            SELECT message_id, MAX(toxicity_score) AS max_tox
            FROM message_flags
            GROUP BY message_id
        ) sub
        WHERE m.id = sub.message_id
          AND m.sentiment_score IS NULL
        """
    )

    # 3) Everything else was never flagged -> treat as clean/positive tone.
    op.execute(
        'UPDATE messages SET sentiment_score = 1.0 WHERE sentiment_score IS NULL'
    )


def downgrade():
    op.execute('ALTER TABLE messages DROP COLUMN IF EXISTS sentiment_score')
