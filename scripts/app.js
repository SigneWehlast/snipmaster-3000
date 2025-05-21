// Import all modules
import { registerServiceWorker } from './js/serviceWorker.js';
import { SnippetManager } from './js/snippetManager.js';
import { CodePreview } from './js/preview.js';
import { ConnectionStatus } from './js/connectionStatus.js';
import { PWAInstallation } from './js/pwaInstall.js';
import { FileHandler } from './js/fileHandler.js';
import { ProtocolHandler } from './js/protocolHandler.js';
import { FileSystem } from './js/file-system.js';

// Registrer service worker
registerServiceWorker();

// Initialiser snippetManager udenfor DOMContentLoaded
let snippetManager;

function showMessage(message, isError = false) {
    let statusElement = document.getElementById('status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'status-message';
        document.body.appendChild(statusElement);
    }

    statusElement.textContent = message;
    statusElement.className = isError ? 'error' : '';
    statusElement.style.display = 'block';

    if (statusElement.timeout) {
        clearTimeout(statusElement.timeout);
    }
    statusElement.timeout = setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

window.showMessage = showMessage;

document.addEventListener('DOMContentLoaded', async function () {
    try {
        await SnippetStorage.migrateFromLocalStorage();

        await SnippetUI.init();
        SyncUI.init();

        console.log('SnipMaster 3000 initialized successfully');

        const codeEditor = document.getElementById('codeEditor');
        const languageSelect = document.getElementById('languageSelect');
        const saveBtn = document.getElementById('saveBtn');
        const newSnippetBtn = document.getElementById('newSnippetBtn');
        const saveFileBtn = document.getElementById('saveFileBtn');

        snippetManager = new SnippetManager();
        const codePreview = new CodePreview(codeEditor, languageSelect);
        const connectionStatus = new ConnectionStatus();
        const pwaInstallation = new PWAInstallation();
        const fileHandler = new FileHandler(codePreview);
        const protocolHandler = new ProtocolHandler(snippetManager);

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                console.log('Save button clicked');
                snippetManager.saveSnippet();
            });
        }

        if (newSnippetBtn) {
            newSnippetBtn.addEventListener('click', () => {
                console.log('New Snippet button clicked');
                snippetManager.createNewSnippet();
            });
        }

        if (saveFileBtn) {
            saveFileBtn.addEventListener('click', () => {
                console.log('Save file button clicked');
                handleSaveFile();
            });
        }

        snippetManager.displaySnippets();
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

function handleSaveFile() {
    const codeEditor = document.getElementById('codeEditor');
    const languageSelect = document.getElementById('languageSelect');

    if (!codeEditor || !languageSelect) {
        showMessage('Editor not found', true);
        return;
    }

    const content = codeEditor.value;
    const language = languageSelect.value;
    let suggestedName = 'snippet';

    if (snippetManager && snippetManager.currentSnippetId) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const currentSnippet = snippets.find(s => s.id === snippetManager.currentSnippetId);

        if (currentSnippet && currentSnippet.name) {
            suggestedName = currentSnippet.name;
        }
    } else {
        console.warn('No current snippet selected or snippetManager is not initialized properly');
    }

    const languageToExtension = {
        'javascript': '.js',
        'html': '.html',
        'css': '.css',
        'plaintext': '.txt'
    };

    const extension = languageToExtension[language] || '.txt';

    if (!suggestedName.endsWith(extension)) {
        suggestedName += extension;
    }

    if (typeof FileSystem !== 'undefined' && typeof FileSystem.saveToFile === 'function') {
        FileSystem.saveToFile({
            content,
            language,
            suggestedName,
            onSuccess: (fileName) => {
                showMessage(`Saved to ${fileName} successfully!`);
            },
            onError: (error) => {
                showMessage(`Error: ${error}`, true);
            }
        });
    } else {
        console.error('FileSystem API is not available or not supported.');
    }
}

function saveSnippet() {
    const snippetName = getCurrentSnippetName() || 'Snippet';

    NotificationManager.showNotification(
        'Snippet Saved',
        `Your snippet "${snippetName}" has been saved`,
        {
            action: 'openSnippet',
            snippetId: currentSnippetId
        }
    );
}

function getCurrentSnippetName() {
    if (!currentSnippetId) return null;

    const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
    const currentSnippet = snippets.find(s => s.id === currentSnippetId);

    return currentSnippet ? (currentSnippet.name || `Snippet ${currentSnippet.language}`) : null;
}

function displaySnippets() {
    document.querySelectorAll('.snippet-item').forEach(item => {
        if (!item.querySelector('.reminder-btn')) {
            const reminderBtn = document.createElement('button');
            reminderBtn.className = 'reminder-btn';
            reminderBtn.title = 'Set reminder for this snippet';
            reminderBtn.innerHTML = '<span class="icon">⏰ </span>';
            reminderBtn.dataset.id = item.dataset.id;

            let actionsSection = item.querySelector('.snippet-actions');
            if (!actionsSection) {
                actionsSection = document.createElement('div');
                actionsSection.className = 'snippet-actions';
                item.appendChild(actionsSection);
            }

            actionsSection.appendChild(reminderBtn);

            reminderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                setReminderForSnippet(item.dataset.id);
            });
        }
    });
}

function setReminderForSnippet(snippetId) {
    const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
    const snippet = snippets.find(s => s.id === snippetId);

    if (!snippet) {
        showMessage('Snippet not found', true);
        return;
    }

    const minutes = prompt('Set reminder in minutes:', '30');

    if (minutes && !isNaN(minutes)) {
        const snippetName = snippet.name || `Snippet ${snippet.language}`;

        NotificationManager.scheduleNotification(
            'Snippet Reminder',
            `Don't forget to work on "${snippetName}"`,
            parseInt(minutes)
        );
    }
}

function registerAppShortcuts() {
    if (!window.KeyboardManager) {
        console.error('Keyboard Manager not loaded');
        return;
    }

    KeyboardManager.registerShortcut('loadFile', {
        key: 'o',
        ctrl: true,
        description: 'Load file from disk',
        handler: () => {
            if (window.FileSystem && typeof FileSystem.loadFromFile === 'function') {
                FileSystem.loadFromFile({
                    onSuccess: (file) => {
                        showMessage(`Loaded ${file.name}`);
                    },
                    onError: (error) => {
                        showMessage(`Error loading file: ${error}`, true);
                    }
                });
            }
        }
    });

    KeyboardManager.registerShortcut('saveFile', {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Save to file',
        handler: () => {
            const editor = document.getElementById('codeEditor');
            const language = document.getElementById('languageSelect')?.value || 'javascript';

            if (editor) {
                FileSystem.saveToFile({
                    content: editor.value,
                    language: language,
                    onSuccess: (filename) => {
                        showMessage(`Saved to ${filename}`);
                    },
                    onError: (error) => {
                        showMessage(`Error saving file: ${error}`, true);
                    }
                });
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    registerAppShortcuts();
});
