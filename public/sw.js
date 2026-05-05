/**
 * Korte Service Worker — offline app shell + static asset caching.
 *
 * Strategy:
 * - App shell (navigations): Network-first, fall back to cached shell.
 * - Static assets (JS/CSS/fonts/images): Cache-first, fall back to network.
 * - API calls: Network-only (handled by the offline queue in the app layer).
 *
 * The CACHE_VERSION is bumped on each deploy so stale caches are cleared.
 */

const CACHE_VERSION = 'korte-v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const SHELL_CACHE = `shell-${CACHE_VERSION}`;

// App shell pages to precache on install
const SHELL_URLS = [
  '/',
  '/dashboard',
  '/booking/new',
  '/booking/confirmed',
  '/schedule',
  '/members',
  '/checkin',
  '/reports',
  '/settings',
  '/billing',
  '/manifest.json',
];

// ── Install: precache app shell ─────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Fetch each shell URL individually — don't let one failure block all
      const results = await Promise.allSettled(
        SHELL_URLS.map((url) =>
          fetch(url).then((res) => {
            if (res.ok) return cache.put(url, res);
          })
        )
      );
      const cached = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`[sw] installed, precached ${cached}/${SHELL_URLS.length} shell pages`);
    })
  );
  // Activate immediately — don't wait for existing tabs to close
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== SHELL_CACHE)
          .map((key) => {
            console.log(`[sw] deleting old cache: ${key}`);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: routing strategy ─────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations go through the app's offline queue)
  if (request.method !== 'GET') return;

  // Skip API routes — the app handles offline API errors via the queue
  if (url.pathname.startsWith('/api/')) return;

  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests (HTML pages): network-first → cached shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  // Static assets (JS, CSS, fonts, images): cache-first → network fallback
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }
});

// ── Network-first for navigations ───────────────────────────

async function networkFirstShell(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses for offline use
    if (networkResponse.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fall back to cached root page as a generic offline shell
    const fallback = await caches.match('/');
    if (fallback) return fallback;

    return new Response('Offline — please reconnect to continue.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ── Cache-first for static assets ───────────────────────────

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ── Helpers ─────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|ico|webp|avif|webmanifest)$/i.test(pathname)
    || pathname.startsWith('/_next/static/');
}
