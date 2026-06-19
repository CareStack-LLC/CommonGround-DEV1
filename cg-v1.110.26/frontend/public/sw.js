/**
 * Service Worker for CommonGround.
 *
 * Two jobs:
 *  1. Web Push notifications (push / notificationclick / notificationclose).
 *  2. A conservative offline/caching layer for a native-app feel:
 *       - static assets (JS/CSS/fonts/images) are served cache-first for fast
 *         repeat launches,
 *       - failed navigations fall back to a branded offline page.
 *     We deliberately DO NOT cache API responses or authenticated HTML, so
 *     auth/realtime state never goes stale.
 */

const SW_VERSION = '2.0.0';
const STATIC_CACHE = `cg-static-${SW_VERSION}`;
const SHELL_CACHE = `cg-shell-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';

const STATIC_ASSET_RE = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|avif|ico)$/i;

// ── Install: precache the offline fallback ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate: drop old caches, take control ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('cg-') && ![STATIC_CACHE, SHELL_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ── Fetch: cache-first for static, network-first-with-offline for navigations ─
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Only handle our own origin; never touch Supabase / Daily / Stripe / etc.
  if (url.origin !== self.location.origin) return;
  // Never cache the API — auth + realtime must always hit the network.
  if (url.pathname.startsWith('/api/')) return;

  // Static assets → cache-first (fast repeat loads, no auth risk).
  if (url.pathname.startsWith('/_next/static/') || STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Navigations → network, fall back to the offline page when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      })
    );
  }
});

// ── Web Push ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'CommonGround',
    body: 'You have a new notification',
    icon: '/apple-icon.png',
    badge: '/apple-icon.png',
    url: '/',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
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
    data: { url: data.url, ...data.data },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', () => {});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
