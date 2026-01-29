/**
 * Push Notification Service
 *
 * Handles push notification registration and management using Expo
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// ============================================================================
// Token Registration
// ============================================================================

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<PushTokenResult> {
  // Must be a physical device
  if (!Device.isDevice) {
    return {
      success: false,
      error: 'Push notifications require a physical device',
    };
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return {
        success: false,
        error: 'Permission to send notifications was denied',
      };
    }

    // Get Expo push token - requires valid EAS project ID
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    // Skip if no valid project ID (development mode)
    if (!projectId || projectId === 'your-project-id') {
      console.log('Push notifications skipped: No EAS project ID configured');
      return {
        success: false,
        error: 'EAS project ID not configured',
      };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Android requires notification channel
    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    return {
      success: true,
      token: tokenData.data,
    };
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register',
    };
  }
}

/**
 * Set up Android notification channels
 */
async function setupAndroidChannels(): Promise<void> {
  // Default channel for general notifications
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
  });

  // Messages channel
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    description: 'Notifications for new messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
  });

  // Schedule channel
  await Notifications.setNotificationChannelAsync('schedule', {
    name: 'Schedule',
    description: 'Notifications for schedule events and exchanges',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22c55e',
  });

  // Alerts channel (high priority)
  await Notifications.setNotificationChannelAsync('alerts', {
    name: 'Alerts',
    description: 'Important alerts and compliance notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#ef4444',
  });
}

// ============================================================================
// Notification Listeners
// ============================================================================

export type NotificationListener = (notification: Notifications.Notification) => void;
export type ResponseListener = (response: Notifications.NotificationResponse) => void;

/**
 * Add listener for received notifications (while app is open)
 */
export function addNotificationReceivedListener(
  listener: NotificationListener
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Add listener for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  listener: ResponseListener
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Remove a notification listener
 */
export function removeNotificationListener(subscription: Notifications.Subscription): void {
  subscription.remove();
}

// ============================================================================
// Local Notifications
// ============================================================================

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  payload: NotificationPayload,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: true,
    },
    trigger: trigger ?? null, // null = immediate
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ============================================================================
// Badge Management
// ============================================================================

/**
 * Set app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// ============================================================================
// Notification Permissions
// ============================================================================

/**
 * Check if notifications are permitted
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Open device settings (for enabling notifications)
 */
export function openNotificationSettings(): void {
  // This would typically open device settings
  // Using expo-linking or react-native Linking
}
