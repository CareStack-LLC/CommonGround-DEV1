/**
 * Notification Provider
 *
 * Handles push notification setup, registration, and deep linking.
 * Features:
 * - Request notification permissions
 * - Register Expo push token with backend
 * - Handle incoming notifications
 * - Navigate to relevant screen on notification tap
 */

import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";

import { parent } from "@commonground/api-client";
import { useAuth } from "./AuthProvider";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // For incoming calls, show immediately with sound
    if (data?.type === "incoming_call") {
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

interface NotificationContextType {
  expoPushToken: string | null;
  isPermissionGranted: boolean;
  requestPermissions: () => Promise<boolean>;
  clearBadge: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  isPermissionGranted: false,
  requestPermissions: async () => false,
  clearBadge: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Request notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      console.warn("Push notifications only work on physical devices");
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === "granted") {
      setIsPermissionGranted(true);
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === "granted";
    setIsPermissionGranted(granted);
    return granted;
  }, []);

  // Get Expo push token
  const getPushToken = useCallback(async (): Promise<string | null> => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      // Skip if no valid project ID (development mode)
      if (!projectId || projectId === 'your-project-id') {
        console.log('Push token skipped: No EAS project ID configured');
        return null;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token;
    } catch (error) {
      console.log("Push token unavailable (development mode)");
      return null;
    }
  }, []);

  // Register token with backend
  const registerTokenWithBackend = useCallback(async (token: string) => {
    try {
      await parent.push.registerPushToken({
        token,
        platform: Platform.OS as "ios" | "android",
        device_id: Constants.deviceId || undefined,
      });
      console.log("Push token registered with backend");
    } catch (error) {
      console.error("Failed to register push token:", error);
      // Don't throw - token registration is not critical for app function
    }
  }, []);

  // Handle notification tap - navigate to relevant screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      if (!data) return;

      // Navigate based on notification type
      switch (data.type) {
        case "new_message":
          if (data.conversationId) {
            router.push(`/messages/${data.conversationId}`);
          } else {
            router.push("/(tabs)/messages");
          }
          break;

        case "incoming_call":
        case "missed_call":
          // Navigate to calls or recordings
          router.push("/recordings");
          break;

        case "schedule_reminder":
          if (data.eventId) {
            router.push(`/events/${data.eventId}`);
          } else {
            router.push("/(tabs)/schedule");
          }
          break;

        case "exchange_reminder":
          router.push("/(tabs)/schedule");
          break;

        case "expense_update":
          if (data.obligationId) {
            router.push(`/expenses/${data.obligationId}`);
          } else {
            router.push("/expenses");
          }
          break;

        case "agreement_update":
          if (data.agreementId) {
            router.push(`/agreements/${data.agreementId}`);
          } else {
            router.push("/agreements");
          }
          break;

        case "activity":
          router.push("/activity");
          break;

        default:
          // Default to activity feed
          router.push("/activity");
          break;
      }
    },
    []
  );

  // Set up Android notification channels
  const setupAndroidChannels = useCallback(async () => {
    if (Platform.OS !== "android") return;

    // Incoming calls - high priority
    await Notifications.setNotificationChannelAsync("calls", {
      name: "Incoming Calls",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#22c55e",
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Messages
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: "#0ea5e9",
      sound: "default",
    });

    // Schedule
    await Notifications.setNotificationChannelAsync("schedule", {
      name: "Schedule Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#f97316",
      sound: "default",
    });

    // Activity
    await Notifications.setNotificationChannelAsync("activity", {
      name: "Activity Updates",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#4A6C58",
    });

    // General
    await Notifications.setNotificationChannelAsync("general", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }, []);

  // Clear badge count
  const clearBadge = useCallback(async () => {
    await Notifications.setBadgeCountAsync(0);
  }, []);

  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initNotifications = async () => {
      // Request permissions
      const granted = await requestPermissions();
      if (!granted) return;

      // Get push token
      const token = await getPushToken();
      if (token) {
        setExpoPushToken(token);
        // Register with backend
        await registerTokenWithBackend(token);
      }

      // Set up Android channels
      await setupAndroidChannels();
    };

    initNotifications();
  }, [isAuthenticated, user, requestPermissions, getPushToken, registerTokenWithBackend, setupAndroidChannels]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification.request.content.title);
        // Could update UI or show in-app notification here
      }
    );

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationResponse]);

  const value: NotificationContextType = {
    expoPushToken,
    isPermissionGranted,
    requestPermissions,
    clearBadge,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
