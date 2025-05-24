//kigger på URL'en og reagerer på det
//til at loade, se og highligte snippets, når der klikkes på dem

export class ProtocolHandler {
    constructor(snippetManager) {
        this.snippetManager = snippetManager;
        this.setupProtocolHandling();
    }

    setupProtocolHandling() {
        document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const snippetId = urlParams.get('snippet');
            
            //finder snippets på id
            if (snippetId) {
                this.loadSnippetById(snippetId);
            }
            
            if (urlParams.has('new') && urlParams.get('new') === 'true') {
                document.getElementById('newSnippetBtn')?.click();
            }
            
            if (urlParams.has('filter')) {
                const filter = urlParams.get('filter');
                if (filter === 'recent') {
                    this.displayRecentSnippets();
                }
            }
        });
    }


    loadSnippetById(id) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippet = snippets.find(s => s.id === id);
        
        if (snippet) {
            this.snippetManager.loadSnippet(id);
        } else {
            this.showError(`Snippet not found: ${id}`);
        }
    }

    displayRecentSnippets() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const recentSnippets = [...snippets]
            .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
            .slice(0, 5);
        
        this.highlightSnippets(recentSnippets.map(s => s.id));
    }

    highlightSnippets(ids) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            if (ids.includes(item.dataset.id)) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    showError(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'status-message error';
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        setTimeout(() => {
            messageElement.remove();
        }, 2000);
    }
} 