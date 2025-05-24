export class FileHandler {
    constructor(codePreview) {
        //når en fil åbnes, kan den ses i codepreview
        this.codePreview = codePreview;
        this.setupFileHandling();
    }
    setupFileHandling() {
        //gør det muligt for PWA'er at åbne filer direkte
        if ('launchQueue' in window) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (!Array.isArray(launchParams.files) || launchParams.files.length === 0) {
                    return;
                }

                for (const fileHandle of launchParams.files) {
                    try {
                        const file = await fileHandle.getFile();
                        const content = await file.text();

                        this.createSnippetFromFile({
                            name: file.name,
                            language: this.detectLanguage(file.name),
                            code: content
                        });

                    } catch (error) {
                        console.error('Error handling file:', error);
                        this.showError('Failed to open file. ' + error.message);
                    }
                }
            });
        }
    }
    //vælger hvilket sprog, der bruges
    detectLanguage(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const extensionMap = {
            'js': 'javascript',
            'html': 'html',
            'css': 'css',
            'py': 'python',
            'java': 'java',
            'php': 'php',
            'rb': 'ruby',
            'md': 'markdown',
            'json': 'json',
            'xml': 'xml',
            'sql': 'sql',
            'sh': 'bash',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'ts': 'typescript'
        };
        return extensionMap[extension] || 'plaintext';
    }

    //sætter indholdet i et inputfelt, prøver at finde det rigtige sprog
    createSnippetFromFile({ name, language, code }) {
        const codeEditor = document.getElementById('codeEditor');
        const languageSelect = document.getElementById('languageSelect');

        if (codeEditor && languageSelect) {
            codeEditor.value = code;

            const isSupported = Array.from(languageSelect.options).some(opt => opt.value === language);
            languageSelect.value = isSupported ? language : 'plaintext';

            if (!isSupported) {
                this.showMessage(`⚠️ Language "${language}" not in dropdown. Defaulted to plaintext.`);
            }

            this.codePreview.updatePreview();
            this.showMessage(`📂 Opened file: ${name}`);
        }
    }
    showMessage(text) {
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = text;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    }

    showError(message) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'status-message error';
        errorMsg.textContent = message;
        document.body.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 3000);
    }
}
