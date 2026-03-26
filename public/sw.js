const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'v1';
const CACHE_NAME = `growmore-${SW_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.ico',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/patternLogo.png',
    '/notification-icon.png'
];

const canCacheResponse = (response) => {
    return !!response && response.status === 200 && response.type === 'basic';
};

// Helper to determine if an asset is a static file (JS, CSS, Font, etc.)
const isStaticAsset = (url) => {
    return url.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|json)$/) ||
        url.includes('/static/');
};

// Install Event - Pre-cache essential files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching core assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Strategic Caching
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. Only handle GET requests and exclude Supabase Realtime/Auth calls (unless specifically needed)
    if (request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return; // Let Supabase handle its own offline logic or return errors

    // 2. Navigation Request (index.html) - Network First
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (canCacheResponse(response)) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match('/index.html') || caches.match('/'))
        );
        return;
    }

    // 3. Static Assets - Cache First, then Network
    if (isStaticAsset(request.url)) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;

                return fetch(request).then((networkResponse) => {
                    if (!canCacheResponse(networkResponse)) return networkResponse;

                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    return networkResponse;
                }).catch(() => {
                    // Fail silently or return empty/fallback for failed assets
                    return null;
                });
            })
        );
        return;
    }

    // 4. Default: Network First, falling back to cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (canCacheResponse(response)) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
