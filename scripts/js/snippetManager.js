/**
 * Snippet Management Module
 * 
 * This module handles all operations related to code snippets:
 * - Creating new snippets
 * - Loading existing snippets
 * - Updating snippets
 * - Deleting snippets
 * - Displaying the snippet list
 * - Managing snippet categories
 * 
 * It uses localStorage for persistent storage of snippets.
 */

export class SnippetManager {
    constructor() {
        this.currentSnippetId = null;
        this.codeEditor = document.getElementById('codeEditor');
        this.languageSelect = document.getElementById('languageSelect');
        this.categorySelect = this.initializeCategorySelect();
    }

    /**
     * Initializes the category selection dropdown
     * @returns {HTMLElement} The category select element
     */
    initializeCategorySelect() {
        const categories = ['General', 'Utils', 'Components', 'Scripts'];
        const categorySelect = document.createElement('select');
        categorySelect.innerHTML = categories.map(cat =>
            `<option value="${cat}">${cat}</option>`
        ).join('');
        document.querySelector('.toolbar').appendChild(categorySelect);
        return categorySelect;
    }

    /**
     * Saves the current snippet to localStorage
     * Creates a new snippet if none exists, updates existing one if editing
     */
    saveSnippet() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');

        const snippet = {
            code: this.codeEditor.value,
            language: this.languageSelect.value,
            category: this.categorySelect.value || 'General',
            lastModified: new Date().toISOString()
        };

        if (this.currentSnippetId) {
            const index = snippets.findIndex(s => s.id === this.currentSnippetId);
            if (index !== -1) {
                snippet.id = this.currentSnippetId;
                snippet.created = snippets[index].created;
                snippets[index] = snippet;
            }
        } else {
            snippet.id = Date.now().toString();
            snippet.created = snippet.lastModified;
            snippets.push(snippet);
        }

        localStorage.setItem('snippets', JSON.stringify(snippets));
        this.displaySnippets();
        this.showMessage('Snippet saved!');
    }

    /**
     * Loads a snippet into the editor for editing
     * @param {string} id - The ID of the snippet to load
     */
    loadSnippet(id) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippet = snippets.find(s => s.id === id);

        if (snippet) {
            this.currentSnippetId = snippet.id;
            this.codeEditor.value = snippet.code;
            this.languageSelect.value = snippet.language;
            document.getElementById('saveBtn').textContent = 'Update Snippet';
            this.highlightSelectedSnippet(id);
        }
    }

    /**
     * Displays all snippets in the sidebar
     */
    displaySnippets() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippetList = document.getElementById('snippetList');
        
        snippetList.innerHTML = snippets.map(snippet => `
            <div class="snippet-item ${snippet.id === this.currentSnippetId ? 'selected' : ''}" 
                 data-id="${snippet.id}">
                <div class="snippet-info">
                    <div class="snippet-header">
                        <strong>${snippet.language}</strong>
                        <span class="category-tag">${snippet.category}</span>
                    </div>
                    <div class="snippet-dates">
                        <small>Created: ${new Date(snippet.created).toLocaleDateString()}</small>
                        <small>Modified: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                    </div>
                </div>
                <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                <div class="snippet-actions">
                    <button class="delete-btn" data-id="${snippet.id}">Delete</button>
                </div>
            </div>
        `).join('');

        this.attachSnippetEventListeners();
    }

    /**
     * Attaches event listeners to snippet items
     */
    attachSnippetEventListeners() {
        const snippetList = document.getElementById('snippetList');
        
        snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn')) {
                    this.loadSnippet(item.dataset.id);
                }
            });
        });

        snippetList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSnippet(btn.dataset.id);
            });
        });
    }

    /**
     * Deletes a snippet from storage
     * @param {string} id - The ID of the snippet to delete
     */
    deleteSnippet(id) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            let snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
            snippets = snippets.filter(s => s.id !== id);
            localStorage.setItem('snippets', JSON.stringify(snippets));

            if (this.currentSnippetId === id) {
                this.currentSnippetId = null;
                this.codeEditor.value = '';
                document.getElementById('saveBtn').textContent = 'Save Snippet';
            }

            this.displaySnippets();
            this.showMessage('Snippet deleted!');
        }
    }

    /**
     * Shows a temporary status message
     * @param {string} text - The message to display
     */
    showMessage(text) {
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = text;
        document.body.appendChild(message);
        setTimeout(() => {
            message.remove();
        }, 2000);
    }

    /**
     * Highlights the currently selected snippet in the list
     * @param {string} id - The ID of the snippet to highlight
     */
    highlightSelectedSnippet(id) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
    }

    /**
     * Creates a new empty snippet
     */
    createNewSnippet() {
        this.currentSnippetId = null;
        this.codeEditor.value = '';
        this.languageSelect.value = 'javascript';
        document.getElementById('saveBtn').textContent = 'Save Snippet';
        this.highlightSelectedSnippet(null);
    }
} 