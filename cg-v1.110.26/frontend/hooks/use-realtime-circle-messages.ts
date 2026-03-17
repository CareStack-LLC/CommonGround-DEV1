'use client';

import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { CircleMessageData } from '@/lib/api';

interface CircleMessageRow {
  id: string;
  family_file_id: string;
  child_id: string;
  sender_id: string;
  sender_type: string;
  sender_name: string;
  recipient_id: string;
  recipient_type: string;
  content: string;
  original_content: string | null;
  aria_analyzed: boolean;
  aria_flagged: boolean;
  aria_category: string | null;
  aria_reason: string | null;
  aria_score: number | null;
  is_delivered: boolean;
  is_read: boolean;
  is_hidden: boolean;
  sent_at: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseRealtimeCircleMessagesOptions {
  /** The child involved in the conversation */
  childId: string | null;
  /** The other participant's ID (contact or parent) */
  participantId?: string | null;
  /** Called when a new message arrives */
  onNewMessage?: (message: CircleMessageData) => void;
  /** Called when a message is updated (e.g., marked read) */
  onMessageUpdated?: (message: CircleMessageData) => void;
}

/**
 * Hook for subscribing to real-time Circle Message updates via Supabase Realtime.
 *
 * Listens for INSERT/UPDATE events on the circle_messages table,
 * filtered by child_id. Optionally filters by participant ID.
 */
export function useRealtimeCircleMessages({
  childId,
  participantId,
  onNewMessage,
  onMessageUpdated,
}: UseRealtimeCircleMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const rowToMessage = useCallback((row: CircleMessageRow): CircleMessageData => {
    return {
      id: row.id,
      family_file_id: row.family_file_id,
      child_id: row.child_id,
      sender_id: row.sender_id,
      sender_type: row.sender_type,
      sender_name: row.sender_name,
      recipient_id: row.recipient_id,
      recipient_type: row.recipient_type,
      content: row.content,
      original_content: row.original_content ?? undefined,
      aria_analyzed: row.aria_analyzed,
      aria_flagged: row.aria_flagged,
      aria_category: row.aria_category ?? undefined,
      aria_reason: row.aria_reason ?? undefined,
      aria_score: row.aria_score ?? undefined,
      is_delivered: row.is_delivered,
      is_read: row.is_read,
      is_hidden: row.is_hidden,
      sent_at: row.sent_at,
      read_at: row.read_at ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }, []);

  useEffect(() => {
    if (!childId) return;

    const channelName = participantId
      ? `circle-msgs:${childId}:${participantId}`
      : `circle-msgs:${childId}`;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Subscribe to new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_messages',
        filter: `child_id=eq.${childId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          const message = rowToMessage(payload.new as CircleMessageRow);

          // If filtering by participant, check sender/recipient match
          if (participantId) {
            if (message.sender_id !== participantId && message.recipient_id !== participantId) {
              return; // Not part of this conversation
            }
          }

          onNewMessage?.(message);
        }
      }
    );

    // Subscribe to message updates (read receipts, etc.)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'circle_messages',
        filter: `child_id=eq.${childId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          const message = rowToMessage(payload.new as CircleMessageRow);

          if (participantId) {
            if (message.sender_id !== participantId && message.recipient_id !== participantId) {
              return;
            }
          }

          onMessageUpdated?.(message);
        }
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[CircleMessages] Realtime subscribed for child ${childId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[CircleMessages] Realtime channel error for child ${childId}`);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [childId, participantId, onNewMessage, onMessageUpdated, rowToMessage]);

  return {
    channel: channelRef.current,
  };
}
