const CACHE_NAME = 'joebro-cache-v1';
const ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'logo.png',
    'manifest.json'
];

// Install Service Worker and cache assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Cache-first strategy for loading resources offline
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
