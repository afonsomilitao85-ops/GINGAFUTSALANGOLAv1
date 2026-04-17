const CACHE_NAME = 'gingafutsal-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // CRITICAL: Bypass Service Worker for all Firebase services to prevent upload/auth hangs
  // We check for common Firebase domains and non-GET methods (uploads use POST/PUT)
  if (
    event.request.method !== 'GET' ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('firebase.googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com')
  ) {
    return; // Let the browser handle the request normally via network
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
