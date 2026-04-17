'use client';

/**
 * Supabase Realtime hook for the persistent parent↔child thread
 * (`parent_child_messages` table).
 *
 * Mirrors the shape of `use-realtime-circle-messages.ts`. Listens for INSERT
 * + UPDATE events filtered by `child_id` and maps the row shape to the
 * `ParentChildMessage` type already used by the UI.
 *
 * Supabase requirements (run once in the SQL editor, see
 * `backend/scripts/enable_realtime_for_messages.sql`):
 *   ALTER PUBLICATION supabase_realtime ADD TABLE parent_child_messages;
 *
 * RLS: the anon/user token needs SELECT on the row for the INSERT/UPDATE
 * event to be delivered. Make sure policies exist for parents (by
 * family_file_id) and for child-session tokens (via the custom JWT claim).
 */

import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { ParentChildMessage } from '@/lib/api';

// Column shape as emitted by Postgres changes (snake_case, nulls allowed).
interface ParentChildMessageRow {
  id: string;
  family_file_id: string;
  child_id: string;
  sender_id: string;
  sender_type: 'parent' | 'child';
  sender_name: string;
  content: string;
  original_content: string | null;
  aria_analyzed: boolean;
  aria_flagged: boolean;
  aria_hidden: boolean;
  aria_category: string | null;
  aria_reason: string | null;
  aria_score: number | null;
  read_by_recipient: boolean;
  read_at: string | null;
  created_at: string;
}

interface UseRealtimeParentChildMessagesOptions {
  /** The child whose thread we're watching. Pass null to disable. */
  childId: string | null;
  /** Fires when a new row arrives (postgres_changes). */
  onNewMessage?: (message: ParentChildMessage) => void;
  /** Fires on updates (e.g. read_by_recipient flip, ARIA re-scoring). */
  onMessageUpdated?: (message: ParentChildMessage) => void;
  /**
   * Fires on a RLS-free broadcast poke from the backend. The kid
   * client can't satisfy the SELECT policy on `parent_child_messages`
   * (it authenticates against our own JWT, not Supabase Auth), so the
   * backend publishes `new_message` broadcasts after each send and the
   * consumer re-fetches through the ARIA-gated API.
   */
  onBroadcastPoke?: (info: {
    id: string;
    sender_type: 'parent' | 'child';
    aria_hidden: boolean;
  }) => void;
}

/**
 * Subscribe to a child's parent↔child thread via Supabase Realtime.
 * Returns the underlying channel for debugging.
 */
export function useRealtimeParentChildMessages({
  childId,
  onNewMessage,
  onMessageUpdated,
  onBroadcastPoke,
}: UseRealtimeParentChildMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const rowToMessage = useCallback(
    (row: ParentChildMessageRow): ParentChildMessage => ({
      id: row.id,
      family_file_id: row.family_file_id,
      child_id: row.child_id,
      sender_id: row.sender_id,
      sender_type: row.sender_type,
      sender_name: row.sender_name,
      content: row.content,
      original_content: row.original_content ?? null,
      aria_analyzed: row.aria_analyzed,
      aria_flagged: row.aria_flagged,
      aria_hidden: row.aria_hidden,
      aria_category: row.aria_category ?? null,
      aria_reason: row.aria_reason ?? null,
      aria_score: row.aria_score ?? null,
      read_by_recipient: row.read_by_recipient,
      read_at: row.read_at ?? null,
      created_at: row.created_at,
    }),
    [],
  );

  useEffect(() => {
    if (!childId) return;

    const channel = supabase.channel(`pcm:${childId}`);
    channelRef.current = channel;

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'parent_child_messages',
        filter: `child_id=eq.${childId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onNewMessage?.(rowToMessage(payload.new as ParentChildMessageRow));
        }
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'parent_child_messages',
        filter: `child_id=eq.${childId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onMessageUpdated?.(rowToMessage(payload.new as ParentChildMessageRow));
        }
      },
    );

    // Broadcast listener — the backend publishes `new_message` after
    // each send to wake clients that can't see postgres_changes rows
    // (i.e. the kid client without Supabase Auth). Content stays on
    // the server; the payload is just enough metadata to decide
    // whether to re-fetch.
    channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (!payload || typeof payload !== 'object') return;
      const p = payload as Record<string, unknown>;
      if (typeof p.id !== 'string') return;
      onBroadcastPoke?.({
        id: p.id,
        sender_type: p.sender_type === 'child' ? 'child' : 'parent',
        aria_hidden: Boolean(p.aria_hidden),
      });
    });

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        // eslint-disable-next-line no-console
        console.error(`[ParentChildMessages] Realtime channel error for child ${childId}`);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [childId, onNewMessage, onMessageUpdated, onBroadcastPoke, rowToMessage]);

  return { channel: channelRef.current };
}
