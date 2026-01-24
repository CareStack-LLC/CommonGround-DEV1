'use client';

import { useEffect, useCallback } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { MessageRow } from '@/lib/supabase-realtime';
import { Message } from '@/lib/api';

interface UseRealtimeMessagesOptions {
  familyFileId: string | null;
  agreementId?: string | null;
  onNewMessage?: (message: Message) => void;
  onMessageRead?: (messageId: string, readAt: string) => void;
  onMessageAcknowledged?: (messageId: string, acknowledgedAt: string) => void;
}

/**
 * Hook for subscribing to real-time message updates via Supabase Realtime
 */
export function useRealtimeMessages({
  familyFileId,
  agreementId,
  onNewMessage,
  onMessageRead,
  onMessageAcknowledged,
}: UseRealtimeMessagesOptions) {
  const { subscribeToFamilyFile, unsubscribeFromFamilyFile, onMessageInsert, onMessageUpdate } =
    useRealtime();

  // Convert MessageRow to Message
  const rowToMessage = useCallback((row: MessageRow): Message => {
    return {
      id: row.id,
      family_file_id: row.family_file_id,
      agreement_id: row.agreement_id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      content: row.content,
      message_type: row.message_type,
      sent_at: row.sent_at,
      read_at: row.read_at,
      acknowledged_at: row.acknowledged_at,
      was_flagged: row.was_flagged,
      original_content: row.original_content ?? undefined,
    };
  }, []);

  // Subscribe to family file on mount
  useEffect(() => {
    if (!familyFileId) return;

    subscribeToFamilyFile(familyFileId);

    return () => {
      unsubscribeFromFamilyFile(familyFileId);
    };
  }, [familyFileId, subscribeToFamilyFile, unsubscribeFromFamilyFile]);

  // Handle new messages
  useEffect(() => {
    if (!familyFileId || !onNewMessage) return;

    const unsubscribe = onMessageInsert((row: MessageRow) => {
      // Filter by agreement if specified
      if (agreementId && row.agreement_id !== agreementId) return;

      const message = rowToMessage(row);
      onNewMessage(message);
    });

    return unsubscribe;
  }, [familyFileId, agreementId, onMessageInsert, onNewMessage, rowToMessage]);

  // Handle message updates (read receipts, acknowledgments)
  useEffect(() => {
    if (!familyFileId) return;
    if (!onMessageRead && !onMessageAcknowledged) return;

    const unsubscribe = onMessageUpdate((row: MessageRow) => {
      // Filter by agreement if specified
      if (agreementId && row.agreement_id !== agreementId) return;

      if (row.read_at && onMessageRead) {
        onMessageRead(row.id, row.read_at);
      }
      if (row.acknowledged_at && onMessageAcknowledged) {
        onMessageAcknowledged(row.id, row.acknowledged_at);
      }
    });

    return unsubscribe;
  }, [familyFileId, agreementId, onMessageUpdate, onMessageRead, onMessageAcknowledged]);
}
