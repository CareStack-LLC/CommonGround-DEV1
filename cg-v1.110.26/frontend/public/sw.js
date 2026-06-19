/**
 * Service Worker for CommonGround.
 *
 * Jobs:
 *  1. Web Push notifications.
 *  2. Static-asset caching (fast relaunch).
 *  3. TRUE offline access to a few read-only screens (e.g. the custody
 *     calendar): their data is cached stale-while-revalidate and their page
 *     shell is cached so they render with no connection.
 *
 * Safety: we NEVER cache write requests, auth endpoints, messages, or other
 * sensitive APIs, and the per-user caches (data + authed shells) are wiped on
 * logout via a CLEAR_OFFLINE_CACHE message, so nothing leaks across accounts.
 */

const SW_VERSION = '2.1.0';
const STATIC_CACHE = `cg-static-${SW_VERSION}`;   // JS/CSS/fonts/images (no user data)
const SHELL_CACHE = `cg-shell-${SW_VERSION}`;     // offline.html (no user data)
const NAV_CACHE = `cg-nav-${SW_VERSION}`;         // authed route HTML (per-user → cleared on logout)
const DATA_CACHE = `cg-data-${SW_VERSION}`;       // read-only API JSON (per-user → cleared on logout)
const ALL_CACHES = [STATIC_CACHE, SHELL_CACHE, NAV_CACHE, DATA_CACHE];
const PER_USER_CACHES = [NAV_CACHE, DATA_CACHE];
const OFFLINE_URL = '/offline.html';

const STATIC_ASSET_RE = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|avif|ico)$/i;

// App routes that should work offline (their shell is cached). Custody calendar
// = /schedule. These are read-only / reference screens.
const OFFLINE_ROUTE_RE = /^\/(schedule|dashboard|agreements|family-files|my-circle)(?:\/|$|\?)/i;

// Read-only API GETs safe to serve from cache offline. Per-user/per-family
// scoped, so cache keys differ by user; still wiped on logout. Matched by
// pathname regardless of origin (the API runs on a separate host).
const OFFLINE_API_RE =
  /\/api\/v1\/(schedule|calendar|custody-time|custody-periods|exchanges|dashboard|agreements|family-files|children|my-time|court\/events)/i;

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
        keys.filter((k) => k.startsWith('cg-') && !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function staleWhileRevalidate(event, req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchAndCache = fetch(req)
    .then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    // Serve cached now, refresh in the background.
    event.waitUntil(fetchAndCache);
    return cached;
  }
  const fresh = await fetchAndCache;
  return fresh || Response.error();
}

// ── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Read-only API (cross-origin to the backend) → stale-while-revalidate.
  if (OFFLINE_API_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, req, DATA_CACHE));
    return;
  }

  // From here on, only our own origin.
  if (url.origin !== self.location.origin) return;
  // Any other same-origin API call must always hit the network.
  if (url.pathname.startsWith('/api/')) return;

  // Static assets → cache-first.
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

  // Navigations.
  if (req.mode === 'navigate') {
    // Offline-enabled routes → network-first, cache the shell, fall back to it.
    if (OFFLINE_ROUTE_RE.test(url.pathname)) {
      event.respondWith(
        (async () => {
          try {
            const res = await fetch(req);
            if (res && res.status === 200) {
              const cache = await caches.open(NAV_CACHE);
              cache.put(req, res.clone());
            }
            return res;
          } catch {
            const navCache = await caches.open(NAV_CACHE);
            const cachedShell = await navCache.match(req);
            if (cachedShell) return cachedShell;
            const shell = await caches.open(SHELL_CACHE);
            return (await shell.match(OFFLINE_URL)) || Response.error();
          }
        })()
      );
      return;
    }
    // Everything else → network, branded offline page when offline.
    event.respondWith(
      fetch(req).catch(async () => {
        const shell = await caches.open(SHELL_CACHE);
        return (await shell.match(OFFLINE_URL)) || Response.error();
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
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CLEAR_OFFLINE_CACHE') {
    // On logout / user switch: drop all per-user offline data + authed shells.
    event.waitUntil(Promise.all(PER_USER_CACHES.map((c) => caches.delete(c))));
  }
});
