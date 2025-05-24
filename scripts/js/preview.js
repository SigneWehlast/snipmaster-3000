//er til preview af koden

export class CodePreview {

    constructor(codeEditor, languageSelect) {
        this.codeEditor = codeEditor;
        this.languageSelect = languageSelect;
        this.setupEventListeners();
    }


    setupEventListeners() {
        this.codeEditor.addEventListener('input', () => this.updatePreview());
        this.languageSelect.addEventListener('change', () => this.updatePreview());
    }


    updatePreview() {
        const code = this.codeEditor.value;
        const language = this.languageSelect.value;

        const previewDiv = document.getElementById('codePreview');
        previewDiv.innerHTML = `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;

        hljs.highlightElement(previewDiv.querySelector('code'));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
} 