const SyncUI = {
    APP_STATES: {
        ONLINE: 'online',
        OFFLINE: 'offline',
        SYNCING: 'syncing',
        SYNC_ERROR: 'sync-error',
        SYNC_SUCCESS: 'sync-success'
    },

    elements: {
        statusContainer: null,
        syncButton: null,
        lastSyncTime: null,
        offlineBanner: null
    },

    currentState: null,

    init: function () {
        this.createStatusContainer();
        this.createSyncButton();
        this.createLastSyncTimeDisplay();
        this.createOfflineBanner();

        this.setupEventListeners();

        this.updateAppState(navigator.onLine ? this.APP_STATES.ONLINE : this.APP_STATES.OFFLINE);
    },

    createStatusContainer: function () {
        let container = document.getElementById('app-status-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'app-status-container';
            document.body.appendChild(container);
        }
        this.elements.statusContainer = container;
    },

    createSyncButton: function () {
        const header = document.querySelector('.app-header');
        if (!header) return;

        const syncButton = document.createElement('button');
        syncButton.id = 'sync-button';
        syncButton.className = 'sync-button online-only';
        syncButton.innerHTML = '🔄 Sync Now';

        header.appendChild(syncButton);
        this.elements.syncButton = syncButton;
    },

    createLastSyncTimeDisplay: function () {
        const syncTimeElement = document.createElement('div');
        syncTimeElement.id = 'last-sync-time';
        syncTimeElement.className = 'last-sync-time';

        const header = document.querySelector('.app-header');
        if (header) {
            header.appendChild(syncTimeElement);
        }

        this.elements.lastSyncTime = syncTimeElement;

        this.updateLastSyncTimeDisplay();
    },

    createOfflineBanner: function () {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'offline-banner show-when-offline';
        banner.innerHTML = `
            <div class="offline-content">
                <div class="offline-icon">📴</div>
                <div class="offline-message">
                    <h3>You're working offline</h3>
                    <p>Changes will be saved and synced when you reconnect.</p>
                </div>
            </div>
        `;

        document.body.insertBefore(banner, document.body.firstChild);
        this.elements.offlineBanner = banner;
    },

    setupEventListeners: function () {
        window.addEventListener('online', this.handlers.onlineStatusChange.bind(this));
        window.addEventListener('offline', this.handlers.offlineStatusChange.bind(this));

        if (this.elements.syncButton) {
            this.elements.syncButton.addEventListener('click', this.handlers.syncButtonClick.bind(this));
        }

        document.addEventListener('sync-status-change', this.handlers.syncStatusChange.bind(this));
        
        document.addEventListener('last-sync-updated', this.handlers.lastSyncUpdated.bind(this));
    },

    updateAppState: function (newState, message = '') {
        const statusContainer = this.elements.statusContainer;
        if (!statusContainer) return;

        this.currentState = newState;
        statusContainer.innerHTML = '';
        const statusElement = document.createElement('div');
        statusElement.className = `app-status ${newState}`;
        let icon = '', defaultMessage = '';

        switch (newState) {
            case this.APP_STATES.ONLINE:
                icon = '🟢 ';
                defaultMessage = 'Online - All changes saved';
                break;
            case this.APP_STATES.OFFLINE:
                icon = '🔴 ';
                defaultMessage = 'Offline - Changes will sync when online';
                break;
            case this.APP_STATES.SYNCING:
                icon = '🔄 ';
                defaultMessage = 'Syncing changes...';
                break;
            case this.APP_STATES.SYNC_ERROR:
                icon = '⚠ ';
                defaultMessage = 'Sync error - Will retry later';
                break;
            case this.APP_STATES.SYNC_SUCCESS:
                icon = '✅ ';
                defaultMessage = 'All changes synced successfully';
                break;
        }

        statusElement.innerHTML = `
            <span class="status-icon">${icon}</span>
            <span class="status-message">${message || defaultMessage}</span>
        `;

        statusContainer.appendChild(statusElement);

        if (newState === this.APP_STATES.SYNC_SUCCESS) {
            setTimeout(() => {
                this.updateAppState(this.APP_STATES.ONLINE);
            }, 3000);
        }

        document.body.className = `app-state-${newState}`;
    },

    updateLastSyncTimeDisplay: function () {
        const timeElement = this.elements.lastSyncTime;
        if (!timeElement) return;

        const lastSyncTime = SnippetStorage.getLastSyncTime();

        if (lastSyncTime) {
            const syncDate = new Date(lastSyncTime);
            const now = new Date();
            const diffMinutes = Math.floor((now - syncDate) / (1000 * 60));

            let timeText = '';
            if (diffMinutes < 1) {
                timeText = 'just now';
            } else if (diffMinutes < 60) {
                timeText = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
            } else if (diffMinutes < 1440) {
                const hours = Math.floor(diffMinutes / 60);
                timeText = `${hours} hour${hours === 1 ? '' : 's'} ago`;
            } else {
                timeText = syncDate.toLocaleDateString() + ' ' +
                    syncDate.toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit' });
            }

            timeElement.textContent = `Last synced: ${timeText}`;
            timeElement.style.display = 'block';
        } else {
            timeElement.textContent = 'Never synced';
            timeElement.style.display = 'block';
        }
    },

    handlers: {
        onlineStatusChange: function () {
            if (navigator.onLine) {
                this.updateAppState(this.APP_STATES.ONLINE);

                SnippetStorage.registerBackgroundSync().then(registered => {
                    if (!registered) {
                        this.handlers.syncButtonClick.call(this);
                    }
                }).catch(error => {
                    console.error('Background sync failed:', error);
                    this.handlers.syncButtonClick.call(this); 
                });
            }
        },

        offlineStatusChange: function () {
            if (!navigator.onLine) {
                this.updateAppState(this.APP_STATES.OFFLINE);
            }
        },

        syncButtonClick: async function () {
            this.updateAppState(this.APP_STATES.SYNCING, 'Starting sync...');

            try {
                const result = await SnippetStorage.syncAll();

                await SnippetUI.renderSnippets();

            } catch (error) {
                console.error('Error during manual sync:', error);
                this.updateAppState(this.APP_STATES.SYNC_ERROR, 'Sync failed');
            }
        },

        syncStatusChange: function (event) {
            const { status, message } = event.detail;
            this.updateAppState(status, message);
        },

        lastSyncUpdated: function (event) {
            this.updateLastSyncTimeDisplay();
        }
    }
};