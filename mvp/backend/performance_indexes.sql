-- ============================================================
-- Performance Indexes for CommonGround
-- ============================================================
-- Run this SQL in the Supabase SQL Editor to add missing indexes
-- that significantly speed up common dashboard and page queries.
-- ============================================================
-- Each index is wrapped in a DO block so failures (missing table/
-- column) are caught and logged without stopping the script.
-- ============================================================

-- Helper: safe index creation that skips missing tables/columns
CREATE OR REPLACE FUNCTION _safe_index(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RAISE NOTICE 'Skipped (missing table/column): %', sql;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- MESSAGES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages (family_file_id, recipient_id) WHERE read_at IS NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_messages_sent_order
  ON messages (family_file_id, sent_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_messages_thread_sent
  ON messages (thread_id, sent_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages (sender_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_messages_flagged
  ON messages (family_file_id) WHERE was_flagged = TRUE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_messages_case
  ON messages (case_id, sent_at DESC) WHERE case_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_messages_agreement
  ON messages (agreement_id) WHERE agreement_id IS NOT NULL');


-- ============================================================
-- MESSAGE THREADS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_message_threads_case
  ON message_threads (case_id) WHERE case_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_message_threads_agreement
  ON message_threads (agreement_id) WHERE agreement_id IS NOT NULL');


-- ============================================================
-- ACTIVITIES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_activities_family_created
  ON activities (family_file_id, created_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_activities_unread_parent_a
  ON activities (family_file_id) WHERE read_by_parent_a_at IS NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_activities_unread_parent_b
  ON activities (family_file_id) WHERE read_by_parent_b_at IS NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_activities_type
  ON activities (family_file_id, activity_type)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_activities_actor
  ON activities (actor_id, created_at DESC)');


-- ============================================================
-- CUSTODY EXCHANGES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_swap_count
  ON custody_exchanges (family_file_id, is_swap)
  WHERE is_swap = TRUE AND status != ''cancelled''');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_case_status
  ON custody_exchanges (case_id, status) WHERE case_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_created_by
  ON custody_exchanges (created_by, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_from_parent
  ON custody_exchanges (from_parent_id, scheduled_time)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_to_parent
  ON custody_exchanges (to_parent_id, scheduled_time)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_family_status
  ON custody_exchanges (family_file_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_scheduled_time
  ON custody_exchanges (family_file_id, scheduled_time)
  WHERE status NOT IN (''cancelled'', ''completed'')');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchanges_agreement
  ON custody_exchanges (agreement_id) WHERE agreement_id IS NOT NULL');


-- ============================================================
-- CUSTODY EXCHANGE INSTANCES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchange_instances_scheduled
  ON custody_exchange_instances (exchange_id, scheduled_time)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchange_instances_status_time
  ON custody_exchange_instances (status, scheduled_time)
  WHERE status IN (''scheduled'', ''pending'')');


-- ============================================================
-- OBLIGATIONS (expenses)
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_obligations_family_status
  ON obligations (family_file_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_obligations_case_status
  ON obligations (case_id, status) WHERE case_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_obligations_due_date
  ON obligations (family_file_id, due_date)
  WHERE status NOT IN (''paid'', ''cancelled'')');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_obligations_created_by
  ON obligations (created_by)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_obligations_disputed
  ON obligations (family_file_id) WHERE disputed_by IS NOT NULL');


-- ============================================================
-- SCHEDULE EVENTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_schedule_events_family_time
  ON schedule_events (family_file_id, start_time)
  WHERE status != ''cancelled''');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_schedule_events_agreement
  ON schedule_events (agreement_id) WHERE agreement_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_schedule_events_custodial_parent
  ON schedule_events (custodial_parent_id, start_time)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_schedule_events_case
  ON schedule_events (case_id, start_time) WHERE case_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_schedule_events_end_time
  ON schedule_events (family_file_id, end_time)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_schedule_events_status
  ON schedule_events (family_file_id, status)');


-- ============================================================
-- AGREEMENTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreements_family_status
  ON agreements (family_file_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreements_case
  ON agreements (case_id, status) WHERE case_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreements_pet_pending
  ON agreements (family_file_id) WHERE petitioner_approved = FALSE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreements_res_pending
  ON agreements (family_file_id) WHERE respondent_approved = FALSE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreements_effective_date
  ON agreements (family_file_id, effective_date)');


-- ============================================================
-- AGREEMENT VERSIONS / SECTIONS / CONVERSATIONS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreement_versions_agreement
  ON agreement_versions (agreement_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreement_sections_agreement
  ON agreement_sections (agreement_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_agreement_conversations_agreement
  ON agreement_conversations (agreement_id, user_id)');


-- ============================================================
-- COMPLIANCE LOGS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_compliance_logs_family
  ON compliance_logs (family_file_id, log_type)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_compliance_logs_agreement
  ON compliance_logs (agreement_id)');


-- ============================================================
-- QUICK ACCORDS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_quick_accords_family_status
  ON quick_accords (family_file_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_quick_accords_initiated_by
  ON quick_accords (initiated_by)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_quick_accords_category
  ON quick_accords (family_file_id, purpose_category)');


-- ============================================================
-- CHILDREN
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_children_case_status
  ON children (case_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_children_family_file
  ON children (family_file_id)');


-- ============================================================
-- CUSTODY DAY RECORDS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_custody_day_records_family_date
  ON custody_day_records (family_file_id, record_date)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_custody_day_records_child_date
  ON custody_day_records (child_id, record_date)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_custody_day_records_parent
  ON custody_day_records (custodial_parent_id, record_date)');


-- ============================================================
-- COURT MESSAGES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_messages_unread_pet
  ON court_messages (case_id)
  WHERE petitioner_read_at IS NULL AND to_petitioner = TRUE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_messages_unread_res
  ON court_messages (case_id)
  WHERE respondent_read_at IS NULL AND to_respondent = TRUE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_messages_sent
  ON court_messages (case_id, sent_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_messages_sender
  ON court_messages (sent_by)');


-- ============================================================
-- COURT ACCESS GRANTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_access_grants_active
  ON court_access_grants (case_id, professional_id)
  WHERE status = ''active''');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_access_grants_expires
  ON court_access_grants (expires_at) WHERE status = ''active''');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_access_grants_prof
  ON court_access_grants (professional_id, status)');


-- ============================================================
-- COURT ACCESS LOGS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_access_logs_grant
  ON court_access_logs (grant_id, logged_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_access_logs_case
  ON court_access_logs (case_id, logged_at DESC)');


-- ============================================================
-- COURT EVENTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_events_case_date
  ON court_events (case_id, event_date)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_events_status
  ON court_events (case_id, status)');


-- ============================================================
-- INVESTIGATION REPORTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_investigation_reports_case
  ON investigation_reports (case_id, status)');


-- ============================================================
-- CASES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_cases_family_file
  ON cases (family_file_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_cases_status
  ON cases (status)');


-- ============================================================
-- CASE PARTICIPANTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_participants_active
  ON case_participants (case_id, user_id) WHERE is_active = TRUE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_participants_user
  ON case_participants (user_id) WHERE is_active = TRUE');


-- ============================================================
-- FAMILY FILES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_family_files_parent_a
  ON family_files (parent_a_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_family_files_parent_b
  ON family_files (parent_b_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_family_files_status
  ON family_files (status)');


-- ============================================================
-- COURT CUSTODY CASES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_custody_cases_family
  ON court_custody_cases (family_file_id, status)');


-- ============================================================
-- USERS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_users_active
  ON users (is_active) WHERE is_active = TRUE AND is_deleted = FALSE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_users_supabase_id
  ON users (supabase_id) WHERE supabase_id IS NOT NULL');


-- ============================================================
-- USER PROFILES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_user_profiles_user
  ON user_profiles (user_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription
  ON user_profiles (subscription_status)');


-- ============================================================
-- CASE INVITATIONS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_invitations_email
  ON case_invitations (email, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_invitations_family
  ON case_invitations (family_file_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_invitations_token
  ON case_invitations (token) WHERE status = ''pending''');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_invitations_invited_by
  ON case_invitations (invited_by)');


-- ============================================================
-- CASE EVENTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_events_family
  ON case_events (family_file_id, event_type)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_case_events_actor
  ON case_events (actor_id)');


-- ============================================================
-- RECORDINGS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_recordings_family
  ON recordings (family_file_id, started_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_recordings_status
  ON recordings (status)');


-- ============================================================
-- TRANSCRIPTIONS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_transcriptions_recording
  ON transcriptions (recording_id, status)');


-- ============================================================
-- TRANSCRIPTION CHUNKS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_transcription_chunks_transcript
  ON transcription_chunks (transcription_id, start_time)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_transcription_chunks_flagged
  ON transcription_chunks (transcription_id) WHERE is_flagged = TRUE');


-- ============================================================
-- RECORDING ACCESS / EXPORT LOGS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_recording_access_logs_recording
  ON recording_access_logs (recording_id, accessed_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_recording_access_logs_family
  ON recording_access_logs (family_file_id, accessed_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_recording_export_logs_recording
  ON recording_export_logs (recording_id)');


-- ============================================================
-- KIDCOMS SESSIONS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_sessions_family
  ON kidcoms_sessions (family_file_id, started_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_sessions_child
  ON kidcoms_sessions (child_id, started_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_sessions_status
  ON kidcoms_sessions (status)');


-- ============================================================
-- KIDCOMS MESSAGES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_messages_session
  ON kidcoms_messages (session_id, sent_at)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_messages_flagged
  ON kidcoms_messages (session_id) WHERE aria_flagged = TRUE');


-- ============================================================
-- KIDCOMS ROOMS & COMMUNICATION LOGS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_rooms_family
  ON kidcoms_rooms (family_file_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_comm_logs_family
  ON kidcoms_communication_logs (family_file_id, started_at DESC)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_kidcoms_comm_logs_child
  ON kidcoms_communication_logs (child_id, started_at DESC)');


-- ============================================================
-- CIRCLE PERMISSIONS & USERS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_circle_permissions_family
  ON circle_permissions (family_file_id, child_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_circle_permissions_contact
  ON circle_permissions (circle_contact_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_circle_users_email
  ON circle_users (email)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_circle_users_contact
  ON circle_users (circle_contact_id)');


-- ============================================================
-- TIME BLOCKS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_time_blocks_collection
  ON time_blocks (collection_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_time_blocks_recurring
  ON time_blocks (collection_id) WHERE is_recurring = TRUE');


-- ============================================================
-- INTAKE
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_intake_sessions_professional
  ON intake_sessions (professional_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_intake_sessions_token
  ON intake_sessions (access_token) WHERE status = ''active''');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_intake_sessions_email
  ON intake_sessions (client_email)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_intake_questions_professional
  ON intake_questions (professional_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_intake_extractions_session
  ON intake_extractions (session_id)');


-- ============================================================
-- PAYMENTS & EXPENSES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_expense_requests_case
  ON expense_requests (case_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_expense_requests_requested_by
  ON expense_requests (requested_by)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_expense_requests_due
  ON expense_requests (due_date)
  WHERE status NOT IN (''paid'', ''cancelled'')');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_payments_case
  ON payments (case_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_payment_ledger_family
  ON payment_ledger (family_file_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_payment_ledger_obligation
  ON payment_ledger (obligation_id)');


-- ============================================================
-- WALLETS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_wallets_owner
  ON wallets (owner_type, owner_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_wallets_family
  ON wallets (family_file_id) WHERE family_file_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet
  ON wallet_transactions (wallet_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_wallet_transactions_obligation
  ON wallet_transactions (obligation_id) WHERE obligation_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_wallet_fundings_obligation
  ON wallet_fundings (obligation_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_wallet_fundings_wallet
  ON wallet_fundings (wallet_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_child_wallet_contributions_family
  ON child_wallet_contributions (family_file_id, status)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_child_wallet_contributions_child
  ON child_wallet_contributions (child_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_payouts_obligation
  ON payouts (obligation_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_payouts_recipient
  ON payouts (recipient_user_id, status)');


-- ============================================================
-- SUBSCRIPTIONS & GRANTS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_subscription_plans_active
  ON subscription_plans (is_active) WHERE is_active = TRUE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_grant_codes_code
  ON grant_codes (code) WHERE is_active = TRUE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_clearfund_fees_user
  ON clearfund_fees (user_id, status)');


-- ============================================================
-- PROFESSIONAL PROFILES
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_professional_profiles_user
  ON professional_profiles (user_id)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_professional_profiles_active
  ON professional_profiles (is_active) WHERE is_active = TRUE');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_professionals_email
  ON court_professionals (email)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_court_professionals_active
  ON court_professionals (is_active)
  WHERE is_active = TRUE AND is_verified = TRUE');


-- ============================================================
-- AUDIT & EVENT LOGS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs (user_id, action)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_audit_logs_case
  ON audit_logs (case_id) WHERE case_id IS NOT NULL');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_event_logs_case_type
  ON event_logs (case_id, event_type)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_event_logs_sequence
  ON event_logs (case_id, sequence_number)');


-- ============================================================
-- EXCHANGE CHECK-INS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchange_check_ins_event
  ON exchange_check_ins (event_id, scheduled_time)');

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_exchange_check_ins_user
  ON exchange_check_ins (user_id)');


-- ============================================================
-- MESSAGE FLAGS
-- ============================================================

SELECT _safe_index('CREATE INDEX IF NOT EXISTS idx_message_flags_message
  ON message_flags (message_id)');


-- ============================================================
-- Cleanup helper function
-- ============================================================
DROP FUNCTION IF EXISTS _safe_index(text);


-- ============================================================
-- Verify: List all custom indexes
-- ============================================================
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
