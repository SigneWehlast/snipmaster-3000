// file-system.js - File System integration for SnipMaster 3000
// Check if File System Access API is supported
const isFileSystemSupported = 'showOpenFilePicker' in window;
// Export our module functions
const FileSystem = {
    isSupported: isFileSystemSupported,

    // Function to show support status in UI
    checkSupport() {
        if (!this.isSupported) {
            console.warn('File System Access API not supported');
            // Optional: Show UI indication that file system features aren't
            available
        }
        return this.isSupported;
    },

    async loadFromFile(options = {}) {
        if (!this.checkSupport()) {
            if (options.onError) {
                options.onError('File System Access API not supported');
            }
            return;
        }

        try {
            // Default extensions if not provided
            const extensions = options.extensions || ['.js', '.html', '.css',
                '.txt'];

            // Prepare accept object for file picker
            const accept = {};
            if (extensions.includes('.js')) accept['text/javascript'] =
                ['.js'];
            if (extensions.includes('.html')) accept['text/html'] = ['.html',
                '.htm'];
            if (extensions.includes('.css')) accept['text/css'] = ['.css'];
            if (extensions.includes('.txt')) accept['text/plain'] = ['.txt'];

            // Show file picker
            const [fileHandle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Code Files',
                        accept
                    }
                ],
                multiple: false
            });

            // Get the file
            const file = await fileHandle.getFile();

            // Read content
            const content = await file.text();
            // Determine language based on file extension
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            // Map file extensions to language options
            const extensionToLanguage = {
                'js': 'javascript',
                'html': 'html',
                'htm': 'html',
                'css': 'css',
                'txt': 'plaintext'
            };

            // Determine language
            const language = extensionToLanguage[fileExtension] ||
                'javascript';

            // Call success callback with file info
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

    async saveToFile(options = {}) {
        if (!this.checkSupport()) {
            if (options.onError) {

                options.onError('File System Access API not supported');
            }
            return;
        }

        try {
            // Ensure content is provided
            const content = options.content || '';
            if (!content && options.onError) {
                options.onError('No content to save');
                return;
            }

            // Determine file extension based on language
            const language = options.language || 'javascript';

            // Map language to file extension
            const languageToExtension = {
                'javascript': '.js',
                'html': '.html',
                'css': '.css',
                'plaintext': '.txt'
            };
            const extension = languageToExtension[language] || '.txt';

            // Use suggested name or create default one
            const suggestedName = options.suggestedName ||
                `snippet${extension}`;

            // Show save file picker
            const fileHandle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: 'Code File',
                        accept: {
                            'text/plain': [extension]
                        }
                    }
                ]
            });

            // Create a writable stream
            const writable = await fileHandle.createWritable();

            // Write the content
            await writable.write(content);

            // Close and save
            await writable.close();
            // Call success callback
            if (options.onSuccess) {
                options.onSuccess(fileHandle.name || suggestedName);
            }

            return fileHandle.name || suggestedName;
        } catch (error) {
            console.error('Error saving file:', error);
            if (options.onError) {
                options.onError(error.message || 'Failed to save file');
            }
        }
    },
    initFileHandlers() {
        if ('launchQueue' in window) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (!launchParams.files.length) return;

                // Get the file handle
                const fileHandle = launchParams.files[0];

                try {
                    // Get the file
                    const file = await fileHandle.getFile();
                    // Read content
                    const content = await file.text();

                    // Determine language based on file extension
                    const fileName = file.name;
                    const fileExtension = fileName.split('.').pop().toLowerCase();

 // Map file extensions to language options (same mapping as before)
            const extensionToLanguage = {
                'js': 'javascript',
                'html': 'html',
                'htm': 'html',
                'css': 'css',
                'txt': 'plaintext'
            };

            // Trigger file loaded event
            const event = new CustomEvent('file-system:file-opened', {
                detail: {
                    name: fileName,
                    content,
                    language: extensionToLanguage[fileExtension] ||
                        'javascript',
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
},
};

window.FileSystem = FileSystem;

