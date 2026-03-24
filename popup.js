/**
 * CyberCop WhatsApp Scam Detector - Enhanced Popup Script
 * Manages cybersecurity dashboard interface with statistics and AI settings
 */

class PopupController {
    constructor() {
        this.isScanning = true;
        this.aiApiKey = null;
        this.statistics = {
            messagesScanned: 0,
            safeMessages: 0,
            suspiciousMessages: 0,
            scamsDetected: 0,
            lastUpdated: null
        };
        
        this.init();
    }
    
    /**
     * Initialize popup controller
     */
    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.updateUI();
        this.loadStatistics();
        
        // Request current stats from content script
        this.requestStatsFromContent();
        
        // Auto-refresh stats every 5 seconds
        setInterval(() => this.requestStatsFromContent(), 5000);
    }
    
    /**
     * Load saved settings from Chrome storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['scanningEnabled', 'aiApiKey', 'statistics']);
            
            if (result.scanningEnabled !== undefined) {
                this.isScanning = result.scanningEnabled;
            }
            
            this.aiApiKey = result.aiApiKey || null;
            
            if (result.statistics) {
                this.statistics = { ...this.statistics, ...result.statistics };
            }
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    /**
     * Save settings to Chrome storage
     */
    async saveSettings() {
        try {
            await chrome.storage.local.set({
                scanningEnabled: this.isScanning,
                aiApiKey: this.aiApiKey,
                statistics: this.statistics
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Toggle scanning button
        const toggleScan = document.getElementById('toggle-scan');
        if (toggleScan) {
            toggleScan.addEventListener('click', () => this.toggleScanning());
        }
        
        // Reset statistics button
        const resetStats = document.getElementById('reset-stats');
        if (resetStats) {
            resetStats.addEventListener('click', () => this.resetStatistics());
        }
        
        // Save API key button
        const saveApiKey = document.getElementById('save-api-key');
        if (saveApiKey) {
            saveApiKey.addEventListener('click', () => this.saveApiKey());
        }
        
        // API key input field
        const apiKeyInput = document.getElementById('api-key-input');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveApiKey();
                }
            });
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
                this.updateStatistics(message.stats);
            }
        });
    }
    
    /**
     * Toggle scanning on/off
     */
    async toggleScanning() {
        this.isScanning = !this.isScanning;
        
        const toggle = document.getElementById('toggle-scan');
        const statusText = document.getElementById('status-text');
        
        if (this.isScanning) {
            toggle.classList.add('active');
            toggle.textContent = 'Scanning ON';
            statusText.textContent = 'PROTECTION ACTIVE';
        } else {
            toggle.classList.remove('active');
            toggle.textContent = 'Scanning OFF';
            statusText.textContent = 'PROTECTION PAUSED';
        }
        
        // Save setting and notify content script
        await this.saveSettings();
        this.notifyContentScript();
    }
    
    /**
     * Update UI elements
     */
    updateUI() {
        const toggle = document.getElementById('toggle-scan');
        const statusText = document.getElementById('status-text');
        const aiStatus = document.getElementById('ai-status');
        const apiKeyInput = document.getElementById('api-key-input');
        
        // Update scanning status
        if (this.isScanning) {
            toggle.classList.add('active');
            toggle.textContent = 'Scanning ON';
            statusText.textContent = 'PROTECTION ACTIVE';
        } else {
            toggle.classList.remove('active');
            toggle.textContent = 'Scanning OFF';
            statusText.textContent = 'PROTECTION PAUSED';
        }
        
        // Update AI status
        if (this.aiApiKey) {
            aiStatus.textContent = 'ENABLED';
            aiStatus.style.background = 'rgba(40, 167, 69, 0.3)';
            apiKeyInput.value = '••••••••••••••••';
        } else {
            aiStatus.textContent = 'DISABLED';
            aiStatus.style.background = 'rgba(255, 255, 255, 0.2)';
            apiKeyInput.value = '';
        }
        
        this.updateStatDisplay();
        this.updateLastUpdated();
    }
    
    /**
     * Update statistics display
     */
    updateStatDisplay() {
        const scannedCount = document.getElementById('scanned-count');
        const safeCount = document.getElementById('safe-count');
        const suspiciousCount = document.getElementById('suspicious-count');
        const scamCount = document.getElementById('scam-count');
        
        if (scannedCount) scannedCount.textContent = this.statistics.messagesScanned;
        if (safeCount) safeCount.textContent = this.statistics.safeMessages;
        if (suspiciousCount) suspiciousCount.textContent = this.statistics.suspiciousMessages;
        if (scamCount) scamCount.textContent = this.statistics.scamsDetected;
    }
    
    /**
     * Update last updated time
     */
    updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('last-updated');
        
        if (this.statistics.lastUpdated) {
            const date = new Date(this.statistics.lastUpdated);
            const timeString = date.toLocaleString();
            lastUpdatedElement.textContent = `Last updated: ${timeString}`;
        } else {
            lastUpdatedElement.textContent = 'Last updated: Never';
        }
    }
    
    /**
     * Load statistics from storage
     */
    async loadStatistics() {
        try {
            const result = await chrome.storage.local.get(['detectionStats']);
            
            if (result.detectionStats) {
                this.statistics = { ...this.statistics, ...result.detectionStats };
                this.updateStatDisplay();
                this.updateLastUpdated();
            }
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    /**
     * Update statistics
     */
    updateStatistics(newStats) {
        this.statistics = { ...this.statistics, ...newStats };
        this.updateStatDisplay();
        this.updateLastUpdated();
        this.saveSettings();
    }
    
    /**
     * Request current statistics from content script
     */
    async requestStatsFromContent() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tabs[0] && tabs[0].url.includes('web.whatsapp.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'GET_STATISTICS'
                }, (response) => {
                    if (response && response.statistics) {
                        this.updateStatistics(response.statistics);
                    }
                });
            }
        } catch (error) {
            console.error('Error requesting stats:', error);
        }
    }
    
    /**
     * Notify content script about settings changes
     */
    async notifyContentScript() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tabs[0] && tabs[0].url.includes('web.whatsapp.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'SETTINGS_UPDATE',
                    scanningEnabled: this.isScanning
                });
            }
        } catch (error) {
            console.error('Error notifying content script:', error);
        }
    }
    
    /**
     * Save API key
     */
    async saveApiKey() {
        const apiKeyInput = document.getElementById('api-key-input');
        const aiStatus = document.getElementById('ai-status');
        
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            // Clear API key
            this.aiApiKey = null;
            aiStatus.textContent = 'DISABLED';
            aiStatus.style.background = 'rgba(255, 255, 255, 0.2)';
            apiKeyInput.value = '';
        } else {
            // Validate API key format (basic validation)
            if (apiKey.startsWith('sk-') && apiKey.length > 20) {
                this.aiApiKey = apiKey;
                aiStatus.textContent = 'ENABLED';
                aiStatus.style.background = 'rgba(40, 167, 69, 0.3)';
                apiKeyInput.value = '••••••••••••••••';
                
                this.showNotification('API key saved successfully!', 'success');
            } else {
                this.showNotification('Invalid API key format', 'error');
                return;
            }
        }
        
        await this.saveSettings();
        this.notifyContentScript();
    }
    
    /**
     * Reset statistics
     */
    async resetStatistics() {
        if (confirm('Are you sure you want to reset all statistics?')) {
            this.statistics = {
                messagesScanned: 0,
                safeMessages: 0,
                suspiciousMessages: 0,
                scamsDetected: 0,
                lastUpdated: Date.now()
            };
            
            this.updateStatDisplay();
            this.updateLastUpdated();
            await this.saveSettings();
            
            // Notify content script
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                
                if (tabs[0] && tabs[0].url.includes('web.whatsapp.com')) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'RESET_STATISTICS'
                    });
                }
            } catch (error) {
                console.error('Error resetting stats in content script:', error);
            }
            
            this.showNotification('Statistics reset successfully!', 'success');
        }
    }
    
    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success' or 'error')
     */
    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 600;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: linear-gradient(135deg, #28a745, #20c997);' : 'background: linear-gradient(135deg, #dc3545, #c82333);'}
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Show help dialog
     */
    showHelp() {
        const helpText = `
🛡️ CyberCop WhatsApp Scam Detector v2.0.0

ENHANCED FEATURES:
• Real-time scam detection with AI enhancement
• Advanced threat level classification
• Suspicious link detection
• Detailed hover tooltips
• Daily statistics dashboard
• OpenAI API integration

RISK LEVELS:
🟢 SAFE - No threats detected
🟡 WARNING - Suspicious content detected
🔴 DANGEROUS - High-risk scam detected

AI ENHANCEMENT:
• Optional OpenAI API integration
• Improved classification accuracy
• Fallback to rule-based detection
• Your API key is stored locally

STATISTICS:
• Messages scanned in real-time
• Categorized threat counts
• Persistent data storage
• Export capabilities

HOW TO USE:
1. Open WhatsApp Web
2. Messages are automatically scanned
3. Check borders for risk levels
4. Hover over flagged messages for details
5. Monitor dashboard for statistics

TROUBLESHOOTING:
• Ensure WhatsApp Web is fully loaded
• Check that extension is enabled
• Verify API key format (sk-...)
• Refresh page if needed

PRIVACY:
• No data collection
• Local storage only
• Optional AI integration
• Your messages stay private

For support, feature requests, or contributions:
Visit our GitHub repository or contact support.
        `;
        
        alert(helpText.trim());
    }
    
    /**
     * Export statistics
     */
    exportStatistics() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            statistics: this.statistics,
            aiEnabled: !!this.aiApiKey
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
                    window.popupController.resetStatistics();
                }
                break;
            case 'e':
                e.preventDefault();
                // Export stats (hidden feature)
                window.popupController.exportStatistics();
                break;
            case 'h':
                e.preventDefault();
                // Show help (hidden feature)
                window.popupController.showHelp();
                break;
        }
    }
});
