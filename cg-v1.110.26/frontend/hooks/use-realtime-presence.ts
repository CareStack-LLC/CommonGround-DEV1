'use client';

import { useEffect, useMemo } from 'react';
import { useRealtime } from '@/contexts/realtime-context';

interface OnlineUser {
  userId: string;
  userName: string;
  onlineAt: string;
  status: 'online' | 'away' | 'busy';
}

interface UseRealtimePresenceOptions {
  familyFileId: string | null;
}

interface UseRealtimePresenceReturn {
  onlineUsers: OnlineUser[];
  isUserOnline: (userId: string) => boolean;
  onlineCount: number;
}

/**
 * Hook for tracking user presence via Supabase Realtime
 */
export function useRealtimePresence({
  familyFileId,
}: UseRealtimePresenceOptions): UseRealtimePresenceReturn {
  const { subscribeToFamilyFile, unsubscribeFromFamilyFile, onlineUsers, isUserOnline } =
    useRealtime();

  // Subscribe to family file on mount
  useEffect(() => {
    if (!familyFileId) return;

    subscribeToFamilyFile(familyFileId);

    return () => {
      unsubscribeFromFamilyFile(familyFileId);
    };
  }, [familyFileId, subscribeToFamilyFile, unsubscribeFromFamilyFile]);

  // Convert Map to array for easier consumption
  const onlineUsersList = useMemo(() => {
    return Array.from(onlineUsers.values());
  }, [onlineUsers]);

  return {
    onlineUsers: onlineUsersList,
    isUserOnline,
    onlineCount: onlineUsersList.length,
  };
}
