const WindowManager = {
    // Current display mode
    displayMode: 'browser',

    // Wake lock instance
    wakeLock: null,

    // Initialization
    init() {
        console.log('Window Manager initialized');

        // Check initial display mode
        this.detectDisplayMode();

        // Check for window controls overlay
        this.checkWindowControlsOverlay();

        // Set up event listeners
        this.setupEventListeners();

        // Add UI controls if needed
        this.setupUI();
    },
    setupEventListeners() {
        // Listen for display mode changes
        window.matchMedia('(display-mode:standalone)').addEventListener('change', () => {
        this.detectDisplayMode();
    });

// Listen for window controls overlay changes
if ('windowControlsOverlay' in navigator) {
    navigator.windowControlsOverlay.addEventListener('geometrychange',
        () => this.checkWindowControlsOverlay());
}

// Listen for online/offline events
window.addEventListener('online', () =>
    this.updateConnectionStatus());
window.addEventListener('offline', () =>
    this.updateConnectionStatus());

// Listen for app installation
window.addEventListener('appinstalled', () => {
    this.showStatusMessage('App installed successfully!');

    // Check display mode after short delay
    setTimeout(() => this.detectDisplayMode(), 1000);
});
},

/**
* Add UI elements for window controls
*/
setupUI() {
    // Add display mode indicator
    this.addDisplayModeIndicator();

    // Add wake lock button if supported
    if ('wakeLock' in navigator) {
        this.addWakeLockButton();
    }
},

/**
* Add display mode indicator to UI
*/
addDisplayModeIndicator() {
    // Create or get status bar
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

/**
* Add wake lock button
*/
addWakeLockButton() {
    // Find toolbar
    const toolbar = document.querySelector('.toolbar') ||
        document.querySelector('.app-header');
    if (!toolbar) return;

    // Create button
    const wakeLockBtn = document.createElement('button');
    wakeLockBtn.id = 'wake-lock-btn';
    wakeLockBtn.className = 'action-button';
    wakeLockBtn.title = 'Keep screen on';
    wakeLockBtn.innerHTML = '<span class="icon">👁 </span>';
    toolbar.appendChild(wakeLockBtn);

    // Add click listener
    wakeLockBtn.addEventListener('click', () => this.toggleWakeLock());
},

/**
* Detect current display mode
*/
detectDisplayMode() {
    let newMode = 'browser';

    // Check various display modes
    if (window.matchMedia('(display-mode: standalone)').matches) {
        newMode = 'standalone';
    } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
        newMode = 'fullscreen';
    } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        newMode = 'minimal-ui';
    } else if (window.matchMedia('(display-mode: window-controlsoverlay)').matches) {
        newMode = 'window-controls-overlay';
    }

    // Update if changed
    if (newMode !== this.displayMode) {
        this.displayMode = newMode;

        // Update UI
        this.updateDisplayModeUI();
        console.log('Display mode changed:', this.displayMode);
    }

    return this.displayMode;
},

/**
* Update UI to reflect current display mode
*/
updateDisplayModeUI() {
    // Add display mode attribute to body
    document.body.setAttribute('data-display-mode', this.displayMode);

    // Update indicator if exists
    const indicator = document.getElementById('display-mode-indicator');
    if (indicator) {
        indicator.textContent = `Mode: ${this.displayMode}`;
    }

    // Show message about mode change
    this.showStatusMessage(`Display mode: ${this.displayMode}`);
},
checkWindowControlsOverlay() {
    if ('windowControlsOverlay' in navigator) {
        const wco = navigator.windowControlsOverlay;

        // Update body class based on WCO visibility
        document.body.classList.toggle('wco-visible', wco.visible);

        if (wco.visible) {
            console.log('Window Controls Overlay is visible');
            console.log('Title bar area:', {
                x: wco.getTitlebarAreaRect().x,
                y: wco.getTitlebarAreaRect().y,
                width: wco.getTitlebarAreaRect().width,
                height: wco.getTitlebarAreaRect().height
            });

            // Adjust UI for WCO when visible
            this.adjustUIForWCO(true);
        } else {
            // Reset UI when WCO not visible
            this.adjustUIForWCO(false);
        }

        return wco.visible;
    }

    return false;
},
adjustUIForWCO(isVisible) {
    // This function should be customized based on your app's UI
    // Example: adjust header layout
    const header = document.querySelector('.app-header');
    if (header) {
        if (isVisible) {
            // Get title bar rect
            const rect =
                navigator.windowControlsOverlay.getTitlebarAreaRect();

            // Style header to fit in title bar area
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

 /**
 * Toggle screen wake lock
 */
 async toggleWakeLock() {
    // If wake lock not supported, show message and exit
    if (!('wakeLock' in navigator)) {
        this.showStatusMessage('Wake Lock not supported in this browser',
            true);
        return false;
    }

    try {
        if (this.wakeLock) {
            // Release the wake lock
            await this.wakeLock.release();
            this.wakeLock = null;

            // Update UI
            document.getElementById('wake-lockbtn')?.classList.remove('active');
            this.showStatusMessage('Screen can now time out normally');
        } else {
            this.wakeLock = await navigator.wakeLock.request('screen');

            // Update UI
            document.getElementById('wake-lock-btn')?.classList.add('active');
            this.showStatusMessage('Screen will stay on while app is open');

            // Add release listener
            this.wakeLock.addEventListener('release', () => {
                // Update UI when wake lock is released
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

/**
* Update connection status indicator
*/
updateConnectionStatus() {
    // Create status element if it doesn't exist
    let statusElement = document.getElementById('connection-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'status-indicator';

        const statusBar = document.querySelector('.status-bar');
        if (statusBar) {
            statusBar.appendChild(statusElement);
        } else {
            // Create status bar if it doesn't exist
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

/**
* Show status message
* @param {string} message - Message to show
* @param {boolean} isError - Whether this is an error message
*/
showStatusMessage(message, isError = false) {
    // Use app's status message function if available
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
// Make it available globally
window.WindowManager = WindowManager;
