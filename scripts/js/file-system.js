//til at åbne eller gemme til filer

//tjekker om browseren undertøtter filvælger
const isFileSystemSupported = 'showOpenFilePicker' in window;

//et objekt med metoder
export const FileSystem = {
    isSupported: isFileSystemSupported,

    //tjekker om API understøttes
    checkSupport() {
        if (!this.isSupported) {
            console.warn('File System Access API not supported');
        }
        return this.isSupported;
    },

    //åbner en filvælger med typerne nævnt, hvor man kan vælge filer fra ens computer
    async loadFromFile(options = {}) {
        if (!this.checkSupport()) {
            if (options.onError) {
                options.onError('File System Access API not supported');
            }
            return;
        }

        try {
            const extensions = options.extensions || ['.js', '.html', '.css', '.txt'];

            const accept = {};
            if (extensions.includes('.js')) accept['text/javascript'] = ['.js'];
            if (extensions.includes('.html')) accept['text/html'] = ['.html', '.htm'];
            if (extensions.includes('.css')) accept['text/css'] = ['.css'];
            if (extensions.includes('.txt')) accept['text/plain'] = ['.txt'];

            const [fileHandle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Code Files',
                        accept
                    }
                ],
                multiple: false
            });

            const file = await fileHandle.getFile();
            const content = await file.text();
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            const extensionToLanguage = {
                'js': 'javascript',
                'html': 'html',
                'htm': 'html',
                'css': 'css',
                'txt': 'plaintext'
            };

            const language = extensionToLanguage[fileExtension] || 'javascript';

            if (options.onSuccess) {
                options.onSuccess({
                    name: fileName,
                    content,
                    language,
                    extension: fileExtension
                });
            }

            return {
                name: fileName,
                content,
                language
            };

        } catch (error) {
            console.error('Error loading file:', error);
            if (options.onError) {
                options.onError(error.message || 'Failed to load file');
            }
        }
    },

    //gemmer indhold til fil
    async saveToFile(options = {}) {
        if (!this.checkSupport()) {
            if (typeof options.onError === 'function') {
                options.onError('File System Access API not supported');
            }
            return;
        }

        //tjekker om der er indhold, der kan gemmes
        try {
            const content = options.content || '';
            if (!content) {
                if (typeof options.onError === 'function') {
                    options.onError('No content to save');
                }
                return;
            }

            const language = options.language || 'javascript';

            const languageToExtension = {
                javascript: { ext: '.js', mime: 'text/javascript' },
                html: { ext: '.html', mime: 'text/html' },
                css: { ext: '.css', mime: 'text/css' },
                plaintext: { ext: '.txt', mime: 'text/plain' }
            };

            const fileMeta = languageToExtension[language] || languageToExtension['plaintext'];
            const suggestedName = options.suggestedName || `snippet${fileMeta.ext}`;

            const fileHandle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: 'Code File',
                        accept: {
                            [fileMeta.mime]: [fileMeta.ext]
                        }
                    }
                ]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            if (typeof options.onSuccess === 'function') {
                options.onSuccess(fileHandle.name || suggestedName);
            }

            return fileHandle.name || suggestedName;

        } catch (error) {
            console.error('Error saving file:', error);
            if (typeof options.onError === 'function') {
                options.onError(error.message || 'Failed to save file');
            }
        }
    },

    //tjekker om browseren understøtter drag-in af filer
    initFileHandlers() {
        if ('launchQueue' in window) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (!launchParams.files.length) return;

                const fileHandle = launchParams.files[0];

                try {
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    const fileName = file.name;
                    const fileExtension = fileName.split('.').pop().toLowerCase();

                    const extensionToLanguage = {
                        'js': 'javascript',
                        'html': 'html',
                        'htm': 'html',
                        'css': 'css',
                        'txt': 'plaintext'
                    };

                    const event = new CustomEvent('file-system:file-opened', {
                        detail: {
                            name: fileName,
                            content,
                            language: extensionToLanguage[fileExtension] || 'javascript',
                            extension: fileExtension
                        }
                    });

                    window.dispatchEvent(event);
                } catch (error) {
                    console.error('Error handling file:', error);
                    const event = new CustomEvent('file-system:error', {
                        detail: {
                            message: 'Failed to open file',
                            error
                        }
                    });

                    window.dispatchEvent(event);
                }
            });
        }
    }
};



window.FileSystem = FileSystem;
