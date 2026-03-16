'use client';

import { useEffect } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { ScheduleEventRow } from '@/lib/supabase-realtime';

interface UseRealtimeScheduleOptions {
  familyFileId: string | null;
  onEventCreated?: (event: ScheduleEventRow) => void;
  onEventUpdated?: (event: ScheduleEventRow) => void;
  onEventDeleted?: (eventId: string) => void;
}

/**
 * Hook for subscribing to real-time schedule event updates via Supabase Realtime.
 *
 * Replaces WebSocket events: event_created, event_updated, event_deleted
 */
export function useRealtimeSchedule({
  familyFileId,
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
}: UseRealtimeScheduleOptions) {
  const {
    subscribeToScheduleChannel,
    unsubscribeFromScheduleChannel,
    onScheduleEventInsert,
    onScheduleEventUpdate,
    onScheduleEventDelete,
  } = useRealtime();

  // Subscribe to schedule channel on mount
  useEffect(() => {
    if (!familyFileId) return;

    subscribeToScheduleChannel(familyFileId);

    return () => {
      unsubscribeFromScheduleChannel(familyFileId);
    };
  }, [familyFileId, subscribeToScheduleChannel, unsubscribeFromScheduleChannel]);

  // Handle new events
  useEffect(() => {
    if (!familyFileId || !onEventCreated) return;

    const unsubscribe = onScheduleEventInsert((event: ScheduleEventRow) => {
      onEventCreated(event);
    });

    return unsubscribe;
  }, [familyFileId, onScheduleEventInsert, onEventCreated]);

  // Handle event updates
  useEffect(() => {
    if (!familyFileId || !onEventUpdated) return;

    const unsubscribe = onScheduleEventUpdate((event: ScheduleEventRow) => {
      onEventUpdated(event);
    });

    return unsubscribe;
  }, [familyFileId, onScheduleEventUpdate, onEventUpdated]);

  // Handle event deletions
  useEffect(() => {
    if (!familyFileId || !onEventDeleted) return;

    const unsubscribe = onScheduleEventDelete((old: { id: string }) => {
      onEventDeleted(old.id);
    });

    return unsubscribe;
  }, [familyFileId, onScheduleEventDelete, onEventDeleted]);
}
