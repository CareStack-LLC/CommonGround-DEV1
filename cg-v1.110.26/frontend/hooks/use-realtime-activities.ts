'use client';

import { useEffect, useCallback } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { ActivityRow } from '@/lib/supabase-realtime';
import { RecentActivity } from '@/lib/api';

interface UseRealtimeActivitiesOptions {
  familyFileId: string | null;
  onNewActivity?: (activity: RecentActivity) => void;
}

/**
 * Hook for subscribing to real-time activity updates via Supabase Realtime
 */
export function useRealtimeActivities({
  familyFileId,
  onNewActivity,
}: UseRealtimeActivitiesOptions) {
  const { subscribeToFamilyFile, unsubscribeFromFamilyFile, onActivityInsert } = useRealtime();

  // Convert ActivityRow to RecentActivity
  const rowToActivity = useCallback((row: ActivityRow): RecentActivity => {
    return {
      id: row.id,
      activity_type: row.activity_type,
      category: row.category,
      actor_name: row.actor_name,
      title: row.title,
      description: row.description || undefined,
      icon: row.icon,
      severity: row.severity,
      created_at: row.created_at,
      is_read: false, // New activities are unread
      subject_type: row.subject_type,
      subject_id: row.subject_id || undefined,
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

  // Handle new activities
  useEffect(() => {
    if (!familyFileId || !onNewActivity) return;

    const unsubscribe = onActivityInsert((row: ActivityRow) => {
      const activity = rowToActivity(row);
      onNewActivity(activity);
    });

    return unsubscribe;
  }, [familyFileId, onActivityInsert, onNewActivity, rowToActivity]);
}
