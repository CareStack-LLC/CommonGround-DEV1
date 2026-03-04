'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, activitiesAPI, FamilyFile } from '@/lib/api';
import { useRealtime } from '@/contexts/realtime-context';

interface NotificationContextType {
  unreadCount: number;
  isLoading: boolean;
  familyFileId: string | null;
  refreshUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
  decrementUnread: () => void;
  incrementUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { subscribeToFamilyFile, onActivityInsert } = useRealtime();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [familyFileId, setFamilyFileId] = useState<string | null>(null);

  // Fetch the active family file ID
  const fetchFamilyFileId = useCallback(async (): Promise<string | null> => {
    try {
      const response = await familyFilesAPI.list();
      const activeFile = response.items.find(
        (ff: FamilyFile) => ff.status === 'active'
      );
      if (activeFile) {
        setFamilyFileId(activeFile.id);
        return activeFile.id;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch family file:', error);
      return null;
    }
  }, []);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      let ffId = familyFileId;
      if (!ffId) {
        ffId = await fetchFamilyFileId();
      }

      if (ffId) {
        const data = await activitiesAPI.getUnreadCount(ffId);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, familyFileId, fetchFamilyFileId]);

  // Mark all activities as read
  const markAllRead = useCallback(async () => {
    if (!familyFileId) return;

    try {
      await activitiesAPI.markAllAsRead(familyFileId);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [familyFileId]);

  // Increment unread count (used when new activity arrives via realtime)
  const incrementUnread = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Decrement unread count (used when marking individual items as read)
  const decrementUnread = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Subscribe to real-time activity updates
  useEffect(() => {
    if (!familyFileId) return;

    // Subscribe to family file for real-time updates
    subscribeToFamilyFile(familyFileId);

    // Listen for new activities and increment unread count
    const unsubscribe = onActivityInsert(() => {
      incrementUnread();
    });

    return unsubscribe;
  }, [familyFileId, subscribeToFamilyFile, onActivityInsert, incrementUnread]);

  // Initial fetch (no more polling!)
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setFamilyFileId(null);
      setIsLoading(false);
      return;
    }

    // Initial fetch only - realtime handles updates
    refreshUnreadCount();
  }, [isAuthenticated, refreshUnreadCount]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setFamilyFileId(null);
    }
  }, [user]);

  const value: NotificationContextType = {
    unreadCount,
    isLoading,
    familyFileId,
    refreshUnreadCount,
    markAllRead,
    decrementUnread,
    incrementUnread,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
