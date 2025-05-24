//bruges til at lagre snippets i IndexedDB

const SnippetStorage = {
    // opsætter databasen
    dbConfig: {
        name: 'SnipMasterDB',
        version: 1,
        storeName: 'snippets'
    },

    syncConfig: {
        lastSyncTime: localStorage.getItem('lastSyncTime') || null,
        isSyncing: false,
        syncEndpoint: '/api/sync' // Mock endpoint
    },

    openDB: function () {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbConfig.name, this.dbConfig.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(this.dbConfig.storeName)) {
                    const store = db.createObjectStore(this.dbConfig.storeName, { keyPath: 'id' });

                    store.createIndex('by-language', 'language', { unique: false });
                    store.createIndex('by-modified', 'lastModified', { unique: false });
                    store.createIndex('by-sync-status', 'syncStatus', { unique: false });

                    console.log('Database schema created');
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                console.log('Database opened successfully');
                resolve(db);
            };

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject('Error opening database');
            };
        });
    },

    getAll: async function () {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    getById: async function (id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    save: async function (snippet, setPending = true) {
        if (!snippet.id) {
            snippet.id = Date.now().toString();
        }
        if (!snippet.created) {
            snippet.created = new Date().toISOString();
        }

        snippet.lastModified = new Date().toISOString();

        if (setPending && snippet.syncStatus !== 'synced') {
            snippet.syncStatus = 'pending';
        }

        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readwrite');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.put(snippet);

            request.onsuccess = () => resolve(snippet);
            request.onerror = () => reject(request.error);
        });
    },

    delete: async function (id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.dbConfig.storeName, 'readwrite');
        const store = transaction.objectStore(this.dbConfig.storeName);
        const request = store.delete(id);

        request.onsuccess = async () => {
            console.log(`Snippet ${id} deleted from IndexedDB`);

            try {
                let snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
                snippets = snippets.filter(snip => snip.id !== id);
                localStorage.setItem('snippets', JSON.stringify(snippets));
                console.log('localStorage snippets updated');

                if (typeof this.renderSnippetList === 'function') {
                    this.renderSnippetList(snippets);
                }
            } catch (e) {
                console.warn('Failed to update localStorage snippets:', e);
            }

            try {
                const cache = await caches.open('snipmaster-snippets-v1');
                const requests = await cache.keys();
                await Promise.all(requests.map(req => cache.delete(req)));
                console.log('All cache entries deleted');
            } catch (cacheError) {
                console.warn('Cache delete failed:', cacheError);
            }

            resolve(true);
        };

        request.onerror = () => {
            console.error('IndexedDB delete failed:', request.error);
            reject(request.error);
        };
    });
},

    getByLanguage: async function (language) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const index = store.index('by-language');
            const request = index.getAll(language);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    getPendingSync: async function () {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const index = store.index('by-sync-status');
            const request = index.getAll('pending');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    markAsSynced: async function (id) {
        const snippet = await this.getById(id);
        if (snippet) {
            snippet.syncStatus = 'synced';
            return this.save(snippet, false); 
        }
    },

    migrateFromLocalStorage: async function () {
        if (localStorage.getItem('dbMigrationDone')) {
            console.log('Migration already completed');
            return;
        }

        try {
            const localSnippets = JSON.parse(localStorage.getItem('snippets') || '[]');

            if (localSnippets.length > 0) {
                console.log(`Migrating ${localSnippets.length} snippets to IndexedDB...`);

                for (const snippet of localSnippets) {
                    await this.save(snippet);
                }

                console.log('Migration completed successfully');
            } else {
                console.log('No snippets to migrate');
            }

            localStorage.setItem('dbMigrationDone', 'true');

        } catch (error) {
            console.error('Error during migration:', error);
        }
    },

    syncSingleSnippet: async function (id) {
        try {
            const snippet = await this.getById(id);
            if (!snippet || snippet.syncStatus !== 'pending') {
                return { success: false, message: 'Nothing to sync' };
            }

            await this.syncWithServer(snippet);

            await this.markAsSynced(snippet.id);
            return { success: true };
        } catch (error) {
            console.error(`Failed to sync snippet ${id}:`, error);
            return { success: false, error };
        }
    },

    syncAll: async function () {
        if (this.syncConfig.isSyncing) {
            return { success: false, message: 'Sync already in progress' };
        }

        this.syncConfig.isSyncing = true;
        document.dispatchEvent(new CustomEvent('sync-status-change', {
            detail: { status: 'syncing', message: 'Starting sync...' }
        }));

        try {
            const pendingSnippets = await this.getPendingSync();

            if (pendingSnippets.length === 0) {
                document.dispatchEvent(new CustomEvent('sync-status-change', {
                    detail: { status: 'sync-success', message: 'Nothing to sync' }
                }));
                this.syncConfig.isSyncing = false;
                return { success: true, message: 'Nothing to sync' };
            }

            let successCount = 0;
            let errorCount = 0;

            for (const snippet of pendingSnippets) {
                try {
                    await this.syncWithServer(snippet);
                    await this.markAsSynced(snippet.id);
                    successCount++;
                    document.dispatchEvent(new CustomEvent('sync-status-change', {
                        detail: {
                            status: 'syncing',
                            message: `Syncing ${successCount + errorCount}/${pendingSnippets.length}`
                        }
                    }));

                } catch (error) {
                    console.error(`Failed to sync snippet ${snippet.id}:`, error);
                    errorCount++;
                }
            }
            if (successCount > 0) {
                this.updateLastSyncTime();
            }
            if (errorCount === 0) {
                document.dispatchEvent(new CustomEvent('sync-status-change', {
                    detail: {
                        status: 'sync-success',
                        message: `All ${successCount} snippets synced successfully`
                    }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('sync-status-change', {
                    detail: {
                        status: 'sync-error',
                        message: `Synced ${successCount}/${pendingSnippets.length} snippets. ${errorCount} failed.`
                    }
                }));
            }

            return { success: true, totalCount: pendingSnippets.length, successCount, errorCount };
        } catch (error) {
            console.error('Sync failed:', error);
            document.dispatchEvent(new CustomEvent('sync-status-change', {
                detail: { status: 'sync-error', message: 'Sync failed completely' }
            }));
            return { success: false, error };
        } finally {
            this.syncConfig.isSyncing = false;
        }
    },

    updateLastSyncTime: function () {
        this.syncConfig.lastSyncTime = new Date().toISOString();
        localStorage.setItem('lastSyncTime', this.syncConfig.lastSyncTime);
        try {
            localStorage.setItem('syncEvent', Date.now().toString());
        } catch (e) {
            console.error('Failed to notify other tabs about sync:', e);
        }

        document.dispatchEvent(new CustomEvent('last-sync-updated', {
            detail: { time: this.syncConfig.lastSyncTime }
        }));
    },

    getLastSyncTime: function () {
        return this.syncConfig.lastSyncTime;
    },

    registerBackgroundSync: async function () {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-snippets');
                console.log('Background sync registered');
                return true;
            } catch (error) {
                console.error('Background sync registration failed:', error);
                return false;
            }
        }
        return false;
    },

    syncWithServer: async function (snippet) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() < 0.9) {
                    resolve({ success: true, data: snippet });
                } else {
                    reject(new Error('Server error'));
                }
            }, 500);
        });
    }
};