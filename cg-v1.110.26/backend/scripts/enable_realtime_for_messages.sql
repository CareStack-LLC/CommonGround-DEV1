-- ============================================================
-- Supabase Realtime setup for message tables
-- ============================================================
-- Run this once against the production database (Supabase SQL editor).
-- Idempotent: safe to re-run. Only the ALTER PUBLICATION and policy
-- creation are required for realtime; the RLS enable + policy blocks
-- give clients SELECT permission so the Realtime server will deliver
-- the row payloads (rows the requester can't SELECT are never broadcast).
--
-- Tables covered:
--   parent_child_messages     (Wave 1 — persistent parent↔child inbox)
--   circle_messages           (Wave 1 — kid↔circle-contact chat)
--   circle_parent_messages    (Wave 5 follow-up — contact↔parent chat)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add tables to the realtime publication
-- ------------------------------------------------------------
-- `ADD TABLE IF NOT EXISTS` isn't supported, so we guard with a DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'parent_child_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_child_messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'circle_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_messages';
  END IF;

  -- circle_parent_messages only exists once the pending migration runs.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'circle_parent_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'circle_parent_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_parent_messages';
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 2. Enable RLS (required for Supabase Auth JWT to be evaluated)
-- ------------------------------------------------------------
ALTER TABLE public.parent_child_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_messages        ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'circle_parent_messages'
  ) THEN
    EXECUTE 'ALTER TABLE public.circle_parent_messages ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 3. SELECT policies
-- ------------------------------------------------------------
-- Notes on the JWT model:
--   CommonGround uses Supabase Auth for parents (auth.uid() works).
--   Children authenticate against the FastAPI backend with a child-session
--   JWT that does NOT hit Supabase Auth. The child-side realtime hook
--   therefore depends on an additional JWT claim ("child_id") being
--   accepted by Supabase (via `supabase.auth.setSession(...)` wrapping a
--   short-lived signed JWT), OR on the family_file_id check catching
--   rows via the parent auth path. For v1 we fall back to the
--   family_file_id path — kids see new messages the moment they refresh
--   the list, and the parent side is live.
--
-- Drop first so this block is idempotent.
DROP POLICY IF EXISTS "parent can read own-family parent_child_messages"
  ON public.parent_child_messages;

CREATE POLICY "parent can read own-family parent_child_messages"
  ON public.parent_child_messages
  FOR SELECT
  TO authenticated
  USING (
    family_file_id IN (
      SELECT id::text FROM public.family_files
      WHERE parent_a_id = auth.uid()::text OR parent_b_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "parent can read own-family circle_messages"
  ON public.circle_messages;

CREATE POLICY "parent can read own-family circle_messages"
  ON public.circle_messages
  FOR SELECT
  TO authenticated
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
    WHERE table_schema = 'public' AND table_name = 'circle_parent_messages'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "parent can read own-family circle_parent_messages"
        ON public.circle_parent_messages;
      CREATE POLICY "parent can read own-family circle_parent_messages"
        ON public.circle_parent_messages
        FOR SELECT
        TO authenticated
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

-- ------------------------------------------------------------
-- 4. INSERT / UPDATE policies stay server-only
-- ------------------------------------------------------------
-- The FastAPI backend uses the service-role key for writes, so NO
-- insert/update/delete policies are granted to `authenticated`.
-- This keeps ARIA analysis + sender-identity enforcement on the server.

-- ============================================================
-- Verification queries (run after the above):
--
--   SELECT tablename FROM pg_publication_tables
--    WHERE pubname = 'supabase_realtime'
--      AND tablename LIKE '%message%';
--
--   SELECT schemaname, tablename, policyname, roles, cmd
--     FROM pg_policies
--    WHERE tablename IN ('parent_child_messages','circle_messages','circle_parent_messages');
-- ============================================================
