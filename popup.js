/**
 * CyberCop WhatsApp Scam Detector - Popup Script
 * Manages extension popup interface and statistics
 */

class PopupController {
    constructor() {
        this.isScanning = true;
        this.stats = {
            safe: 0,
            warning: 0,
            dangerous: 0
        };
        
        this.init();
    }
    
    /**
     * Initialize popup controller
     */
    init() {
        this.loadSettings();
        this.bindEvents();
        this.updateUI();
        this.loadStats();
        
        // Request current stats from content script
        this.requestStatsFromContent();
    }
    
    /**
     * Load saved settings from storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['scanningEnabled', 'stats']);
            
            if (result.scanningEnabled !== undefined) {
                this.isScanning = result.scanningEnabled;
            }
            
            if (result.stats) {
                this.stats = { ...this.stats, ...result.stats };
            }
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                scanningEnabled: this.isScanning,
                stats: this.stats
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Toggle switch for scanning
        const toggle = document.getElementById('toggle-scan');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleScanning());
        }
        
        // Help link
        const helpLink = document.getElementById('help-link');
        if (helpLink) {
            helpLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHelp();
            });
        }
        
        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'STATS_UPDATE') {
                this.updateStats(message.stats);
            }
        });
    }
    
    /**
     * Toggle scanning on/off
     */
    toggleScanning() {
        this.isScanning = !this.isScanning;
        
        const toggle = document.getElementById('toggle-scan');
        const statusText = document.getElementById('status-text');
        
        if (this.isScanning) {
            toggle.classList.add('active');
            statusText.textContent = 'Active';
        } else {
            toggle.classList.remove('active');
            statusText.textContent = 'Paused';
        }
        
        // Save setting and notify content script
        this.saveSettings();
        this.notifyContentScript();
    }
    
    /**
     * Update UI elements
     */
    updateUI() {
        const toggle = document.getElementById('toggle-scan');
        const statusText = document.getElementById('status-text');
        
        if (this.isScanning) {
            toggle.classList.add('active');
            statusText.textContent = 'Active';
        } else {
            toggle.classList.remove('active');
            statusText.textContent = 'Paused';
        }
        
        this.updateStatDisplay();
    }
    
    /**
     * Update statistics display
     */
    updateStatDisplay() {
        const safeCount = document.getElementById('safe-count');
        const warningCount = document.getElementById('warning-count');
        const dangerousCount = document.getElementById('dangerous-count');
        
        if (safeCount) safeCount.textContent = this.stats.safe;
        if (warningCount) warningCount.textContent = this.stats.warning;
        if (dangerousCount) dangerousCount.textContent = this.stats.dangerous;
    }
    
    /**
     * Load statistics from storage
     */
    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['detectionStats']);
            
            if (result.detectionStats) {
                this.stats = { ...this.stats, ...result.detectionStats };
                this.updateStatDisplay();
            }
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    /**
     * Update statistics
     */
    updateStats(newStats) {
        this.stats = { ...this.stats, ...newStats };
        this.updateStatDisplay();
        this.saveSettings();
    }
    
    /**
     * Request current statistics from content script
     */
    requestStatsFromContent() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url.includes('web.whatsapp.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'GET_STATS'
                }, (response) => {
                    if (response && response.stats) {
                        this.updateStats(response.stats);
                    }
                });
            }
        });
    }
    
    /**
     * Notify content script about settings changes
     */
    notifyContentScript() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url.includes('web.whatsapp.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'SETTINGS_UPDATE',
                    scanningEnabled: this.isScanning
                });
            }
        });
    }
    
    /**
     * Show help dialog
     */
    showHelp() {
        const helpText = `
CyberCop WhatsApp Scam Detector v1.0.0

FEATURES:
• Real-time scam detection
• OTP and payment scam alerts
• Suspicious link detection
• Job offer scam protection

RISK LEVELS:
• GREEN - Safe messages
• YELLOW - Suspicious content
• RED - Dangerous scams

HOW TO USE:
1. Open WhatsApp Web
2. Messages are automatically scanned
3. Check borders for risk levels
4. Click extension icon for stats

For support, visit our GitHub repository.
        `;
        
        alert(helpText.trim());
    }
    
    /**
     * Reset statistics
     */
    async resetStats() {
        this.stats = { safe: 0, warning: 0, dangerous: 0 };
        this.updateStatDisplay();
        await this.saveSettings();
    }
    
    /**
     * Export statistics
     */
    exportStats() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            stats: this.stats
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cybercop-stats-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'r':
                e.preventDefault();
                // Reset stats (hidden feature)
                if (confirm('Reset all statistics?')) {
                    window.popupController.resetStats();
                }
                break;
            case 'e':
                e.preventDefault();
                // Export stats (hidden feature)
                window.popupController.exportStats();
                break;
        }
    }
});
