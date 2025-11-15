// Service Worker for AI Background Remover PWA
// Includes caching for ONNX models and assets

const CACHE_NAME = 'ai-bg-remover-v1.0.1';
const MODEL_CACHE = 'ai-models-v1';

// Static assets to cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
    'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js',
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/browser.mjs'
];

// Patterns for AI model files (ONNX and WASM)
const MODEL_PATTERNS = [
    /\.onnx$/,
    /\.wasm$/,
    /model.*\.json$/,
    /@imgly\/background-removal/
];

// Install Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {cache: 'reload'})));
            })
            .catch(err => console.error('[SW] Cache failed:', err))
    );
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== MODEL_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Check if URL is a model file
function isModelFile(url) {
    return MODEL_PATTERNS.some(pattern => pattern.test(url));
}

// Fetch Strategy
self.addEventListener('fetch', event => {
    const {request} = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Skip ImgBB API calls
    if (url.hostname === 'api.imgbb.com') {
        return;
    }
    
    // Handle model files differently (cache-first, then network)
    if (isModelFile(url.href)) {
        event.respondWith(
            caches.open(MODEL_CACHE).then(cache => {
                return cache.match(request).then(response => {
                    if (response) {
                        console.log('[SW] Serving model from cache:', url.pathname);
                        return response;
                    }
                    
                    console.log('[SW] Fetching model:', url.pathname);
                    return fetch(request).then(networkResponse => {
                        // Cache the model for offline use
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }
    
    // For other assets: Network first, fallback to cache
    event.respondWith(
        fetch(request)
            .then(response => {
                // Clone the response
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    
                    // Cache the response
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                
                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(request).then(response => {
                    if (response) {
                        console.log('[SW] Serving from cache (offline):', url.pathname);
                        return response;
                    }
                    
                    // Return offline page for navigation requests
                    if (request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// Background Sync for ImgBB uploads
self.addEventListener('sync', event => {
    if (event.tag === 'sync-upload') {
        event.waitUntil(syncPendingUploads());
    }
});

async function syncPendingUploads() {
    console.log('[SW] Syncing pending uploads...');
    // Implement queue-based upload sync here if needed
}

// Push Notifications (optional)
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'AI Background Remover';
    const options = {
        body: data.body || 'Your image processing is complete!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'bg-removal-notification',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Message handler for cache control
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
});

console.log('[SW] Service Worker script loaded');
