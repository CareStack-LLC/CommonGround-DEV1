'use client';

/**
 * Supabase Realtime "read together" hook for KidSpace books.
 *
 * Subscribes to a broadcast channel keyed on
 *   `book-read:{bookId}:{childId}`
 * so exactly one parent ↔ child pair can co-read a title. The payload
 * carries just `{page, by, at}` — the kid re-renders the PDF page
 * locally; no book content crosses the wire.
 *
 * The backend does NOT participate. Both clients publish their own
 * page changes and each receives the other's. A simple
 * "last-write-wins by timestamp" rule avoids infinite echo loops
 * (see consumer's `isSameAsMine` guard before calling onPageReceived).
 *
 * Auth model:
 *   Parent uses Supabase Auth → anon client with user session → can
 *     write & read broadcasts freely.
 *   Kid uses CommonGround's own JWT (not Supabase Auth) → anon client
 *     is fully anonymous, but broadcast channels are permissive by
 *     default, so writes + reads work without RLS. Content is never
 *     sensitive (just a page number).
 */

import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

interface BookReadEvent {
  page: number;
  by: string; // sender user/child id — used to suppress self-echo
  at: number; // ms epoch
}

interface UseRealtimeBookReadOptions {
  /** The book being read. Null disables the channel. */
  bookId: string | null;
  /** The child in the pair. Null disables the channel. */
  childId: string | null;
  /** Current user/child identifier for echo suppression. */
  senderId: string;
  /** Fires when the *other* side turns a page. */
  onPageReceived?: (page: number, senderId: string) => void;
  /** Optional: fires when the channel reports SUBSCRIBED / CHANNEL_ERROR. */
  onStatusChange?: (status: 'subscribing' | 'connected' | 'error') => void;
}

/**
 * Returns a `sendPageChange(page)` function + the underlying channel.
 */
export function useRealtimeBookRead({
  bookId,
  childId,
  senderId,
  onPageReceived,
  onStatusChange,
}: UseRealtimeBookReadOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastRemoteAtRef = useRef<number>(0);

  useEffect(() => {
    if (!bookId || !childId) return;

    onStatusChange?.('subscribing');

    const channel = supabase.channel(`book-read:${bookId}:${childId}`, {
      config: { broadcast: { self: false } }, // don't echo our own sends
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'page' }, ({ payload }) => {
      if (!payload || typeof payload !== 'object') return;
      const evt = payload as Partial<BookReadEvent>;
      if (typeof evt.page !== 'number' || typeof evt.by !== 'string') return;
      if (evt.by === senderId) return; // defensive — already filtered by `self:false`
      const at = typeof evt.at === 'number' ? evt.at : Date.now();
      // Drop out-of-order events (e.g. if parent bumps then kid bumps,
      // and parent's echo arrives later than the kid's newer page).
      if (at < lastRemoteAtRef.current) return;
      lastRemoteAtRef.current = at;
      onPageReceived?.(evt.page, evt.by);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatusChange?.('connected');
      else if (status === 'CHANNEL_ERROR') onStatusChange?.('error');
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // Intentional: onPageReceived / onStatusChange are refs in the consumer
    // so this effect reruns only on id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, childId, senderId]);

  const sendPageChange = useCallback(
    (page: number) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'page',
        payload: { page, by: senderId, at: Date.now() } satisfies BookReadEvent,
      });
    },
    [senderId],
  );

  return { sendPageChange, channel: channelRef.current };
}
