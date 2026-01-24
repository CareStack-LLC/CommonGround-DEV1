'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useRealtime } from '@/contexts/realtime-context';

interface TypingUser {
  userId: string;
  userName: string;
}

interface UseRealtimeTypingOptions {
  familyFileId: string | null;
  agreementId?: string | null;
  debounceMs?: number;
}

interface UseRealtimeTypingReturn {
  handleTyping: () => void;
  stopTyping: () => void;
  typingUsers: TypingUser[];
  isPartnerTyping: boolean;
}

/**
 * Hook for managing typing indicators via Supabase Realtime broadcast
 */
export function useRealtimeTyping({
  familyFileId,
  agreementId,
  debounceMs = 500,
}: UseRealtimeTypingOptions): UseRealtimeTypingReturn {
  const { sendTyping, typingUsers, subscribeToFamilyFile, unsubscribeFromFamilyFile } =
    useRealtime();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to family file on mount
  useEffect(() => {
    if (!familyFileId) return;

    subscribeToFamilyFile(familyFileId);

    return () => {
      unsubscribeFromFamilyFile(familyFileId);
    };
  }, [familyFileId, subscribeToFamilyFile, unsubscribeFromFamilyFile]);

  // Send typing indicator with debounce
  const handleTyping = useCallback(() => {
    if (!familyFileId) return;

    // Send typing start
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(familyFileId, true, agreementId || undefined);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to send typing stop
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (familyFileId) {
        sendTyping(familyFileId, false, agreementId || undefined);
      }
    }, debounceMs);
  }, [familyFileId, agreementId, sendTyping, debounceMs]);

  // Stop typing indicator immediately
  const stopTyping = useCallback(() => {
    if (!familyFileId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(familyFileId, false, agreementId || undefined);
    }
  }, [familyFileId, agreementId, sendTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Get list of typing users
  const typingUsersList = useMemo(() => {
    return Array.from(typingUsers.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
    }));
  }, [typingUsers]);

  return {
    handleTyping,
    stopTyping,
    typingUsers: typingUsersList,
    isPartnerTyping: typingUsersList.length > 0,
  };
}
