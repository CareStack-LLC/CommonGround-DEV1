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

/**
 * Get the Supabase client for direct access if needed
 */
export function getSupabaseClient() {
  return supabase;
}
