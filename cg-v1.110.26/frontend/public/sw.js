/**
 * Service Worker for CommonGround Push Notifications
 *
 * Handles push events from Web Push API and notification clicks.
 */

// Version for cache management
const SW_VERSION = '1.0.0';

/**
 * Handle incoming push notifications
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'CommonGround',
    body: 'You have a new notification',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    url: '/',
    tag: 'default',
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url,
      ...data.data
    },
    actions: data.actions || [],
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const url = event.notification.data?.url || '/';
  const action = event.action;

  // Handle action buttons if present
  if (action === 'view') {
    // View action - open the URL
  } else if (action === 'dismiss') {
    // Dismiss action - just close
    return;
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to the notification URL and focus
            client.navigate(url);
            return client.focus();
          }
        }
        // No window open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

/**
 * Handle notification close
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  // Could track analytics here
});

/**
 * Handle service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + SW_VERSION);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + SW_VERSION);
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
