const NotificationManager = {
    permission: Notification.permission,
    scheduledNotifications: [],
    init() {
        console.log('Notification Manager initialized');
        console.log('Current permission:', this.permission);

        this.setupNotificationUI();
    },
    setupNotificationUI() {
        if (this.permission !== 'granted' && this.permission !== 'denied') {
            this.addPermissionButton();
        }
    },

    //der vises en knap til at tillade notifikationer
    addPermissionButton() {
        if (document.getElementById('notification-permission-btn')) {
            return;
        }
        const permissionBtn = document.createElement('button');
        permissionBtn.id = 'notification-permission-btn';
        permissionBtn.textContent = 'Enable Notifications';
        permissionBtn.className = 'permission-btn';
        permissionBtn.addEventListener('click', () =>
            this.requestPermission());

        const targetElement = document.querySelector('.sidebar-header') ||
            document.querySelector('.app-header');
        if (targetElement) {
            targetElement.appendChild(permissionBtn);
        }
    },

    //spørger om tilladelse til at sende notifikationer
    async requestPermission() {
        try {
            this.permission = await Notification.requestPermission();

            if (this.permission === 'granted') {
                const permissionBtn = document.getElementById('notification-permission-btn');
                if (permissionBtn) {
                    permissionBtn.remove();
                }

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

    //viser notifikationerne
    async showNotification(title, body, options = {}) {
        if (this.permission !== 'granted') {
            const newPermission = await this.requestPermission();
            if (newPermission !== 'granted') {
                return false;
            }
        }

        const notificationOptions = {
            body: body,
            icon: '/icons/icon-192.png',
            ...options
        };

        try {
            const notification = new Notification(title, notificationOptions);

            notification.onclick = () => {
                window.focus();
                notification.close();

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

    //avancerede notifikationer, som anvender service workeren
    async showAdvancedNotification(title, body, actions = []) {
        if (this.permission !== 'granted') {
            const newPermission = await this.requestPermission();
            if (newPermission !== 'granted') {
                return false;
            }
        }

        try {
            if (!('serviceWorker' in navigator)) {
                return this.showNotification(title, body);
            }

            const registration = await navigator.serviceWorker.ready;

            await registration.showNotification(title, {
                body: body,
                icon: '/icons/icon-192.png',
                actions: actions,
            });
            return true;
        } catch (error) {
            console.error('Error showing advanced notification:', error);

            return this.showNotification(title, body);
        }
    },

    scheduleNotification(title, body, delayMinutes = 5) {
        if (isNaN(delayMinutes) || delayMinutes < 1) {
            this.showStatusMessage('Invalid delay time', true);
            return;
        }

        const delayMs = delayMinutes * 60 * 1000;

        const timerId = setTimeout(() => {
            this.showNotification(title, body);
        }, delayMs);

        this.scheduledNotifications.push(timerId);

        this.showStatusMessage(`Notification scheduled for ${delayMinutes} minutes from now`);

        return timerId;
    },

    handleNotificationAction(action, data = {}) {
        switch (action) {
            case 'openSnippet':
                if (data.snippetId) {
                    if (typeof loadSnippet === 'function') {
                        loadSnippet(data.snippetId);
                    }
                }
                break;

            case 'newSnippet':
                if (typeof createNewSnippet === 'function') {
                    createNewSnippet();
                } else {
                    const newButton = document.getElementById('newSnippetBtn');
                    if (newButton) newButton.click();
                }
                break;

            default:
                console.log('Unhandled notification action:', action);
                break;
        }
    },

    showStatusMessage(message, isError = false) {
        if (typeof showMessage === 'function') {
            showMessage(message, isError);
        } else {
            if (isError) {
                console.error(message);
            } else {
                console.log(message);
            }
        }
    },

    //rydder planlagte notifikationer, kaldes når siden lukkes
    cleanup() {
        this.scheduledNotifications.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.scheduledNotifications = [];
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NotificationManager.init();
});

window.NotificationManager = NotificationManager;
