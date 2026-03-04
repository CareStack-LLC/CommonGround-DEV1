'use client';

import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/lib/api';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  isLoading: boolean;
  error: string | null;
}

interface UsePushNotificationsReturn extends PushSubscriptionState {
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
}

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Hook for managing Web Push notification subscriptions.
 *
 * Handles:
 * - Service worker registration
 * - Push permission requests
 * - Subscription management with backend
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    isLoading: true,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!supported) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          permission: 'unsupported',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }));

      // Register service worker if not already registered
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('[Push] Service worker registered:', registration.scope);

        // Check existing subscription
        const subscription = await registration.pushManager.getSubscription();
        setState((prev) => ({
          ...prev,
          isSubscribed: !!subscription,
          isLoading: false,
        }));
      } catch (error) {
        console.error('[Push] Service worker registration failed:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to register service worker',
        }));
      }
    };

    checkSupport();
  }, []);

  // Get VAPID public key from backend
  const getVapidKey = useCallback(async (): Promise<string | null> => {
    try {
      const token = authAPI.getToken();
      const response = await fetch(`${API_BASE}/api/v1/push/vapid-public-key`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch VAPID key');
      }

      const data = await response.json();
      return data.public_key;
    } catch (error) {
      console.error('[Push] Error fetching VAPID key:', error);
      return null;
    }
  }, []);

  // Convert base64 URL to Uint8Array for applicationServerKey
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied',
        }));
        return false;
      }

      // Get VAPID public key
      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Push notifications not configured on server',
        }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // Send subscription to backend
      const subscriptionJSON = subscription.toJSON();
      const token = authAPI.getToken();
      const response = await fetch(`${API_BASE}/api/v1/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subscriptionJSON.endpoint,
          p256dh_key: subscriptionJSON.keys?.p256dh,
          auth_key: subscriptionJSON.keys?.auth,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register subscription with server');
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }));

      console.log('[Push] Successfully subscribed');
      return true;
    } catch (error) {
      console.error('[Push] Subscription error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      }));
      return false;
    }
  }, [state.isSupported, getVapidKey, urlBase64ToUint8Array]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Remove from backend
        const token = authAPI.getToken();
        const endpoint = encodeURIComponent(subscription.endpoint);
        await fetch(`${API_BASE}/api/v1/push/unsubscribe?endpoint=${endpoint}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      console.log('[Push] Successfully unsubscribed');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }));
      return false;
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async (): Promise<void> => {
    if (!state.isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState((prev) => ({
        ...prev,
        isSubscribed: !!subscription,
        permission: Notification.permission,
      }));
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
    }
  }, [state.isSupported]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
