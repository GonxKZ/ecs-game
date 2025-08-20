/**
 * Service Worker para PWA del Motor ECS Educativo
 * Maneja caching, offline support y actualizaciones
 */

const CACHE_NAME = 'ecs-game-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Assets críticos que siempre deben estar cacheados
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Assets que deben cachearse para offline
const OFFLINE_ASSETS = [
  '/offline.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/static/js/vendor.js'
];

// Assets que pueden cachearse cuando estén disponibles
const OPTIONAL_ASSETS = [
  '/assets/textures/',
  '/assets/models/',
  '/assets/audio/',
  '/assets/shaders/'
];

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    Promise.all([
      // Cache assets críticos
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Caching critical assets...');
        return cache.addAll(CRITICAL_ASSETS);
      }),

      // Cache assets offline
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Caching offline assets...');
        return cache.addAll(OFFLINE_ASSETS).catch(error => {
          console.warn('Some offline assets failed to cache:', error);
        });
      }),

      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activating...');

  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Claim clients
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Solo manejar requests HTTP(S)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Estrategia: Network First con fallback a cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to offline page
              return caches.match(OFFLINE_URL);
            });
        })
    );
  } else if (event.request.url.includes('/api/')) {
    // API requests: Network only con timeout
    event.respondWith(
      Promise.race([
        fetch(event.request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 3000)
        )
      ])
    );
  } else {
    // Assets: Cache First con fallback a network
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached version and update in background
            fetch(event.request)
              .then(response => {
                if (response && response.status === 200) {
                  const responseClone = response.clone();
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                  });
                }
              })
              .catch(() => {
                // Network failed, that's ok
              });

            return cachedResponse;
          }

          // Not in cache, fetch from network
          return fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            });
        })
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_ASSETS':
      event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
          return cache.addAll(data.assets);
        })
      );
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(CACHE_NAME).then(() => {
          return caches.open(CACHE_NAME);
        })
      );
      break;

    case 'GET_CACHE_INFO':
      caches.open(CACHE_NAME).then(cache => {
        cache.keys().then(keys => {
          event.ports[0].postMessage({
            cacheName: CACHE_NAME,
            cachedItems: keys.length,
            size: 'Unknown' // Estimating size is complex
          });
        });
      });
      break;

    case 'UPDATE_CACHE':
      event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
          return Promise.all(
            data.updates.map(asset => {
              return fetch(asset.url, { cache: 'no-cache' })
                .then(response => {
                  if (response.ok) {
                    return cache.put(asset.url, response);
                  }
                })
                .catch(error => {
                  console.warn(`Failed to update ${asset.url}:`, error);
                });
            })
          );
        })
      );
      break;
  }
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notifications (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // This could sync game progress, leaderboards, etc.
  console.log('🔄 Background sync triggered');
}

// Periodic cleanup
setInterval(() => {
  cleanupOldCacheEntries();
}, 1000 * 60 * 60); // Every hour

async function cleanupOldCacheEntries() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();

  // Remove entries older than 1 day
  const oneDayAgo = Date.now() - (1000 * 60 * 60 * 24);

  await Promise.all(
    keys.map(async (request) => {
      const response = await cache.match(request);
      if (response) {
        const date = response.headers.get('date');
        if (date && new Date(date).getTime() < oneDayAgo) {
          await cache.delete(request);
        }
      }
    })
  );
}
