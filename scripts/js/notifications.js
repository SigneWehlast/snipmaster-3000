const NotificationManager = {
    // Current permission status
    permission: Notification.permission,
    // Store scheduled notification timers
    scheduledNotifications: [],

    /**
     * Initialize notifications module
     */
    init() {
        console.log('Notification Manager initialized');
        console.log('Current permission:', this.permission);

        // Check if notification UI elements exist and set up listeners
        this.setupNotificationUI();
    },

    /**
     * Set up UI elements for notifications
     */
    setupNotificationUI() {
        // Add notification permission request button if needed
        if (this.permission !== 'granted' && this.permission !== 'denied') {
            this.addPermissionButton();
        }
    },

    addPermissionButton() {
        // Check if button already exists
        if (document.getElementById('notification-permission-btn')) {
            return;
        }

        // Create permission button
        const permissionBtn = document.createElement('button');
        permissionBtn.id = 'notification-permission-btn';
        permissionBtn.textContent = 'Enable Notifications';
        permissionBtn.className = 'permission-btn';
        permissionBtn.addEventListener('click', () =>
            this.requestPermission());

        // Add to UI - adjust selector based on your app structure
        const targetElement = document.querySelector('.sidebar-header') ||
            document.querySelector('.app-header');
        if (targetElement) {
            targetElement.appendChild(permissionBtn);
        }
    },

    /**
     * Request notification permission
     */
    async requestPermission() {
        try {
            this.permission = await Notification.requestPermission();

            // Handle permission result
            if (this.permission === 'granted') {
                // Remove the permission button
                const permissionBtn = document.getElementById('notification-permission-btn');
                if (permissionBtn) {
                    permissionBtn.remove();
                }

                // Show success message
                this.showStatusMessage('Notifications enabled!');
            } else {
                this.showStatusMessage('Notification permission denied', true);
            }

            return this.permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showStatusMessage('Error requesting permission', true);
        }
    },

    async showNotification(title, body, options = {}) {
        // Check permission
        if (this.permission !== 'granted') {
            const newPermission = await this.requestPermission();
            if (newPermission !== 'granted') {
                return false;
            }
        }

        // Default options
        const notificationOptions = {
            body: body,
            icon: '/icons/icon-192.png',
            ...options
        };

        try {
            // Create notification
            const notification = new Notification(title, notificationOptions);

            // Add click handler
            notification.onclick = () => {
                window.focus();
                notification.close();

                // Handle action if specified
                if (options.action && typeof this.handleNotificationAction === 'function') {
                    this.handleNotificationAction(options.action);
                }
            };

            return true;
        } catch (error) {
            console.error('Error showing notification:', error);
            return false;
        }
    },

    async showAdvancedNotification(title, body, actions = []) {
        // Check permission
        if (this.permission !== 'granted') {
            const newPermission = await this.requestPermission();
            if (newPermission !== 'granted') {
                return false;
            }
        }

        try {
            // Check for service worker support
            if (!('serviceWorker' in navigator)) {
                // Fall back to basic notification
                return this.showNotification(title, body);
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Show notification with actions
            await registration.showNotification(title, {
                body: body,
                icon: '/icons/icon-192.png',
                actions: actions,
            });
            return true;
        } catch (error) {
            console.error('Error showing advanced notification:', error);

            // Try falling back to basic notification
            return this.showNotification(title, body);
        }
    },

    scheduleNotification(title, body, delayMinutes = 5) {
        // Validate delay
        if (isNaN(delayMinutes) || delayMinutes < 1) {
            this.showStatusMessage('Invalid delay time', true);
            return;
        }

        // Convert to milliseconds
        const delayMs = delayMinutes * 60 * 1000;

        // Set timeout
        const timerId = setTimeout(() => {
            this.showNotification(title, body);
        }, delayMs);

        // Store timer ID for potential cancellation
        this.scheduledNotifications.push(timerId);

        // Show confirmation
        this.showStatusMessage(`Notification scheduled for ${delayMinutes} minutes from now`);

        return timerId;
    },

    handleNotificationAction(action, data = {}) {
        switch (action) {
            case 'openSnippet':
                if (data.snippetId) {
                    // Call your app's function to load a snippet
                    if (typeof loadSnippet === 'function') {
                        loadSnippet(data.snippetId);
                    }
                }
                break;

            case 'newSnippet':
                // Call your app's function to create a new snippet
                if (typeof createNewSnippet === 'function') {
                    createNewSnippet();
                } else {
                    // Fallback - click the new snippet button
                    const newButton = document.getElementById('newSnippetBtn');
                    if (newButton) newButton.click();
                }
                break;

            default:
                console.log('Unhandled notification action:', action);
                break;
        }
    },

    /**
     * Show status message to user
     * @param {string} message - Message to show
     * @param {boolean} isError - Whether this is an error message
     */
    showStatusMessage(message, isError = false) {
        // Use the app's status message function if available
        if (typeof showMessage === 'function') {
            showMessage(message, isError);
        } else {
            // Simple alert fallback
            if (isError) {
                console.error(message);
            } else {
                console.log(message);
            }
        }
    },

    cleanup() {
        this.scheduledNotifications.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.scheduledNotifications = [];
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    NotificationManager.init();
});

// Make it available globally
window.NotificationManager = NotificationManager;
