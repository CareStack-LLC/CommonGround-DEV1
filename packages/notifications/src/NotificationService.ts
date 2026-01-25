/**
 * Push notification service for CommonGround mobile apps
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { NotificationData, NotificationType, PushToken } from './types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as NotificationData;

    // For incoming calls, show immediately with sound
    if (data?.type === 'incoming_call') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    }

    // For other notifications
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export interface NotificationServiceConfig {
  onTokenRegistered?: (token: PushToken) => Promise<void>;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

class NotificationServiceClass {
  private config: NotificationServiceConfig = {};
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private token: string | null = null;

  /**
   * Initialize the notification service
   */
  async initialize(config: NotificationServiceConfig = {}): Promise<string | null> {
    this.config = config;

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Push notification permissions not granted');
      return null;
    }

    // Get push token
    const token = await this.getPushToken();
    if (!token) {
      console.warn('Failed to get push token');
      return null;
    }

    this.token = token;

    // Register token with backend
    if (this.config.onTokenRegistered) {
      const pushToken: PushToken = {
        token,
        platform: Platform.OS as 'ios' | 'android',
        deviceId: Constants.deviceId || 'unknown',
      };
      await this.config.onTokenRegistered(pushToken);
    }

    // Set up notification listeners
    this.setupListeners();

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    return token;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get the Expo push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners() {
    // Clean up existing listeners
    this.cleanup();

    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.config.onNotificationReceived?.(notification);
      }
    );

    // Listener for when user taps on a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        this.config.onNotificationResponse?.(response);
      }
    );
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels() {
    // Incoming calls - high priority
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Incoming Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#0ea5e9',
      sound: 'default',
    });

    // Photos
    await Notifications.setNotificationChannelAsync('photos', {
      name: 'Photos & Memories',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#8b5cf6',
    });

    // Reminders
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Schedule Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#f97316',
      sound: 'default',
    });

    // General
    await Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  /**
   * Get the Android channel for a notification type
   */
  getChannelForType(type: NotificationType): string {
    switch (type) {
      case 'incoming_call':
      case 'missed_call':
        return 'calls';
      case 'new_message':
        return 'messages';
      case 'new_photo':
        return 'photos';
      case 'schedule_reminder':
        return 'reminders';
      default:
        return 'general';
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...(Platform.OS === 'android' && {
          channelId: this.getChannelForType(data.type),
        }),
      },
      trigger: trigger || null,
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Dismiss all delivered notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();
