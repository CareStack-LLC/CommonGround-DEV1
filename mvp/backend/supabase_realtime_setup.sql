-- ============================================================
-- Supabase Realtime: Enable tables for Postgres Changes
-- ============================================================
-- Run this SQL in the Supabase SQL Editor to enable real-time
-- subscriptions on these tables. This replaces the custom
-- WebSocket broadcasts for database-backed events.
--
-- Tables already enabled: messages, activities, kidcoms_messages
-- ============================================================

-- Schedule Domain
ALTER PUBLICATION supabase_realtime ADD TABLE custody_exchanges;
ALTER PUBLICATION supabase_realtime ADD TABLE custody_exchange_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE schedule_events;

-- Finance Domain
ALTER PUBLICATION supabase_realtime ADD TABLE obligations;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;

-- Legal Domain
ALTER PUBLICATION supabase_realtime ADD TABLE agreements;
ALTER PUBLICATION supabase_realtime ADD TABLE agreement_sections;

-- Enable REPLICA IDENTITY FULL for tables that need DELETE event payloads
-- (Supabase Realtime only sends old row data on DELETE if REPLICA IDENTITY is FULL)
ALTER TABLE schedule_events REPLICA IDENTITY FULL;

-- ============================================================
-- Verify: Check which tables are in the publication
-- ============================================================
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
