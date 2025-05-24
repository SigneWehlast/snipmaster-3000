//Hjælpe-fil sw.js, som registrer service workeren
export function registerServiceWorker() {
    //tjekker om browseren understøtter service workers
    if ('serviceWorker' in navigator) {
        //registrer service workeren, når hele siden er loadet
        window.addEventListener('load', () => {
            //registrerer sw.js
            navigator.serviceWorker.register('/sw.js')
            //printer showServiceWorkerStatus, hvis den er successful
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                    showServiceWorkerStatus('Service Worker registered successfully!');
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                    showServiceWorkerStatus('Service Worker registration failed!', true);
                });
        });
    } else {
        console.log('Service Workers not supported in this browser.');
        showServiceWorkerStatus('Service Workers not supported in this browser.', true);
    }
}

function showServiceWorkerStatus(message, isError = false) {

    let statusElement = document.getElementById('sw-status');
    if (!statusElement) {
        //opretter et element med classen, hvor den printer sw status
        statusElement = document.createElement('div');
        statusElement.id = 'sw-status';
        document.body.appendChild(statusElement);
    }
    statusElement.className = isError ? 'sw-status error' : 'sw-status-success';
    statusElement.textContent = message;
    setTimeout(() => { statusElement.style.opacity = '0'; }, 3000);
} 