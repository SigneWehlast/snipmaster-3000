const KeyboardManager = {
    shortcuts: {},

    helpDialogVisible: false,

    init() {
        console.log('Keyboard Manager initialized');

        this.setupListeners();
        this.registerDefaultShortcuts();

        this.createHelpDialog();
    },
    setupListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    },
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

    registerDefaultShortcuts() {
        this.registerShortcut('showHelp', {
            key: 'F1',
            description: 'Show keyboard shortcuts help',
            handler: () => this.toggleHelpDialog(),
            showIndicator: true
        });

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

        this.registerShortcut('newSnippet', {
            key: 'n',
            ctrl: true,
            description: 'Create new snippet',
            handler: () => {
                if (typeof createNewSnippet === 'function') {
                    createNewSnippet();
                } else {
                    const newBtn = document.getElementById('newSnippetBtn');
                    if (newBtn) newBtn.click();
                }
            }
        });

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
    handleKeyPress(e) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) &&
            e.key !== 'F1' && e.key !== 'Escape') {
            return;
        }

        for (const id in this.shortcuts) {
            const shortcut = this.shortcuts[id];
            if (this.matchesShortcut(e, shortcut)) {
                e.preventDefault();

                if (shortcut.showIndicator) {
                    this.showShortcutIndicator(shortcut);
                }
                shortcut.handler();
                return;
            }
        }
    },
    matchesShortcut(e, shortcut) {
        return e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            e.ctrlKey === shortcut.ctrl &&
            e.shiftKey === shortcut.shift &&
            e.altKey === shortcut.alt;
    },
    showShortcutIndicator(shortcut) {
        let indicator = document.getElementById('shortcut-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'shortcut-indicator';
            document.body.appendChild(indicator);
        }

        let keysText = '';
        if (shortcut.ctrl) keysText += '<span class="key">Ctrl</span> + ';
        if (shortcut.shift) keysText += '<span class="key">Shift</span> + ';
        if (shortcut.alt) keysText += '<span class="key">Alt</span> + ';
        keysText += `<span class="key">${shortcut.key}</span>`;

        indicator.innerHTML = `
        <div class="shortcut-keys">${keysText}</div>
        <div class="shortcut-description">${shortcut.description}</div>`;
        indicator.classList.add('visible');

        setTimeout(() => {
            indicator.classList.remove('visible');
        }, 2000);
    },
    createHelpDialog() {
        if (document.getElementById('keyboard-help-dialog')) {
            return;
        }

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

        dialog.querySelector('.close-btn').addEventListener('click', () => {
            this.toggleHelpDialog();
        });

        this.updateHelpDialog();
    },

    updateHelpDialog() {
        const table = document.querySelector('#shortcuts-table tbody');
        if (!table) return;
        table.innerHTML = '';

        for (const id in this.shortcuts) {
            const shortcut = this.shortcuts[id];

            let keysHtml = '';
            if (shortcut.ctrl) keysHtml += '<span class="key">Ctrl</span> + ';
            if (shortcut.shift) keysHtml += '<span class="key">Shift</span> + ';
            if (shortcut.alt) keysHtml += '<span class="key">Alt</span> + ';
            keysHtml += `<span class="key">${shortcut.key}</span>`;

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
    closeAllDialogs() {
        if (this.helpDialogVisible) {
            this.toggleHelpDialog();
        }

        document.querySelectorAll('.dialog').forEach(dialog => {
            if (dialog.id !== 'keyboard-help-dialog' && dialog.style.display !== 'none') {
                dialog.style.display = 'none';
            }
        });
    },
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
};
    document.addEventListener('DOMContentLoaded', () => {
        KeyboardManager.init();
    });
    window.KeyboardManager = KeyboardManager;
