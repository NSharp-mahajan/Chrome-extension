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
        this.aiApiKey = null;
        this.statistics = {
            messagesScanned: 0,
            safeMessages: 0,
            suspiciousMessages: 0,
            scamsDetected: 0,
            lastUpdated: Date.now()
        };
        
        // WhatsApp Web selectors (may change with updates)
        this.selectors = {
            messageContainer: '[data-id]',
            messageText: '[data-id] .copyable-text span[title]',
            messageElement: '[data-id] .message-in',
            messageOut: '[data-id] .message-out',
            chatPanel: '#main > .two > div:nth-child(2) > div'
        };
        
        console.log('CyberCop WhatsApp Scanner initialized');
        this.loadSettings();
        this.startMonitoring();
    }
    
    /**
     * Load settings from Chrome storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['aiApiKey', 'statistics']);
            this.aiApiKey = result.aiApiKey || null;
            
            if (result.statistics) {
                this.statistics = { ...this.statistics, ...result.statistics };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    /**
     * Save statistics to Chrome storage
     */
    async saveStatistics() {
        try {
            this.statistics.lastUpdated = Date.now();
            await chrome.storage.local.set({ statistics: this.statistics });
        } catch (error) {
            console.error('Failed to save statistics:', error);
        }
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
        this.scanInterval = setInterval(async () => {
            await this.scanExistingMessages();
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
        this.observer = new MutationObserver(async (mutations) => {
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
                await this.scanExistingMessages();
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
        setTimeout(async () => await this.scanExistingMessages(), 1000);
    }
    
    /**
     * Scan all currently visible messages
     */
    async scanExistingMessages() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        
        try {
            // Debug: Check what selectors are finding
            console.log('CyberCop: Scanning for messages...');
            console.log('Chat panel found:', !!document.querySelector(this.selectors.chatPanel));
            
            // Find all message containers with multiple selector attempts
            let messageContainers = document.querySelectorAll(this.selectors.messageContainer);
            
            // If no messages found with primary selector, try alternatives
            if (messageContainers.length === 0) {
                console.log('Trying alternative selectors...');
                const alternativeSelectors = [
                    '[data-id]',
                    '.message-in',
                    '.message-out',
                    '[class*="message"]',
                    '[role="row"]'
                ];
                
                for (const selector of alternativeSelectors) {
                    messageContainers = document.querySelectorAll(selector);
                    if (messageContainers.length > 0) {
                        console.log(`Found ${messageContainers.length} messages with selector: ${selector}`);
                        break;
                    }
                }
            }
            
            console.log(`CyberCop: Found ${messageContainers.length} message containers`);
            
            // Process messages sequentially to handle async AI calls
            for (let index = 0; index < messageContainers.length; index++) {
                const container = messageContainers[index];
                
                // Generate unique ID for this message
                const messageId = this.generateMessageId(container);
                
                // Skip if already processed
                if (this.processedMessages.has(messageId)) {
                    continue;
                }
                
                // Extract message text
                const messageText = this.extractMessageText(container);
                
                console.log(`Message ${index}: "${messageText?.substring(0, 50)}..."`);
                
                if (messageText && messageText.trim().length > 0) {
                    // Analyze message
                    const analysis = this.detector.analyzeMessage(messageText);
                    
                    console.log(`Analysis result: ${analysis.level}`, analysis);
                    
                    // Perform AI classification if API key is available
                    if (this.aiApiKey && analysis.level !== 'safe') {
                        try {
                            const aiResult = await this.detector.performAIClassification(messageText, this.aiApiKey);
                            if (aiResult.useAI && aiResult.classification) {
                                analysis.aiClassification = aiResult.classification;
                                analysis.aiConfidence = aiResult.confidence;
                            }
                        } catch (error) {
                            console.error('AI classification error:', error);
                        }
                    }
                    
                    // Apply styling based on analysis
                    this.applyMessageStyling(container, analysis, messageId);
                    
                    // Update statistics
                    this.updateStatistics(analysis);
                    
                    // Mark as processed
                    this.processedMessages.add(messageId);
                    
                    // Log detection (only for warnings/dangerous)
                    if (analysis.level !== 'safe') {
                        console.log(`CyberCop Detection [${analysis.level.toUpperCase()}]: ${messageText.substring(0, 100)}...`);
                        console.log('Reasons:', analysis.reasons);
                    }
                }
            }
            
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
     * Apply styling to message based on analysis result with enhanced tooltips
     * @param {Element} container - Message container element
     * @param {Object} analysis - Detection analysis result
     * @param {string} messageId - Unique message ID
     */
    applyMessageStyling(container, analysis, messageId) {
        try {
            console.log(`Applying styling for ${analysis.level} message:`, container);
            
            // Remove existing CyberCop classes
            container.classList.remove('cybercop-safe', 'cybercop-warning', 'cybercop-dangerous');
            
            // Add new class based on risk level
            const riskClass = this.detector.getRiskClass(analysis.level);
            container.classList.add(riskClass);
            
            console.log(`Added class: ${riskClass} to element:`, container);
            console.log('Element classes after adding:', container.className);
            
            // Add data attributes for debugging and tooltips
            container.setAttribute('data-cybercop-level', analysis.level);
            container.setAttribute('data-cybercop-id', messageId);
            container.setAttribute('data-cybercop-tooltip', analysis.tooltip || '');
            
            // Add AI classification data if available
            if (analysis.aiClassification) {
                container.setAttribute('data-cybercop-ai', analysis.aiClassification);
                container.setAttribute('data-cybercop-ai-confidence', analysis.aiConfidence || 0);
            }
            
            // Create enhanced indicator badge for dangerous/warning messages
            if (analysis.level !== 'safe') {
                this.createEnhancedIndicatorBadge(container, analysis);
            }
            
            // Add hover tooltip functionality
            this.addTooltipFunctionality(container, analysis);
            
            // Force style application
            container.style.borderLeft = '4px solid ' + this.detector.getBorderColor(analysis.level);
            container.style.backgroundColor = analysis.level === 'dangerous' ? 'rgba(220, 53, 69, 0.1)' : 
                                          analysis.level === 'warning' ? 'rgba(255, 193, 7, 0.1)' : 
                                          'rgba(40, 167, 69, 0.05)';
            
            console.log(`Applied inline styles: border-left: ${container.style.borderLeft}, background: ${container.style.backgroundColor}`);
            
        } catch (error) {
            console.error('CyberCop: Error applying message styling:', error);
        }
    }
    
    /**
     * Create enhanced indicator badge with AI information
     * @param {Element} container - Message container
     * @param {Object} analysis - Detection analysis
     */
    createEnhancedIndicatorBadge(container, analysis) {
        try {
            // Remove existing badge
            const existingBadge = container.querySelector('.cybercop-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Create badge container
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'cybercop-badge-container';
            
            // Main risk badge
            const badge = document.createElement('div');
            badge.className = `cybercop-badge cybercop-badge-${analysis.level}`;
            badge.textContent = analysis.level.toUpperCase();
            
            // AI indicator if available
            if (analysis.aiClassification) {
                const aiIndicator = document.createElement('div');
                aiIndicator.className = 'cybercop-ai-indicator';
                aiIndicator.textContent = '🤖';
                aiIndicator.title = `AI Classification: ${analysis.aiClassification.toUpperCase()} (Confidence: ${Math.round((analysis.aiConfidence || 0) * 100)}%)`;
                badgeContainer.appendChild(aiIndicator);
            }
            
            badgeContainer.appendChild(badge);
            
            // Find message element to attach badge
            const messageElement = container.querySelector('.message-in, .message-out') || container;
            
            // Insert badge at the beginning of message
            if (messageElement.firstChild) {
                messageElement.insertBefore(badgeContainer, messageElement.firstChild);
            } else {
                messageElement.appendChild(badgeContainer);
            }
            
        } catch (error) {
            console.error('CyberCop: Error creating enhanced indicator badge:', error);
        }
    }
    
    /**
     * Add hover tooltip functionality to message
     * @param {Element} container - Message container
     * @param {Object} analysis - Detection analysis
     */
    addTooltipFunctionality(container, analysis) {
        try {
            // Remove existing tooltip
            const existingTooltip = container.querySelector('.cybercop-tooltip');
            if (existingTooltip) {
                existingTooltip.remove();
            }
            
            // Only add tooltip for non-safe messages
            if (analysis.level === 'safe') {
                return;
            }
            
            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.className = 'cybercop-tooltip';
            tooltip.innerHTML = this.formatTooltipContent(analysis);
            
            // Add hover events
            container.addEventListener('mouseenter', (e) => {
                tooltip.style.display = 'block';
                this.positionTooltip(tooltip, container);
            });
            
            container.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
            
            // Append tooltip to container
            container.appendChild(tooltip);
            
        } catch (error) {
            console.error('CyberCop: Error adding tooltip functionality:', error);
        }
    }
    
    /**
     * Format tooltip content for display
     * @param {Object} analysis - Detection analysis
     * @returns {string} Formatted HTML content
     */
    formatTooltipContent(analysis) {
        let content = `<div class="tooltip-title">${analysis.level.toUpperCase()} RISK</div>`;
        
        // Add detection reasons
        if (analysis.reasons && analysis.reasons.length > 0) {
            content += '<div class="tooltip-reasons">';
            const uniqueReasons = [...new Set(analysis.reasons.map(r => r.description))];
            uniqueReasons.slice(0, 3).forEach(reason => {
                content += `<div class="tooltip-reason">• ${reason}</div>`;
            });
            content += '</div>';
        }
        
        // Add link information
        if (analysis.links && analysis.links.length > 0) {
            content += `<div class="tooltip-links">🔗 ${analysis.links.length} suspicious link(s) detected</div>`;
        }
        
        // Add AI classification if available
        if (analysis.aiClassification) {
            const confidence = Math.round((analysis.aiConfidence || 0) * 100);
            content += `<div class="tooltip-ai">🤖 AI: ${analysis.aiClassification.toUpperCase()} (${confidence}% confidence)</div>`;
        }
        
        return content;
    }
    
    /**
     * Position tooltip relative to container
     * @param {Element} tooltip - Tooltip element
     * @param {Element} container - Container element
     */
    positionTooltip(tooltip, container) {
        const rect = container.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Position above the container
        tooltip.style.top = `${rect.top + scrollTop - tooltip.offsetHeight - 10}px`;
        tooltip.style.left = `${rect.left + scrollLeft}px`;
        
        // Adjust if tooltip goes off screen
        if (parseInt(tooltip.style.top) < 10) {
            tooltip.style.top = `${rect.bottom + scrollTop + 10}px`;
        }
        
        if (parseInt(tooltip.style.left) + tooltip.offsetWidth > window.innerWidth) {
            tooltip.style.left = `${rect.right + scrollLeft - tooltip.offsetWidth}px`;
        }
    }
}
    
    /**
     * Update detection statistics
     * @param {Object} analysis - Message analysis result
     */
    updateStatistics(analysis) {
        this.statistics.messagesScanned++;
        
        switch (analysis.level) {
            case 'safe':
                this.statistics.safeMessages++;
                break;
            case 'warning':
                this.statistics.suspiciousMessages++;
                break;
            case 'dangerous':
                this.statistics.scamsDetected++;
                break;
        }
        
        // Save statistics every 10 messages to avoid excessive storage writes
        if (this.statistics.messagesScanned % 10 === 0) {
            this.saveStatistics();
        }
    }
    
    /**
     * Get current statistics
     * @returns {Object} Current statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }
    
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.statistics = {
            messagesScanned: 0,
            safeMessages: 0,
            suspiciousMessages: 0,
            scamsDetected: 0,
            lastUpdated: Date.now()
        };
        this.saveStatistics();
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
        
        // Save final statistics
        this.saveStatistics();
        
        console.log('CyberCop: Monitoring stopped');
    }
    
    /**
     * Update AI API key
     * @param {string} apiKey - OpenAI API key
     */
    async updateApiKey(apiKey) {
        this.aiApiKey = apiKey;
        try {
            await chrome.storage.local.set({ aiApiKey: apiKey });
            console.log('AI API key updated');
        } catch (error) {
            console.error('Failed to save API key:', error);
        }
    }
    
    /**
     * Handle messages from popup
     * @param {Object} request - Message request
     * @param {Function} sendResponse - Response callback
     */
    async handleMessage(request, sendResponse) {
        switch (request.type) {
            case 'GET_STATISTICS':
                sendResponse({ statistics: this.getStatistics() });
                break;
                
            case 'RESET_STATISTICS':
                this.resetStatistics();
                sendResponse({ success: true });
                break;
                
            case 'UPDATE_API_KEY':
                await this.updateApiKey(request.apiKey);
                sendResponse({ success: true });
                break;
                
            case 'GET_API_KEY':
                sendResponse({ apiKey: this.aiApiKey });
                break;
                
            default:
                sendResponse({ error: 'Unknown request type' });
        }
    }
}

// Initialize the monitor when script loads
let monitor;
try {
    monitor = new WhatsAppMonitor();
} catch (error) {
    console.error('CyberCop: Failed to initialize:', error);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (monitor && monitor.handleMessage) {
        monitor.handleMessage(request, sendResponse);
    }
    return true; // Keep the message channel open for async responses
});
