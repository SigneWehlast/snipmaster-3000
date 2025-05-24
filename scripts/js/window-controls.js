const WindowManager = {
    displayMode: 'browser',
    wakeLock: null,

    init() {
        console.log('Window Manager initialized');

        this.detectDisplayMode();
        this.checkWindowControlsOverlay();
        this.setupEventListeners();
        this.setupUI();
    },
    setupEventListeners() {
        window.matchMedia('(display-mode:standalone)').addEventListener('change', () => {
        this.detectDisplayMode();
    });

if ('windowControlsOverlay' in navigator) {
    navigator.windowControlsOverlay.addEventListener('geometrychange',
        () => this.checkWindowControlsOverlay());
}

window.addEventListener('online', () =>
    this.updateConnectionStatus());
window.addEventListener('offline', () =>
    this.updateConnectionStatus());

window.addEventListener('appinstalled', () => {
    this.showStatusMessage('App installed successfully!');

    setTimeout(() => this.detectDisplayMode(), 1000);
});
},

setupUI() {
    this.addDisplayModeIndicator();

    if ('wakeLock' in navigator) {
        this.addWakeLockButton();
    }
},

addDisplayModeIndicator() {
    let statusBar = document.querySelector('.status-bar');
    if (!statusBar) {
        statusBar = document.createElement('div');
        statusBar.className = 'status-bar';
        document.body.appendChild(statusBar);
    }
    const displayModeIndicator = document.createElement('div');
    displayModeIndicator.id = 'display-mode-indicator';
    displayModeIndicator.className = 'status-indicator';
    displayModeIndicator.textContent = `Mode: ${this.displayMode}`;

    statusBar.appendChild(displayModeIndicator);
},

addWakeLockButton() {
    const toolbar = document.querySelector('.toolbar') ||
        document.querySelector('.app-header');
    if (!toolbar) return;

    const wakeLockBtn = document.createElement('button');
    wakeLockBtn.id = 'wake-lock-btn';
    wakeLockBtn.className = 'action-button';
    wakeLockBtn.title = 'Keep screen on';
    wakeLockBtn.innerHTML = '<span class="icon">👁 </span>';
    toolbar.appendChild(wakeLockBtn);

    wakeLockBtn.addEventListener('click', () => this.toggleWakeLock());
},

detectDisplayMode() {
    let newMode = 'browser';

    if (window.matchMedia('(display-mode: standalone)').matches) {
        newMode = 'standalone';
    } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
        newMode = 'fullscreen';
    } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        newMode = 'minimal-ui';
    } else if (window.matchMedia('(display-mode: window-controlsoverlay)').matches) {
        newMode = 'window-controls-overlay';
    }

    if (newMode !== this.displayMode) {
        this.displayMode = newMode;

        this.updateDisplayModeUI();
        console.log('Display mode changed:', this.displayMode);
    }

    return this.displayMode;
},

updateDisplayModeUI() {
    document.body.setAttribute('data-display-mode', this.displayMode);

    const indicator = document.getElementById('display-mode-indicator');
    if (indicator) {
        indicator.textContent = `Mode: ${this.displayMode}`;
    }

    this.showStatusMessage(`Display mode: ${this.displayMode}`);
},
checkWindowControlsOverlay() {
    if ('windowControlsOverlay' in navigator) {
        const wco = navigator.windowControlsOverlay;

        document.body.classList.toggle('wco-visible', wco.visible);

        if (wco.visible) {
            console.log('Window Controls Overlay is visible');
            console.log('Title bar area:', {
                x: wco.getTitlebarAreaRect().x,
                y: wco.getTitlebarAreaRect().y,
                width: wco.getTitlebarAreaRect().width,
                height: wco.getTitlebarAreaRect().height
            });

            this.adjustUIForWCO(true);
        } else {
            this.adjustUIForWCO(false);
        }

        return wco.visible;
    }

    return false;
},
adjustUIForWCO(isVisible) {

    const header = document.querySelector('.app-header');
    if (header) {
        if (isVisible) {
            const rect =
                navigator.windowControlsOverlay.getTitlebarAreaRect();

            header.style.position = 'fixed';
            header.style.left = `${rect.x}px`;
            header.style.top = `${rect.y}px`;
            header.style.width = `${rect.width}px`;
            header.style.height = `${rect.height}px`;
        } else {
            header.style.position = '';
            header.style.left = '';
            header.style.top = '';
            header.style.width = '';
            header.style.height = '';
        }
    }
},

 async toggleWakeLock() {
    if (!('wakeLock' in navigator)) {
        this.showStatusMessage('Wake Lock not supported in this browser',
            true);
        return false;
    }

    try {
        if (this.wakeLock) {
            await this.wakeLock.release();
            this.wakeLock = null;

            document.getElementById('wake-lockbtn')?.classList.remove('active');
            this.showStatusMessage('Screen can now time out normally');
        } else {
            this.wakeLock = await navigator.wakeLock.request('screen');

            document.getElementById('wake-lock-btn')?.classList.add('active');
            this.showStatusMessage('Screen will stay on while app is open');

            this.wakeLock.addEventListener('release', () => {
                document.getElementById('wake-lockbtn')?.classList.remove('active');
                this.wakeLock = null;
            });
        }

        return true;
    } catch (error) {
        console.error('Wake lock error:', error);
        this.showStatusMessage('Failed to toggle wake lock: ' +
            error.message, true);
        return false;
    }
},

updateConnectionStatus() {
    let statusElement = document.getElementById('connection-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'status-indicator';

        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            statusBar.appendChild(statusElement);
        } else {
            const newStatusBar = document.createElement('div');
            newStatusBar.className = 'status-bar';
            newStatusBar.appendChild(statusElement);
            document.body.appendChild(newStatusBar);
        }
    }
    if (navigator.onLine) {
        statusElement.innerHTML = '🟢 Online';
        statusElement.classList.remove('offline');
        statusElement.classList.add('online');
    } else {
        statusElement.innerHTML = '🔴 Offline';
        statusElement.classList.remove('online');
        statusElement.classList.add('offline');
    }
},

showStatusMessage(message, isError = false) {
    if (typeof showMessage === 'function') {
        showMessage(message, isError);
    } else {
        console.log(message);
    }
}
   };
document.addEventListener('DOMContentLoaded', () => {
    WindowManager.init();
});
window.WindowManager = WindowManager;
