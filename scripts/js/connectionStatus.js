 export class ConnectionStatus {
    //køres når der lavet et nyt objekt til class
    constructor() {
        this.statusElement = document.getElementById('connection-status');
        //lytter på ændringer i nerværket
        this.setupEventListeners();
        //ændrer ui i forhold til om online eller offline
        this.updateStatus();
    }
    setupEventListeners() {
        window.addEventListener('online', () => this.updateStatus());
        window.addEventListener('offline', () => this.updateStatus());
    }
    updateStatus() {
        if (!this.statusElement) return;
        
        if (navigator.onLine) {
            this.statusElement.innerHTML = "🟢 Online";
            this.statusElement.style.backgroundColor = "#f1fff0";
        } else {
            this.statusElement.innerHTML = "🔴 Offline";
            this.statusElement.style.backgroundColor = "#fff0f0";
        }
    }
} 