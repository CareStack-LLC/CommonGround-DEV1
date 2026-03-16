/**
 * Supabase Realtime Client Wrapper
 *
 * Provides type-safe subscriptions for:
 * - Database changes (Postgres Changes)
 * - Presence tracking
 * - Broadcast events (typing indicators)
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Types for database row changes
export interface MessageRow {
  id: string;
  family_file_id: string;
  agreement_id: string | null;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  sent_at: string;
  read_at: string | null;
  acknowledged_at: string | null;
  was_flagged: boolean;
  original_content: string | null;
}

export interface ActivityRow {
  id: string;
  family_file_id: string;
  activity_type: string;
  category: string;
  actor_id: string | null;
  actor_name: string;
  title: string;
  description: string | null;
  icon: string;
  severity: string;
  created_at: string;
  subject_type: string;
  subject_id: string | null;
  read_by_parent_a_at: string | null;
  read_by_parent_b_at: string | null;
}

// ============================================================
// Schedule Domain Row Types
// ============================================================

export interface CustodyExchangeRow {
  id: string;
  family_file_id: string | null;
  case_id: string | null;
  agreement_id: string | null;
  created_by: string;
  exchange_type: string;
  title: string | null;
  from_parent_id: string | null;
  to_parent_id: string | null;
  location: string | null;
  scheduled_time: string;
  duration_minutes: number;
  is_recurring: boolean;
  status: string;
  silent_handoff_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExchangeInstanceRow {
  id: string;
  exchange_id: string;
  scheduled_time: string;
  status: string;
  from_parent_checked_in: boolean;
  from_parent_check_in_time: string | null;
  to_parent_checked_in: boolean;
  to_parent_check_in_time: string | null;
  completed_at: string | null;
  handoff_outcome: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEventRow {
  id: string;
  family_file_id: string | null;
  case_id: string | null;
  created_by: string | null;
  event_type: string;
  event_category: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  visibility: string;
  status: string;
  is_exchange: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Finance Domain Row Types
// ============================================================

export interface ObligationRow {
  id: string;
  family_file_id: string | null;
  case_id: string | null;
  agreement_id: string | null;
  purpose_category: string;
  title: string;
  total_amount: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionRow {
  id: string;
  wallet_id: string;
  transaction_type: string;
  amount: string;
  currency: string;
  description: string;
  status: string;
  obligation_id: string | null;
  balance_after: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Legal Domain Row Types
// ============================================================

export interface AgreementRow {
  id: string;
  family_file_id: string | null;
  case_id: string | null;
  title: string;
  agreement_type: string;
  status: string;
  version: number;
  petitioner_approved: boolean;
  respondent_approved: boolean;
  petitioner_approved_at: string | null;
  respondent_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementSectionRow {
  id: string;
  agreement_id: string;
  section_number: string;
  section_title: string;
  is_completed: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Presence types
export interface PresenceState {
  user_id: string;
  user_name: string;
  online_at: string;
  status: 'online' | 'away' | 'busy';
}

// Typing indicator payload
export interface TypingPayload {
  user_id: string;
  user_name: string;
  is_typing: boolean;
  family_file_id: string;
  agreement_id?: string;
}

// Connection state
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Create a channel for a family file with all features
 */
export function createFamilyFileChannel(
  familyFileId: string,
  userId: string,
  userName: string
): RealtimeChannel {
  return supabase.channel(`family:${familyFileId}`, {
    config: {
      presence: {
        key: userId,
      },
    },
  });
}

/**
 * Subscribe to message changes for a family file
 */
export function subscribeToMessages(
  channel: RealtimeChannel,
  familyFileId: string,
  onInsert: (message: MessageRow) => void,
  onUpdate: (message: MessageRow) => void
): RealtimeChannel {
  return channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<MessageRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onInsert(payload.new as MessageRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<MessageRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onUpdate(payload.new as MessageRow);
        }
      }
    );
}

/**
 * Subscribe to activity changes for a family file
 */
export function subscribeToActivities(
  channel: RealtimeChannel,
  familyFileId: string,
  onInsert: (activity: ActivityRow) => void
): RealtimeChannel {
  return channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'activities',
      filter: `family_file_id=eq.${familyFileId}`,
    },
    (payload: RealtimePostgresChangesPayload<ActivityRow>) => {
      if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
        onInsert(payload.new as ActivityRow);
      }
    }
  );
}

/**
 * Set up presence tracking
 */
export function setupPresence(
  channel: RealtimeChannel,
  onSync: (state: Record<string, PresenceState[]>) => void,
  onJoin: (key: string, currentPresences: PresenceState[], newPresences: PresenceState[]) => void,
  onLeave: (key: string, currentPresences: PresenceState[], leftPresences: PresenceState[]) => void
): RealtimeChannel {
  return channel
    .on('presence', { event: 'sync' }, () => {
      onSync(channel.presenceState() as Record<string, PresenceState[]>);
    })
    .on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
      onJoin(
        key,
        currentPresences as unknown as PresenceState[],
        newPresences as unknown as PresenceState[]
      );
    })
    .on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
      onLeave(
        key,
        currentPresences as unknown as PresenceState[],
        leftPresences as unknown as PresenceState[]
      );
    });
}

/**
 * Set up typing indicator broadcast
 */
export function setupTypingBroadcast(
  channel: RealtimeChannel,
  onTyping: (payload: TypingPayload) => void
): RealtimeChannel {
  return channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
    onTyping(payload as TypingPayload);
  });
}

/**
 * Send typing indicator
 */
export function sendTypingIndicator(
  channel: RealtimeChannel,
  payload: TypingPayload
): void {
  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload,
  });
}

/**
 * Track user presence
 */
export async function trackPresence(
  channel: RealtimeChannel,
  state: PresenceState
): Promise<void> {
  await channel.track(state);
}

/**
 * Untrack user presence (go offline)
 */
export async function untrackPresence(channel: RealtimeChannel): Promise<void> {
  await channel.untrack();
}

// ============================================================
// Domain-Specific Channel Creators
// ============================================================

/**
 * Create a schedule domain channel for a family file
 * Handles: custody_exchanges, custody_exchange_instances, schedule_events
 */
export function createScheduleChannel(familyFileId: string): RealtimeChannel {
  return supabase.channel(`family:${familyFileId}:schedule`);
}

/**
 * Create a finance domain channel for a family file
 * Handles: obligations, wallet_transactions
 */
export function createFinanceChannel(familyFileId: string): RealtimeChannel {
  return supabase.channel(`family:${familyFileId}:finance`);
}

/**
 * Create a legal domain channel for a family file
 * Handles: agreements, agreement_sections
 */
export function createLegalChannel(familyFileId: string): RealtimeChannel {
  return supabase.channel(`family:${familyFileId}:legal`);
}

// ============================================================
// Schedule Domain Subscriptions
// ============================================================

/**
 * Subscribe to custody exchange changes for a family file
 */
export function subscribeToExchanges(
  channel: RealtimeChannel,
  familyFileId: string,
  onInsert: (exchange: CustodyExchangeRow) => void,
  onUpdate: (exchange: CustodyExchangeRow) => void
): RealtimeChannel {
  return channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'custody_exchanges',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<CustodyExchangeRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onInsert(payload.new as CustodyExchangeRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'custody_exchanges',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<CustodyExchangeRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onUpdate(payload.new as CustodyExchangeRow);
        }
      }
    );
}

/**
 * Subscribe to exchange instance updates (check-ins, completions)
 * Note: Instances don't have family_file_id, so we listen to all and filter client-side
 */
export function subscribeToExchangeInstances(
  channel: RealtimeChannel,
  onUpdate: (instance: ExchangeInstanceRow) => void
): RealtimeChannel {
  return channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'custody_exchange_instances',
    },
    (payload: RealtimePostgresChangesPayload<ExchangeInstanceRow>) => {
      if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
        onUpdate(payload.new as ExchangeInstanceRow);
      }
    }
  );
}

/**
 * Subscribe to schedule event changes for a family file
 */
export function subscribeToScheduleEvents(
  channel: RealtimeChannel,
  familyFileId: string,
  onInsert: (event: ScheduleEventRow) => void,
  onUpdate: (event: ScheduleEventRow) => void,
  onDelete: (old: { id: string }) => void
): RealtimeChannel {
  return channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'schedule_events',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<ScheduleEventRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onInsert(payload.new as ScheduleEventRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'schedule_events',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<ScheduleEventRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onUpdate(payload.new as ScheduleEventRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'schedule_events',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<ScheduleEventRow>) => {
        if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
          onDelete({ id: (payload.old as ScheduleEventRow).id });
        }
      }
    );
}

// ============================================================
// Finance Domain Subscriptions
// ============================================================

/**
 * Subscribe to obligation changes for a family file
 */
export function subscribeToObligations(
  channel: RealtimeChannel,
  familyFileId: string,
  onInsert: (obligation: ObligationRow) => void,
  onUpdate: (obligation: ObligationRow) => void
): RealtimeChannel {
  return channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'obligations',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<ObligationRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onInsert(payload.new as ObligationRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'obligations',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<ObligationRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onUpdate(payload.new as ObligationRow);
        }
      }
    );
}

/**
 * Subscribe to wallet transaction changes
 * Note: wallet_transactions doesn't have family_file_id, filter by wallet_id
 */
export function subscribeToWalletTransactions(
  channel: RealtimeChannel,
  walletId: string,
  onInsert: (transaction: WalletTransactionRow) => void,
  onUpdate: (transaction: WalletTransactionRow) => void
): RealtimeChannel {
  return channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'wallet_transactions',
        filter: `wallet_id=eq.${walletId}`,
      },
      (payload: RealtimePostgresChangesPayload<WalletTransactionRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onInsert(payload.new as WalletTransactionRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallet_transactions',
        filter: `wallet_id=eq.${walletId}`,
      },
      (payload: RealtimePostgresChangesPayload<WalletTransactionRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onUpdate(payload.new as WalletTransactionRow);
        }
      }
    );
}

// ============================================================
// Legal Domain Subscriptions
// ============================================================

/**
 * Subscribe to agreement changes for a family file
 */
export function subscribeToAgreements(
  channel: RealtimeChannel,
  familyFileId: string,
  onInsert: (agreement: AgreementRow) => void,
  onUpdate: (agreement: AgreementRow) => void
): RealtimeChannel {
  return channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'agreements',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<AgreementRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onInsert(payload.new as AgreementRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'agreements',
        filter: `family_file_id=eq.${familyFileId}`,
      },
      (payload: RealtimePostgresChangesPayload<AgreementRow>) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onUpdate(payload.new as AgreementRow);
        }
      }
    );
}

/**
 * Subscribe to agreement section updates
 * Note: sections link through agreement_id, filter by agreement_id
 */
export function subscribeToAgreementSections(
  channel: RealtimeChannel,
  agreementId: string,
  onUpdate: (section: AgreementSectionRow) => void
): RealtimeChannel {
  return channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'agreement_sections',
      filter: `agreement_id=eq.${agreementId}`,
    },
    (payload: RealtimePostgresChangesPayload<AgreementSectionRow>) => {
      if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
        onUpdate(payload.new as AgreementSectionRow);
      }
    }
  );
}

/**
 * Get the Supabase client for direct access if needed
 */
export function getSupabaseClient() {
  return supabase;
}
