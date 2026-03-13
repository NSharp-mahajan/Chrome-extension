/**
 * CyberCop WhatsApp Scam Detector - Content Script
 * Monitors WhatsApp Web for new messages and applies scam detection
 */

class WhatsAppMonitor {
    constructor() {
        this.detector = new ScamDetector();
        this.processedMessages = new Set(); // Track processed messages
        this.observer = null;
        this.isScanning = false;
        this.scanInterval = null;
        
        // WhatsApp Web selectors (may change with updates)
        this.selectors = {
            messageContainer: '[data-id]',
            messageText: '[data-id] .copyable-text span[title]',
            messageElement: '[data-id] .message-in',
            messageOut: '[data-id] .message-out',
            chatPanel: '#main > .two > div:nth-child(2) > div'
        };
        
        console.log('CyberCop WhatsApp Scanner initialized');
        this.startMonitoring();
    }
    
    /**
     * Start monitoring WhatsApp Web for new messages
     */
    startMonitoring() {
        // Wait for WhatsApp to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeObserver());
        } else {
            this.initializeObserver();
        }
        
        // Also run periodic scans as backup
        this.scanInterval = setInterval(() => {
            this.scanExistingMessages();
        }, 3000);
    }
    
    /**
     * Initialize MutationObserver to detect new messages
     */
    initializeObserver() {
        const chatPanel = document.querySelector(this.selectors.chatPanel);
        
        if (!chatPanel) {
            console.log('CyberCop: Chat panel not found, retrying...');
            setTimeout(() => this.initializeObserver(), 2000);
            return;
        }
        
        // Set up MutationObserver to watch for new messages
        this.observer = new MutationObserver((mutations) => {
            let hasNewMessages = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if new message elements were added
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const messageElements = node.querySelectorAll ? 
                                node.querySelectorAll(this.selectors.messageContainer) : [];
                            
                            if (messageElements.length > 0 || 
                                node.matches && node.matches(this.selectors.messageContainer)) {
                                hasNewMessages = true;
                            }
                        }
                    });
                }
            });
            
            if (hasNewMessages && !this.isScanning) {
                this.scanExistingMessages();
            }
        });
        
        // Start observing the chat panel
        this.observer.observe(chatPanel, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
        
        console.log('CyberCop: MutationObserver started');
        
        // Initial scan of existing messages
        setTimeout(() => this.scanExistingMessages(), 1000);
    }
    
    /**
     * Scan all currently visible messages
     */
    scanExistingMessages() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        
        try {
            // Find all message containers
            const messageContainers = document.querySelectorAll(this.selectors.messageContainer);
            
            messageContainers.forEach((container) => {
                // Generate unique ID for this message
                const messageId = this.generateMessageId(container);
                
                // Skip if already processed
                if (this.processedMessages.has(messageId)) {
                    return;
                }
                
                // Extract message text
                const messageText = this.extractMessageText(container);
                
                if (messageText && messageText.trim().length > 0) {
                    // Analyze the message
                    const analysis = this.detector.analyzeMessage(messageText);
                    
                    // Apply styling based on analysis
                    this.applyMessageStyling(container, analysis, messageId);
                    
                    // Mark as processed
                    this.processedMessages.add(messageId);
                    
                    // Log detection (only for warnings/dangerous)
                    if (analysis.level !== 'safe') {
                        console.log(`CyberCop Detection [${analysis.level.toUpperCase()}]: ${messageText.substring(0, 100)}...`);
                        console.log('Reasons:', analysis.reasons);
                    }
                }
            });
            
            // Clean up old message IDs (keep last 1000 to prevent memory issues)
            if (this.processedMessages.size > 1000) {
                const messageArray = Array.from(this.processedMessages);
                const toRemove = messageArray.slice(0, messageArray.length - 1000);
                toRemove.forEach(id => this.processedMessages.delete(id));
            }
            
        } catch (error) {
            console.error('CyberCop: Error scanning messages:', error);
        } finally {
            this.isScanning = false;
        }
    }
    
    /**
     * Generate unique ID for a message container
     * @param {Element} container - Message container element
     * @returns {string} Unique message ID
     */
    generateMessageId(container) {
        // Try to use WhatsApp's data-id if available
        const dataId = container.getAttribute('data-id');
        if (dataId) {
            return dataId;
        }
        
        // Fallback: generate ID from message content and position
        const messageText = this.extractMessageText(container);
        const textHash = messageText ? messageText.substring(0, 50).replace(/\s/g, '') : '';
        const position = container.getBoundingClientRect().top;
        return `${textHash}_${position}`;
    }
    
    /**
     * Extract text content from a message container
     * @param {Element} container - Message container element
     * @returns {string} Message text
     */
    extractMessageText(container) {
        try {
            // Try multiple selectors to find message text
            const selectors = [
                '.copyable-text span[title]',
                '.copyable-text',
                '[data-emoji]',
                '.message-text span',
                '.message-text'
            ];
            
            for (const selector of selectors) {
                const element = container.querySelector(selector);
                if (element) {
                    // Get text from title attribute or text content
                    const text = element.getAttribute('title') || element.textContent || element.innerText;
                    if (text && text.trim().length > 0) {
                        return text.trim();
                    }
                }
            }
            
            // Fallback: get all text content
            return container.textContent || container.innerText || '';
            
        } catch (error) {
            console.error('CyberCop: Error extracting message text:', error);
            return '';
        }
    }
    
    /**
     * Apply styling to message based on analysis result
     * @param {Element} container - Message container element
     * @param {Object} analysis - Detection analysis result
     * @param {string} messageId - Unique message ID
     */
    applyMessageStyling(container, analysis, messageId) {
        try {
            // Remove existing CyberCop classes
            container.classList.remove('cybercop-safe', 'cybercop-warning', 'cybercop-dangerous');
            
            // Add new class based on risk level
            const riskClass = this.detector.getRiskClass(analysis.level);
            container.classList.add(riskClass);
            
            // Add data attribute for debugging
            container.setAttribute('data-cybercop-level', analysis.level);
            container.setAttribute('data-cybercop-id', messageId);
            
            // Create indicator badge for dangerous/warning messages
            if (analysis.level !== 'safe') {
                this.createIndicatorBadge(container, analysis);
            }
            
        } catch (error) {
            console.error('CyberCop: Error applying message styling:', error);
        }
    }
    
    /**
     * Create indicator badge for dangerous/warning messages
     * @param {Element} container - Message container
     * @param {Object} analysis - Detection analysis
     */
    createIndicatorBadge(container, analysis) {
        try {
            // Check if badge already exists
            const existingBadge = container.querySelector('.cybercop-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Create badge element
            const badge = document.createElement('div');
            badge.className = `cybercop-badge cybercop-badge-${analysis.level}`;
            badge.textContent = analysis.level.toUpperCase();
            badge.title = `CyberCop Alert: ${analysis.reasons.map(r => r.description).join(', ')}`;
            
            // Find message element to attach badge
            const messageElement = container.querySelector('.message-in, .message-out') || container;
            
            // Insert badge at the beginning of message
            if (messageElement.firstChild) {
                messageElement.insertBefore(badge, messageElement.firstChild);
            } else {
                messageElement.appendChild(badge);
            }
            
        } catch (error) {
            console.error('CyberCop: Error creating indicator badge:', error);
        }
    }
    
    /**
     * Stop monitoring and clean up
     */
    stopMonitoring() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        console.log('CyberCop: Monitoring stopped');
    }
}

// Initialize the monitor when script loads
let monitor;
try {
    monitor = new WhatsAppMonitor();
} catch (error) {
    console.error('CyberCop: Failed to initialize:', error);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (monitor) {
        monitor.stopMonitoring();
    }
});
