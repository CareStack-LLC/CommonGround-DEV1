'use client';

import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { KidComsMessage } from '@/lib/api';

interface KidComsMessageRow {
  id: string;
  session_id: string;
  sender_id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  original_content: string | null;
  aria_analyzed: boolean;
  aria_flagged: boolean;
  aria_category: string | null;
  aria_reason: string | null;
  aria_score: number | null;
  is_delivered: boolean;
  is_hidden: boolean;
  sent_at: string;
}

interface UseRealtimeKidcomsOptions {
  sessionId: string | null;
  onNewMessage?: (message: KidComsMessage) => void;
}

/**
 * Hook for subscribing to real-time KidComs message updates via Supabase Realtime
 */
export function useRealtimeKidcoms({
  sessionId,
  onNewMessage,
}: UseRealtimeKidcomsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Convert row to KidComsMessage
  const rowToMessage = useCallback((row: KidComsMessageRow): KidComsMessage => {
    return {
      id: row.id,
      session_id: row.session_id,
      sender_id: row.sender_id,
      sender_type: row.sender_type,
      sender_name: row.sender_name,
      content: row.content,
      original_content: row.original_content ?? undefined,
      aria_analyzed: row.aria_analyzed,
      aria_flagged: row.aria_flagged,
      aria_category: row.aria_category ?? undefined,
      aria_reason: row.aria_reason ?? undefined,
      aria_score: row.aria_score ?? undefined,
      is_delivered: row.is_delivered,
      is_hidden: row.is_hidden,
      sent_at: row.sent_at,
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // Create channel for this KidComs session
    const channel = supabase.channel(`kidcoms:${sessionId}`);
    channelRef.current = channel;

    // Subscribe to message inserts
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'kidcoms_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          const message = rowToMessage(payload.new as KidComsMessageRow);
          onNewMessage?.(message);
        }
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log('KidComs realtime channel status:', status);
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId, onNewMessage, rowToMessage]);
}
