/**
 * Supabase Client for React Native
 *
 * Provides real-time subscriptions for messages and presence
 */
import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

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
  has_attachments: boolean;
  attachment_urls: string[] | null;
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
}

/**
 * Create a channel for a family file with all features
 */
export function createFamilyFileChannel(
  familyFileId: string,
  userId: string
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
 * Set up presence tracking
 */
export function setupPresence(
  channel: RealtimeChannel,
  onSync: (state: Record<string, PresenceState[]>) => void
): RealtimeChannel {
  return channel.on('presence', { event: 'sync' }, () => {
    onSync(channel.presenceState() as Record<string, PresenceState[]>);
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
 * Fetch messages for a family file directly from Supabase
 * This bypasses the REST API and queries the database directly
 */
export async function fetchMessagesForFamilyFile(
  familyFileId: string,
  limit: number = 100
): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('family_file_id', familyFileId)
    .order('sent_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Supabase] Error fetching messages:', error);
    return [];
  }

  return (data || []) as MessageRow[];
}

/**
 * Fetch user info by ID
 */
export async function fetchUserById(userId: string): Promise<{
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
} | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[Supabase] Error fetching user:', error);
    return null;
  }

  return data;
}
