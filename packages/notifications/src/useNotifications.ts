/**
 * React hook for handling push notifications
 */

import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { NotificationService } from './NotificationService';
import type { NotificationData, PushToken } from './types';

export interface UseNotificationsOptions {
  userType: 'parent' | 'child' | 'circle';
  onTokenRegistered?: (token: PushToken) => Promise<void>;
  onIncomingCall?: (data: { sessionId: string; callerName: string; roomUrl: string }) => void;
}

export function useNotifications(options: UseNotificationsOptions) {
  const { userType, onTokenRegistered, onIncomingCall } = options;
  const isInitialized = useRef(false);

  // Handle notification received while app is open
  const handleNotificationReceived = useCallback(
    (notification: Notifications.Notification) => {
      const data = notification.request.content.data as NotificationData;

      if (!data?.type) return;

      // Handle incoming call notification specially
      if (data.type === 'incoming_call' && onIncomingCall) {
        onIncomingCall({
          sessionId: data.sessionId,
          callerName: data.callerName,
          roomUrl: data.roomUrl,
        });
      }
    },
    [onIncomingCall]
  );

  // Handle notification tap (user interaction)
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as NotificationData;

      if (!data?.type) return;

      // Navigate based on notification type
      switch (data.type) {
        case 'incoming_call':
          // Navigate to call screen
          if (userType === 'parent') {
            router.push(`/call/${data.sessionId}`);
          } else if (userType === 'child') {
            router.push(`/call/${data.callerId}`);
          } else {
            router.push(`/call/${data.callerId}`);
          }
          break;

        case 'missed_call':
          // Navigate to call history or home
          router.push('/');
          break;

        case 'new_message':
          // Navigate to messages
          if (userType === 'parent') {
            router.push('/(tabs)/messages');
          } else if (userType === 'child') {
            router.push('/(main)/circle');
          } else {
            router.push('/(tabs)/messages');
          }
          break;

        case 'new_photo':
          // Navigate to memories/photos
          if (userType === 'circle') {
            router.push('/(tabs)/memories');
          }
          break;

        case 'schedule_reminder':
          // Navigate to schedule (parent only)
          if (userType === 'parent') {
            router.push('/(tabs)/schedule');
          }
          break;

        case 'circle_invite':
          // Navigate to invitation screen
          if (userType === 'circle') {
            router.push('/(auth)/invitation');
          }
          break;

        case 'child_online':
          // Navigate to home to see online status
          router.push('/');
          break;

        default:
          router.push('/');
      }
    },
    [userType]
  );

  // Initialize notifications on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    NotificationService.initialize({
      onTokenRegistered,
      onNotificationReceived: handleNotificationReceived,
      onNotificationResponse: handleNotificationResponse,
    });

    return () => {
      NotificationService.cleanup();
    };
  }, [onTokenRegistered, handleNotificationReceived, handleNotificationResponse]);

  return {
    getToken: () => NotificationService.getToken(),
    clearBadge: () => NotificationService.clearBadge(),
    setBadgeCount: (count: number) => NotificationService.setBadgeCount(count),
  };
}
