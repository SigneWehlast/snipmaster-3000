// Import all modules
import { registerServiceWorker } from './js/serviceWorker.js';
import { SnippetManager } from './js/snippetManager.js';
import { CodePreview } from './js/preview.js';
import { ConnectionStatus } from './js/connectionStatus.js';
import { PWAInstallation } from './js/pwaInstall.js';
import { FileHandler } from './js/fileHandler.js';
import { ProtocolHandler } from './js/protocolHandler.js';

// Initialiser snippetManager udenfor DOMContentLoaded
let snippetManager;

function showMessage(message, isError = false) {
    // Create or get status message element
    let statusElement = document.getElementById('status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'status-message';
        document.body.appendChild(statusElement);
    }

    // Set message text and class
    statusElement.textContent = message;
    statusElement.className = isError ? 'error' : '';

    // Show message
    statusElement.style.display = 'block';

    // Clear any existing timeout
    if (statusElement.timeout) {
        clearTimeout(statusElement.timeout);
    }
    // Auto hide after delay
    statusElement.timeout = setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}
// Make available to window
window.showMessage = showMessage;

document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Først migrer data fra localStorage til IndexedDB
        await SnippetStorage.migrateFromLocalStorage();

        // Initialiser UI
        await SnippetUI.init();
        SyncUI.init();

        console.log('SnipMaster 3000 initialized successfully');

        // Hent DOM-elementer
        const codeEditor = document.getElementById('codeEditor');
        const languageSelect = document.getElementById('languageSelect');
        const saveBtn = document.getElementById('saveBtn');
        const newSnippetBtn = document.getElementById('newSnippetBtn');

        // Initialiser managers og handlers
        snippetManager = new SnippetManager();  // Initialize global snippetManager
        const codePreview = new CodePreview(codeEditor, languageSelect);
        const connectionStatus = new ConnectionStatus();
        const pwaInstallation = new PWAInstallation();
        const fileHandler = new FileHandler(codePreview);
        const protocolHandler = new ProtocolHandler(snippetManager);

        // Opsæt event listeners
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

        // Initial visning af snippets
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

    // Generate suggested name
    let suggestedName = 'snippet';

    // Ensure snippetManager is initialized and currentSnippetId is defined
    if (snippetManager && snippetManager.currentSnippetId) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const currentSnippet = snippets.find(s => s.id === snippetManager.currentSnippetId);

        if (currentSnippet && currentSnippet.name) {
            suggestedName = currentSnippet.name;
        }
    } else {
        console.warn('No current snippet selected or snippetManager is not initialized properly');
    }

    // Add extension based on language
    const languageToExtension = {
        'javascript': '.js',
        'html': '.html',
        'css': '.css',
        'plaintext': '.txt'
    };

    const extension = languageToExtension[language] || '.txt';

    // If the name doesn't already have the extension, add it
    if (!suggestedName.endsWith(extension)) {
        suggestedName += extension;
    }

    // Ensure FileSystem is available for saving
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
    // Your existing save code

    // After successful save, show notification
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
// Helper function to get snippet name
function getCurrentSnippetName() {
    if (!currentSnippetId) return null;

    const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
    const currentSnippet = snippets.find(s => s.id === currentSnippetId);

    return currentSnippet ? (currentSnippet.name || `Snippet
   ${currentSnippet.language}`) : null;
}

function displaySnippets() {
    // Your existing code that creates snippet items

    // Add reminder button to each item
    document.querySelectorAll('.snippet-item').forEach(item => {
        // Add reminder button if not already present
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

            // Add event listener
            reminderBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering snippet selection
                setReminderForSnippet(item.dataset.id);
            });
        }
    });
}
// Function to set reminder
function setReminderForSnippet(snippetId) {
    // Find snippet details
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
    // Make sure keyboard manager is loaded
    if (!window.KeyboardManager) {
        console.error('Keyboard Manager not loaded');
        return;
    }

    // Load file with Ctrl+O
    KeyboardManager.registerShortcut('loadFile', {
        key: 'o',
        ctrl: true,
        description: 'Load file from disk',
        handler: () => {
            if (window.FileSystem && typeof FileSystem.loadFromFile ===
                'function') {
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
    // Save file with Ctrl+S
    KeyboardManager.registerShortcut('saveFile', {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Save to file',
        handler: () => {
            if (window.FileSystem && typeof FileSystem.saveToFile === 'function') {
                // Get current editor content
                const editor = document.getElementById('codeEditor');
                const language = document.getElementById('languageSelect')?.value
                    || 'javascript';

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
        }
    });
}
// Call during initialization
document.addEventListener('DOMContentLoaded', () => {
    // Register app-specific shortcuts
    registerAppShortcuts();
});
