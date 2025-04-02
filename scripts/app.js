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
