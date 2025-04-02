const KeyboardManager = {
    // Registered shortcuts
    shortcuts: {},

    // Help dialog state
    helpDialogVisible: false,

    // Initialize
    init() {
        console.log('Keyboard Manager initialized');

        // Set up global keyboard listeners
        this.setupListeners();
        this.registerDefaultShortcuts();

        // Create help dialog
        this.createHelpDialog();
    },

    /**
    * Set up keyboard event listeners
    */
    setupListeners() {
        // Global keydown handler
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    },

    /**
    * Register a keyboard shortcut
    * @param {string} id - Shortcut identifier
    * @param {Object} shortcut - Shortcut configuration
    */
    registerShortcut(id, shortcut) {
        this.shortcuts[id] = {
            key: shortcut.key,
            ctrl: shortcut.ctrl || false,
            shift: shortcut.shift || false,
            alt: shortcut.alt || false,
            description: shortcut.description || '',
            handler: shortcut.handler,
            showIndicator: shortcut.showIndicator !== false
        };
        this.updateHelpDialog();
    },

    /**
    * Register default application shortcuts
    */
    registerDefaultShortcuts() {
        // Show help dialog
        this.registerShortcut('showHelp', {
            key: 'F1',
            description: 'Show keyboard shortcuts help',
            handler: () => this.toggleHelpDialog(),
            showIndicator: true
        });

        // Save snippet
        this.registerShortcut('saveSnippet', {
            key: 's',
            ctrl: true,
            description: 'Save current snippet',
            handler: () => {
                if (typeof saveSnippet === 'function') {
                    saveSnippet();
                }
            }
        });

        // New snippet
        this.registerShortcut('newSnippet', {
            key: 'n',
            ctrl: true,
            description: 'Create new snippet',
            handler: () => {
                // Either call the function or click the button
                if (typeof createNewSnippet === 'function') {
                    createNewSnippet();
                } else {
                    const newBtn = document.getElementById('newSnippetBtn');
                    if (newBtn) newBtn.click();
                }
            }
        });

        // Toggle fullscreen
        this.registerShortcut('toggleFullscreen', {
            key: 'f',
            ctrl: true,
            shift: true,
            description: 'Toggle fullscreen mode',
            handler: () => this.toggleFullscreen()
        });

        this.registerShortcut('closeDialogs', {
            key: 'Escape',
            description: 'Close dialogs',
            handler: () => this.closeAllDialogs(),
            showIndicator: false
        });
    },

    /**
    * Handle keyboard events
    * @param {KeyboardEvent} e - Keyboard event
    */
    handleKeyPress(e) {
        // Skip if in text fields unless it's a global shortcut
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) &&
            e.key !== 'F1' && e.key !== 'Escape') {
            return;
        }

        // Check each registered shortcut
        for (const id in this.shortcuts) {
            const shortcut = this.shortcuts[id];
            // Check if shortcut matches
            if (this.matchesShortcut(e, shortcut)) {
                e.preventDefault();

                // Show indicator if enabled
                if (shortcut.showIndicator) {
                    this.showShortcutIndicator(shortcut);
                }

                // Call handler
                shortcut.handler();
                return;
            }
        }
    },

    /**
    * Check if event matches shortcut
    * @param {KeyboardEvent} e - Keyboard event
    * @param {Object} shortcut - Shortcut to check
    * @returns {boolean} Whether the event matches the shortcut
    */
    matchesShortcut(e, shortcut) {
        return e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            e.ctrlKey === shortcut.ctrl &&
            e.shiftKey === shortcut.shift &&
            e.altKey === shortcut.alt;
    },
    showShortcutIndicator(shortcut) {
        // Create or get indicator element
        let indicator = document.getElementById('shortcut-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'shortcut-indicator';
            document.body.appendChild(indicator);
        }

        // Format shortcut keys for display
        let keysText = '';
        if (shortcut.ctrl) keysText += '<span class="key">Ctrl</span> + ';
        if (shortcut.shift) keysText += '<span class="key">Shift</span> + ';
        if (shortcut.alt) keysText += '<span class="key">Alt</span> + ';
        keysText += `<span class="key">${shortcut.key}</span>`;

        // Set content
        indicator.innerHTML = `
        <div class="shortcut-keys">${keysText}</div>
        <div class="shortcut-description">${shortcut.description}</div>`;
        indicator.classList.add('visible');

        // Hide after delay
        setTimeout(() => {
            indicator.classList.remove('visible');
        }, 2000);
    },

    /**
    * Create keyboard shortcut help dialog
    */
    createHelpDialog() {
        // Check if dialog already exists
        if (document.getElementById('keyboard-help-dialog')) {
            return;
        }

        // Create dialog
        const dialog = document.createElement('div');
        dialog.id = 'keyboard-help-dialog';
        dialog.className = 'dialog';
        dialog.innerHTML = `
 <div class="dialog-header">
 <h3>Keyboard Shortcuts</h3>
 <button class="close-btn">&times;</button>
 </div>
 <div class="dialog-content">
 <table class="shortcut-table" id="shortcuts-table">
 <tbody></tbody>
 </table>
 </div>
 `;
        document.body.appendChild(dialog);

        // Add event listener to close button
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            this.toggleHelpDialog();
        });

        // Update with registered shortcuts
        this.updateHelpDialog();
    },

    /**
    * Update help dialog with registered shortcuts
    */
    updateHelpDialog() {
        const table = document.querySelector('#shortcuts-table tbody');
        if (!table) return;
        table.innerHTML = '';

        // Add shortcuts
        for (const id in this.shortcuts) {
            const shortcut = this.shortcuts[id];

            // Format keys for display
            let keysHtml = '';
            if (shortcut.ctrl) keysHtml += '<span class="key">Ctrl</span> + ';
            if (shortcut.shift) keysHtml += '<span class="key">Shift</span> + ';
            if (shortcut.alt) keysHtml += '<span class="key">Alt</span> + ';
            keysHtml += `<span class="key">${shortcut.key}</span>`;

            // Create row
            const row = document.createElement('tr');
            row.innerHTML = `
 <td>${keysHtml}</td>
 <td>${shortcut.description}</td>
 `;

            table.appendChild(row);
        }
    },
    toggleHelpDialog() {
        const dialog = document.getElementById('keyboard-help-dialog');
        if (!dialog) return;

        if (this.helpDialogVisible) {
            dialog.style.display = 'none';
            this.helpDialogVisible = false;
        } else {
            dialog.style.display = 'block';
            this.helpDialogVisible = true;
        }
    },

    /**
    * Close all dialogs
    */
    closeAllDialogs() {
        // Close help dialog if open
        if (this.helpDialogVisible) {
            this.toggleHelpDialog();
        }

        // Close any other dialogs with .dialog class
        document.querySelectorAll('.dialog').forEach(dialog => {
            if (dialog.id !== 'keyboard-help-dialog' && dialog.style.display !== 'none') {
                dialog.style.display = 'none';
            }
        });
    },

    /**
    * Toggle fullscreen mode
    */
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
};
// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    KeyboardManager.init();
});
window.KeyboardManager = KeyboardManager;
