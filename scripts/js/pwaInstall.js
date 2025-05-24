//styrer installationen af PWA'en -> ikon på skrivebordet

export class PWAInstallation {

    constructor() {
        this.deferredPrompt = null;
        this.setupEventListeners();
    }
    setupEventListeners() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            
            this.deferredPrompt = e;

            const installButton = document.getElementById('install-button');
            if (installButton) {
                installButton.style.display = 'block';

                installButton.addEventListener('click', () => {
                    this.deferredPrompt.prompt();

                    this.deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the installation');
                            installButton.style.display = 'none';
                        }
                        this.deferredPrompt = null;
                    });
                });
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('Application installed');
            const installButton = document.getElementById('install-button');
            if (installButton) {
                installButton.style.display = 'none';
            }
        });
    }
} 