//bruges til at gemme statiske filer i appen. Offline adgang til appens filer
const STATIC_CACHE = 'snipmaster-static-v1';
//dynamisk cachelagring. Bruges til sider der ikke installeres
const DYNAMIC_CACHE = 'snipmaster-dynamic-v1';
//bruges til at gemme snippets
const SNIPPETS_CACHE = 'snipmaster-snippets-v1';

//liste over filer, som skal køres ved installation. De skal kunne køre offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/offline.html',
  '/scripts/js/storage.js',
  '/scripts/js/ui.js',
];

// når service workeren installeres, caches filerne
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('Service Worker: Install Completed');
        return self.skipWaiting();
      })
  );
});

// rydder de gamle caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, SNIPPETS_CACHE];

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName =>
              cacheName.startsWith('snipmaster-') && !currentCaches.includes(cacheName)
            )
            .map(cacheToDelete => {
              console.log('Service Worker: Deleting old cache', cacheToDelete);
              return caches.delete(cacheToDelete);
            })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation Completed');
        return self.clients.claim();
      })
  );
});

// Fetch event - route based on type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // hvis URL'en starter med api eller indeholder snippets skal den køre staleWhile...
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('snippets') ||
    event.request.headers.get('accept')?.includes('application/json')
  ) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  // hvis der navigeres til index.html skal den kører networkFirst
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event));
    return;
  }

  // hvis anmodningen er efter statiske filer, så køres cacheFirst
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(cacheFirst(event));
    return;
  }

  // hvis ingen af ovenstående, så kører networkFirst.
  event.respondWith(networkFirst(event));
});

// returnerer cache, hvis de findes, ellers caches de i dynamic_cache
function cacheFirst(event) {
  return caches.match(event.request).then(cachedResponse => {
    if (cachedResponse) {
      return cachedResponse;
    }
    return fetch(event.request).then(networkResponse => {
      return caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

// tjekker om der er net, hvis der ikke er returneret cache eller vises offline-siden
function networkFirst(event) {
  return fetch(event.request)
    .then(networkResponse => {
      if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
        return networkResponse;
      }

      const responseToCache = networkResponse.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(event.request, responseToCache);
      });

      return networkResponse;
    })
    .catch(() => {
      return caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/offline.html');
        }
      });
    });
}

// returnerer cache med det samme, og opdaterer i baggrunden med nyeste data
function staleWhileRevalidate(event) {
  return caches.open(SNIPPETS_CACHE).then(cache => {
    return cache.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        })
        .catch(error => {
          console.error('Failed to update cache:', error);
          return null;
        });

      return cachedResponse || fetchPromise;
    });
  });
}

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-snippets') {
    console.log('Background sync triggered');
    event.waitUntil(syncSnippets());
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;

  console.log('Notification clicked:', action);
  notification.close();

  if (action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background sync logic
async function syncSnippets() {
  try {
    const snippetsToSync = await getSnippetsToSync();
    if (snippetsToSync.length === 0) {
      console.log('No snippets to sync');
      return;
    }

    console.log(`Syncing ${snippetsToSync.length} snippets in background`);

    for (const snippet of snippetsToSync) {
      try {
        await syncSnippet(snippet);
        await markSnippetSynced(snippet.id);
      } catch (error) {
        console.error(`Failed to sync snippet ${snippet.id}:`, error);
      }
    }

    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

// IndexedDB helpers
async function getSnippetsToSync() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SnipMasterDB', 1);

    request.onerror = reject;

    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction('snippets', 'readonly');
      const store = transaction.objectStore('snippets');
      const index = store.index('by-sync-status');
      const query = index.getAll('pending');

      query.onsuccess = () => resolve(query.result);
      query.onerror = reject;
    };
  });
}

async function syncSnippet(snippet) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.9) {
        resolve({ success: true });
      } else {
        reject(new Error('Server error'));
      }
    }, 500);
  });
}

async function markSnippetSynced(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SnipMasterDB', 1);

    request.onerror = reject;

    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction('snippets', 'readwrite');
      const store = transaction.objectStore('snippets');

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const snippet = getRequest.result;
        if (snippet) {
          snippet.syncStatus = 'synced';
          const updateRequest = store.put(snippet);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = reject;
        } else {
          resolve();
        }
      };

      getRequest.onerror = reject;
    };
  });
}
