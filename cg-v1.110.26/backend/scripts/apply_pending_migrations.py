"""Apply pending migrations to Supabase, bypassing alembic_version.

Idempotent: safe to re-run. Uses `CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` throughout.

Wave 1 tables (`notifications`, `parent_child_messages`) are skipped —
they're already applied per the Wave 1 direct-SQL pass.

Usage:
    DATABASE_URL=postgresql://postgres:PW@db.<ref>.supabase.co:5432/postgres \
        python scripts/apply_pending_migrations.py
"""

from __future__ import annotations

import os
import sys
from typing import Iterable

import psycopg2


# ---------------------------------------------------------------------------
# DDL bundles — one per pending alembic migration.
# ---------------------------------------------------------------------------

CHORES_REWARDS_SQL = """
CREATE TABLE IF NOT EXISTS public.chores (
    id               VARCHAR(36) PRIMARY KEY,
    family_file_id   VARCHAR(36) NOT NULL REFERENCES public.family_files(id) ON DELETE CASCADE,
    child_id         VARCHAR(36) NOT NULL REFERENCES public.children(id)     ON DELETE CASCADE,
    assigned_by      VARCHAR(36) NOT NULL REFERENCES public.users(id),
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    reward_amount    NUMERIC(10,2),
    status           VARCHAR(20)  NOT NULL DEFAULT 'pending',
    due_at           TIMESTAMP,
    completed_at     TIMESTAMP,
    approved_at      TIMESTAMP,
    approved_by      VARCHAR(36) REFERENCES public.users(id),
    rejection_reason TEXT,
    reward_credited  BOOLEAN      NOT NULL DEFAULT false,
    created_at       TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_chores_family_file_id ON public.chores(family_file_id);
CREATE INDEX IF NOT EXISTS ix_chores_child_id       ON public.chores(child_id);
CREATE INDEX IF NOT EXISTS ix_chores_assigned_by    ON public.chores(assigned_by);
CREATE INDEX IF NOT EXISTS ix_chores_status         ON public.chores(status);
CREATE INDEX IF NOT EXISTS ix_chores_child_status   ON public.chores(child_id, status);

CREATE TABLE IF NOT EXISTS public.rewards (
    id               VARCHAR(36) PRIMARY KEY,
    family_file_id   VARCHAR(36) NOT NULL REFERENCES public.family_files(id) ON DELETE CASCADE,
    created_by       VARCHAR(36) NOT NULL REFERENCES public.users(id),
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    cost_amount      NUMERIC(10,2) NOT NULL,
    image_emoji      VARCHAR(10),
    stock_limit      INTEGER,
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    created_at       TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_rewards_family_file_id ON public.rewards(family_file_id);
CREATE INDEX IF NOT EXISTS ix_rewards_active         ON public.rewards(family_file_id, is_active);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id                   VARCHAR(36) PRIMARY KEY,
    reward_id            VARCHAR(36) NOT NULL REFERENCES public.rewards(id)      ON DELETE CASCADE,
    child_id             VARCHAR(36) NOT NULL REFERENCES public.children(id)     ON DELETE CASCADE,
    family_file_id       VARCHAR(36) NOT NULL REFERENCES public.family_files(id) ON DELETE CASCADE,
    cost_at_redemption   NUMERIC(10,2) NOT NULL,
    status               VARCHAR(20)  NOT NULL DEFAULT 'requested',
    wallet_transaction_id VARCHAR(36),
    fulfilled_by         VARCHAR(36) REFERENCES public.users(id),
    fulfilled_at         TIMESTAMP,
    notes                TEXT,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_reward_redemptions_reward_id ON public.reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS ix_reward_redemptions_child_id  ON public.reward_redemptions(child_id);
CREATE INDEX IF NOT EXISTS ix_reward_redemptions_status    ON public.reward_redemptions(status);
"""

WAVE4ALT_SQL = """
CREATE TABLE IF NOT EXISTS public.child_support_payment_logs (
    id                  VARCHAR(36) PRIMARY KEY,
    family_file_id      VARCHAR(36) NOT NULL REFERENCES public.family_files(id) ON DELETE CASCADE,
    obligation_id       VARCHAR(36) REFERENCES public.obligations(id),
    logged_by           VARCHAR(36) NOT NULL REFERENCES public.users(id),
    payer_id            VARCHAR(36) NOT NULL REFERENCES public.users(id),
    state_code          VARCHAR(2)  NOT NULL,
    county              VARCHAR(100),
    amount              NUMERIC(10,2) NOT NULL,
    currency            VARCHAR(3)  NOT NULL DEFAULT 'USD',
    payment_date        TIMESTAMP   NOT NULL,
    confirmation_number VARCHAR(200),
    receipt_url         VARCHAR(500),
    payment_channel     VARCHAR(20) NOT NULL DEFAULT 'sdu',
    notes               TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'logged',
    contested_by        VARCHAR(36) REFERENCES public.users(id),
    contested_reason    TEXT,
    contested_at        TIMESTAMP,
    created_at          TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_family_file_id      ON public.child_support_payment_logs(family_file_id);
CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_obligation_id       ON public.child_support_payment_logs(obligation_id);
CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_logged_by           ON public.child_support_payment_logs(logged_by);
CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_payment_date        ON public.child_support_payment_logs(payment_date);
CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_confirmation_number ON public.child_support_payment_logs(confirmation_number);
CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_status              ON public.child_support_payment_logs(status);
CREATE INDEX IF NOT EXISTS ix_cs_payment_logs_family_date         ON public.child_support_payment_logs(family_file_id, payment_date);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id               VARCHAR(36) PRIMARY KEY,
    stripe_event_id  VARCHAR(100) NOT NULL UNIQUE,
    event_type       VARCHAR(100) NOT NULL,
    received_at      TIMESTAMP    NOT NULL DEFAULT now(),
    processed_at     TIMESTAMP,
    payload          JSONB,
    error            TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_stripe_webhook_events_stripe_event_id ON public.stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS ix_stripe_webhook_events_event_type ON public.stripe_webhook_events(event_type);

CREATE TABLE IF NOT EXISTS public.recurring_parent_cards (
    id                    VARCHAR(36) PRIMARY KEY,
    family_file_id        VARCHAR(36) NOT NULL REFERENCES public.family_files(id) ON DELETE CASCADE,
    parent_user_id        VARCHAR(36) NOT NULL REFERENCES public.users(id),
    stripe_cardholder_id  VARCHAR(100),
    stripe_card_id        VARCHAR(100),
    monthly_limit_amount  NUMERIC(10,2) NOT NULL,
    current_cycle_spent   NUMERIC(10,2) NOT NULL DEFAULT 0,
    allowed_mccs          JSONB,
    cycle_start           TIMESTAMP     NOT NULL,
    cycle_end             TIMESTAMP     NOT NULL,
    is_active             BOOLEAN       NOT NULL DEFAULT true,
    created_at            TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at            TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_recurring_parent_cards_family_parent  ON public.recurring_parent_cards(family_file_id, parent_user_id);
CREATE INDEX IF NOT EXISTS ix_recurring_parent_cards_stripe_card_id ON public.recurring_parent_cards(stripe_card_id);
"""

CS_INTERVENTIONS_SQL = """
CREATE TABLE IF NOT EXISTS public.cs_interventions (
    id             VARCHAR(36) PRIMARY KEY,
    user_id        VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type           VARCHAR(50) NOT NULL,
    channel        VARCHAR(50),
    notes          TEXT,
    follow_up_date DATE,
    outcome        VARCHAR(50),
    status         VARCHAR(30) NOT NULL DEFAULT 'open',
    created_by     VARCHAR(36) NOT NULL REFERENCES public.users(id),
    created_at     TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cs_interventions_user_id       ON public.cs_interventions(user_id);
CREATE INDEX IF NOT EXISTS ix_cs_interventions_user_created  ON public.cs_interventions(user_id, created_at);
CREATE INDEX IF NOT EXISTS ix_cs_interventions_status        ON public.cs_interventions(status);
"""

CHORE_COMPLETION_PHOTO_SQL = """
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS completion_photo_url    VARCHAR(500);
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS completion_photo_bucket VARCHAR(100);
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS completion_photo_key    VARCHAR(500);
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS completion_note         VARCHAR(500);
"""

CIRCLE_PARENT_MESSAGES_SQL = """
CREATE TABLE IF NOT EXISTS public.circle_parent_messages (
    id                VARCHAR(36) PRIMARY KEY,
    family_file_id    VARCHAR(36) NOT NULL REFERENCES public.family_files(id)    ON DELETE CASCADE,
    circle_contact_id VARCHAR(36) NOT NULL REFERENCES public.circle_contacts(id) ON DELETE CASCADE,
    parent_user_id    VARCHAR(36) NOT NULL REFERENCES public.users(id)           ON DELETE CASCADE,
    sender_type       VARCHAR(20) NOT NULL,
    content           TEXT        NOT NULL,
    original_content  TEXT,
    aria_flagged      BOOLEAN     NOT NULL DEFAULT false,
    aria_reason       VARCHAR(500),
    read_at           TIMESTAMP,
    created_at        TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_circle_parent_messages_family_file_id    ON public.circle_parent_messages(family_file_id);
CREATE INDEX IF NOT EXISTS ix_circle_parent_messages_circle_contact_id ON public.circle_parent_messages(circle_contact_id);
CREATE INDEX IF NOT EXISTS ix_circle_parent_messages_parent_user_id    ON public.circle_parent_messages(parent_user_id);
CREATE INDEX IF NOT EXISTS ix_circle_parent_messages_created_at        ON public.circle_parent_messages(created_at);
CREATE INDEX IF NOT EXISTS ix_circle_parent_messages_contact_time      ON public.circle_parent_messages(circle_contact_id, created_at);
CREATE INDEX IF NOT EXISTS ix_circle_parent_messages_parent_time       ON public.circle_parent_messages(parent_user_id, created_at);
"""


# ---------------------------------------------------------------------------
# Realtime publication + RLS.
# Mirrors backend/scripts/enable_realtime_for_messages.sql.
# ---------------------------------------------------------------------------

REALTIME_PUBLICATION_SQL = """
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='parent_child_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_child_messages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='circle_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_messages';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='circle_parent_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='circle_parent_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_parent_messages';
  END IF;
END
$$;
"""

REALTIME_RLS_SQL = """
ALTER TABLE public.parent_child_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_messages       ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='circle_parent_messages'
  ) THEN
    EXECUTE 'ALTER TABLE public.circle_parent_messages ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

DROP POLICY IF EXISTS "parent can read own-family parent_child_messages" ON public.parent_child_messages;
CREATE POLICY "parent can read own-family parent_child_messages"
  ON public.parent_child_messages FOR SELECT TO authenticated
  USING (
    family_file_id IN (
      SELECT id::text FROM public.family_files
      WHERE parent_a_id = auth.uid()::text OR parent_b_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "parent can read own-family circle_messages" ON public.circle_messages;
CREATE POLICY "parent can read own-family circle_messages"
  ON public.circle_messages FOR SELECT TO authenticated
  USING (
    family_file_id IN (
      SELECT id::text FROM public.family_files
      WHERE parent_a_id = auth.uid()::text OR parent_b_id = auth.uid()::text
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='circle_parent_messages'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "parent can read own-family circle_parent_messages" ON public.circle_parent_messages';
    EXECUTE $p$
      CREATE POLICY "parent can read own-family circle_parent_messages"
        ON public.circle_parent_messages FOR SELECT TO authenticated
        USING (
          family_file_id IN (
            SELECT id::text FROM public.family_files
            WHERE parent_a_id = auth.uid()::text OR parent_b_id = auth.uid()::text
          )
        );
    $p$;
  END IF;
END
$$;
"""


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

STEPS: list[tuple[str, str]] = [
    ("add_chores_rewards_20260416",            CHORES_REWARDS_SQL),
    ("add_wave4alt_20260416",                  WAVE4ALT_SQL),
    ("add_cs_interventions_20260416",          CS_INTERVENTIONS_SQL),
    ("add_chore_completion_photo_20260417",    CHORE_COMPLETION_PHOTO_SQL),
    ("add_circle_parent_messages_20260417",    CIRCLE_PARENT_MESSAGES_SQL),
    ("realtime_publication",                   REALTIME_PUBLICATION_SQL),
    ("realtime_rls_policies",                  REALTIME_RLS_SQL),
]


def run(conn, label: str, sql: str) -> None:
    cur = conn.cursor()
    try:
        cur.execute(sql)
        conn.commit()
        print(f"  [ok]   {label}")
    except Exception as exc:
        conn.rollback()
        print(f"  [FAIL] {label}: {exc}")
        raise
    finally:
        cur.close()


def probe_tables(conn, names: Iterable[str]) -> dict[str, bool]:
    cur = conn.cursor()
    out = {}
    for n in names:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name=%s)",
            (n,),
        )
        out[n] = cur.fetchone()[0]
    cur.close()
    return out


def main() -> int:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL must be set.", file=sys.stderr)
        return 2
    print(f"Connecting to {dsn.split('@')[-1]}")
    conn = psycopg2.connect(dsn, connect_timeout=15)

    before = probe_tables(
        conn,
        [
            "chores",
            "rewards",
            "reward_redemptions",
            "child_support_payment_logs",
            "stripe_webhook_events",
            "recurring_parent_cards",
            "cs_interventions",
            "circle_parent_messages",
        ],
    )
    print("Before:")
    for k, v in before.items():
        print(f"  {k:40s} {'YES' if v else 'NO'}")

    print("\nApplying steps:")
    for label, sql in STEPS:
        run(conn, label, sql)

    after = probe_tables(
        conn,
        [
            "chores",
            "rewards",
            "reward_redemptions",
            "child_support_payment_logs",
            "stripe_webhook_events",
            "recurring_parent_cards",
            "cs_interventions",
            "circle_parent_messages",
        ],
    )
    print("\nAfter:")
    for k, v in after.items():
        print(f"  {k:40s} {'YES' if v else 'NO'}")

    # Confirm chores has new columns.
    cur = conn.cursor()
    cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name='chores' "
        "AND column_name IN ('completion_photo_url','completion_photo_bucket','completion_photo_key','completion_note')"
    )
    cols = sorted(r[0] for r in cur.fetchall())
    print("\nchores new columns present:", cols)
    cur.close()

    # Confirm realtime publication.
    cur = conn.cursor()
    cur.execute(
        "SELECT tablename FROM pg_publication_tables "
        "WHERE pubname='supabase_realtime' "
        "AND tablename IN ('parent_child_messages','circle_messages','circle_parent_messages') "
        "ORDER BY tablename"
    )
    pubs = [r[0] for r in cur.fetchall()]
    print("In supabase_realtime publication:", pubs)
    cur.close()

    conn.close()
    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
