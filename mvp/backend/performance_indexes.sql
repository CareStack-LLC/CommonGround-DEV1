-- ============================================================
-- Performance Indexes for CommonGround
-- ============================================================
-- Run this SQL in the Supabase SQL Editor to add missing indexes
-- that significantly speed up common dashboard and page queries.
-- ============================================================

-- Messages: unread count + recent unread (dashboard)
-- Covers: WHERE family_file_id=? AND recipient_id=? AND read_at IS NULL
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages (family_file_id, recipient_id)
  WHERE read_at IS NULL;

-- Messages: recent messages ordered by sent time
CREATE INDEX IF NOT EXISTS idx_messages_sent_order
  ON messages (family_file_id, sent_at DESC);

-- Activities: feed ordered by created time + unread filtering
CREATE INDEX IF NOT EXISTS idx_activities_family_created
  ON activities (family_file_id, created_at DESC);

-- Activities: unread by parent A
CREATE INDEX IF NOT EXISTS idx_activities_unread_parent_a
  ON activities (family_file_id)
  WHERE read_by_parent_a_at IS NULL;

-- Activities: unread by parent B
CREATE INDEX IF NOT EXISTS idx_activities_unread_parent_b
  ON activities (family_file_id)
  WHERE read_by_parent_b_at IS NULL;

-- Custody exchange instances: upcoming queries by time
CREATE INDEX IF NOT EXISTS idx_exchange_instances_scheduled
  ON custody_exchange_instances (exchange_id, scheduled_time);

-- Custody exchange instances: status filtering for upcoming
CREATE INDEX IF NOT EXISTS idx_exchange_instances_status_time
  ON custody_exchange_instances (status, scheduled_time)
  WHERE status IN ('scheduled', 'pending');

-- Obligations: pending expenses on dashboard
CREATE INDEX IF NOT EXISTS idx_obligations_family_status
  ON obligations (family_file_id, status);

-- Obligations: legacy case_id + status
CREATE INDEX IF NOT EXISTS idx_obligations_case_status
  ON obligations (case_id, status)
  WHERE case_id IS NOT NULL;

-- Schedule events: upcoming events for dashboard/calendar
CREATE INDEX IF NOT EXISTS idx_schedule_events_family_time
  ON schedule_events (family_file_id, start_time)
  WHERE status != 'cancelled';

-- Agreements: pending approval filtering
CREATE INDEX IF NOT EXISTS idx_agreements_family_status
  ON agreements (family_file_id, status);

-- Quick accords: pending/active filtering
CREATE INDEX IF NOT EXISTS idx_quick_accords_family_status
  ON quick_accords (family_file_id, status);

-- Custody exchanges: swap count queries
CREATE INDEX IF NOT EXISTS idx_exchanges_swap_count
  ON custody_exchanges (family_file_id, is_swap)
  WHERE is_swap = TRUE AND status != 'cancelled';

-- Custody exchanges: by case_id for listing
CREATE INDEX IF NOT EXISTS idx_exchanges_case_status
  ON custody_exchanges (case_id, status)
  WHERE case_id IS NOT NULL;

-- Children: status counts per case
CREATE INDEX IF NOT EXISTS idx_children_case_status
  ON children (case_id, status);

-- Children: family file lookup
CREATE INDEX IF NOT EXISTS idx_children_family_file
  ON children (family_file_id);

-- Court messages: unread by petitioner
CREATE INDEX IF NOT EXISTS idx_court_messages_unread_pet
  ON court_messages (case_id)
  WHERE petitioner_read_at IS NULL AND to_petitioner = TRUE;

-- Court messages: unread by respondent
CREATE INDEX IF NOT EXISTS idx_court_messages_unread_res
  ON court_messages (case_id)
  WHERE respondent_read_at IS NULL AND to_respondent = TRUE;

-- ============================================================
-- Verify: List all indexes on key tables
-- ============================================================
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE tablename IN ('messages', 'activities', 'custody_exchange_instances',
--   'obligations', 'schedule_events', 'agreements', 'quick_accords',
--   'custody_exchanges', 'children', 'court_messages')
-- ORDER BY tablename, indexname;
