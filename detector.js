/**
 * CyberCop WhatsApp Scam Detector
 * Contains scam detection logic and classification rules
 */

class ScamDetector {
    constructor() {
        // Scam detection patterns with risk levels
        this.patterns = {
            dangerous: [
                // OTP and verification scams
                {
                    pattern: /\b(otp|one time password|verification code|verify|confirm)\b.*\b(immediately|urgent|now|quickly)\b/gi,
                    description: "Urgent OTP/verification request"
                },
                {
                    pattern: /\b(send|share|provide)\b.*\b(otp|code|password|pin)\b/gi,
                    description: "Request for OTP/password"
                },
                
                // Payment and money scams
                {
                    pattern: /\b(urgent|immediate|emergency)\b.*\b(payment|transfer|send money|pay)\b/gi,
                    description: "Urgent payment request"
                },
                {
                    pattern: /\b(bank|account|credit card|debit card)\b.*\b(verify|confirm|update|suspend)\b/gi,
                    description: "Bank account verification scam"
                },
                {
                    pattern: /\b(loan|credit|debt)\b.*\b(urgent|immediate|quick)\b/gi,
                    description: "Urgent loan/credit scam"
                },
                
                // Job and employment scams
                {
                    pattern: /\b(job|work|employment|interview)\b.*\b(payment|fee|deposit|register)\b/gi,
                    description: "Job offer requiring payment"
                },
                {
                    pattern: /\b(hire|salary|income)\b.*\b(advance|deposit|payment)\b/gi,
                    description: "Payment required for job"
                },
                
                // Lottery and prize scams
                {
                    pattern: /\b(lottery|prize|winner|congratulations)\b.*\b(claim|receive|collect)\b/gi,
                    description: "Lottery/prize claim scam"
                },
                {
                    pattern: /\b(you won|you have won|selected)\b.*\b(money|prize|reward)\b/gi,
                    description: "Fake prize notification"
                }
            ],
            
            warning: [
                // Suspicious links
                {
                    pattern: /(bit\.ly|tinyurl|t\.co|short\.link)/gi,
                    description: "Shortened URL (potentially suspicious)"
                },
                {
                    pattern: /\b(click|tap|visit)\b.*\b(link|url|website)\b/gi,
                    description: "Request to click unknown link"
                },
                
                // Urgency indicators
                {
                    pattern: /\b(urgent|immediately|asap|right now|hurry)\b/gi,
                    description: "High urgency language"
                },
                {
                    pattern: /\b(limited time|offer expires|act fast|don't miss)\b/gi,
                    description: "Time pressure tactics"
                },
                
                // Personal information requests
                {
                    pattern: /\b(personal|contact|details|information)\b.*\b(share|provide|send)\b/gi,
                    description: "Request for personal information"
                },
                
                // Suspicious offers
                {
                    pattern: /\b(free|discount|special offer|deal)\b.*\b(limited|exclusive|urgent)\b/gi,
                    description: "Suspicious offer with urgency"
                }
            ]
        };
        
        // Suspicious link patterns (enhanced)
        this.suspiciousLinks = {
            // URL shorteners
            shorteners: [
                'bit.ly', 'tinyurl.com', 't.co', 'shorturl.at', 'cutt.ly', 
                'rebrand.ly', 'tiny.cc', 'is.gd', 'buff.ly', 'adf.ly'
            ],
            // Suspicious domains
            suspicious: [
                'verify-', 'secure-', 'account-', 'update-', 'support-',
                'whatsapp-', 'facebook-', 'instagram-', 'login-',
                'click-', 'claim-', 'reward-', 'prize-', 'winner-'
            ],
            // File extensions that are suspicious in messages
            suspiciousFiles: [
                '.exe', '.zip', '.rar', '.scr', '.bat', '.com', '.pif'
            ]
        };
    }
    
    /**
     * Analyze message text and return classification with detailed explanations
     * @param {string} messageText - The message text to analyze
     * @returns {Object} Classification result with level, reasons, and tooltip data
     */
    analyzeMessage(messageText) {
        if (!messageText || typeof messageText !== 'string') {
            return { 
                level: 'safe', 
                reasons: [],
                tooltip: 'Safe message',
                links: []
            };
        }
        
        const text = messageText.toLowerCase().trim();
        const reasons = [];
        const detectedLinks = [];
        let maxRiskLevel = 'safe';
        
        // Extract and analyze links first
        const links = this.extractLinks(messageText);
        links.forEach(link => {
            const linkAnalysis = this.analyzeLink(link);
            if (linkAnalysis.isSuspicious) {
                detectedLinks.push(linkAnalysis);
                reasons.push({
                    level: linkAnalysis.riskLevel,
                    description: linkAnalysis.reason,
                    matched: link,
                    type: 'link'
                });
                
                if (linkAnalysis.riskLevel === 'dangerous') {
                    maxRiskLevel = 'dangerous';
                } else if (linkAnalysis.riskLevel === 'warning' && maxRiskLevel !== 'dangerous') {
                    maxRiskLevel = 'warning';
                }
            }
        });
        
        // Check for dangerous patterns first
        for (const pattern of this.patterns.dangerous) {
            if (pattern.pattern.test(text)) {
                maxRiskLevel = 'dangerous';
                reasons.push({
                    level: 'dangerous',
                    description: pattern.description,
                    matched: text.match(pattern.pattern)?.[0] || '',
                    type: 'pattern'
                });
            }
        }
        
        // Check for warning patterns (only if not already dangerous)
        if (maxRiskLevel !== 'dangerous') {
            for (const pattern of this.patterns.warning) {
                if (pattern.pattern.test(text)) {
                    maxRiskLevel = 'warning';
                    reasons.push({
                        level: 'warning',
                        description: pattern.description,
                        matched: text.match(pattern.pattern)?.[0] || '',
                        type: 'pattern'
                    });
                }
            }
        }
        
        // Generate tooltip text
        const tooltip = this.generateTooltip(maxRiskLevel, reasons, detectedLinks);
        
        return {
            level: maxRiskLevel,
            reasons: reasons,
            tooltip: tooltip,
            links: detectedLinks
        };
    }
    
    /**
     * Get CSS class for risk level
     * @param {string} level - Risk level (safe, warning, dangerous)
     * @returns {string} CSS class name
     */
    getRiskClass(level) {
        switch (level) {
            case 'dangerous':
                return 'cybercop-dangerous';
            case 'warning':
                return 'cybercop-warning';
            case 'safe':
                return 'cybercop-safe';
            default:
                return 'cybercop-safe';
        }
    }
    
    /**
     * Get border color for risk level
     * @param {string} level - Risk level
     * @returns {string} CSS border color
     */
    getBorderColor(level) {
        switch (level) {
            case 'dangerous':
                return '#dc3545'; // Red
            case 'warning':
                return '#ffc107'; // Yellow
            case 'safe':
                return '#28a745'; // Green
            default:
                return '#28a745';
        }
    }
    
    /**
     * Extract all URLs from message text
     * @param {string} text - Message text
     * @returns {Array} Array of URLs found
     */
    extractLinks(text) {
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
        return text.match(urlRegex) || [];
    }
    
    /**
     * Analyze a specific URL for suspicious characteristics
     * @param {string} url - URL to analyze
     * @returns {Object} Analysis result with risk level and reason
     */
    analyzeLink(url) {
        const lowerUrl = url.toLowerCase();
        
        // Check for URL shorteners
        for (const shortener of this.suspiciousLinks.shorteners) {
            if (lowerUrl.includes(shortener)) {
                return {
                    url: url,
                    isSuspicious: true,
                    riskLevel: 'warning',
                    reason: `Suspicious shortened URL detected: ${shortener}`,
                    category: 'shortener'
                };
            }
        }
        
        // Check for suspicious domains
        for (const suspicious of this.suspiciousLinks.suspicious) {
            if (lowerUrl.includes(suspicious)) {
                return {
                    url: url,
                    isSuspicious: true,
                    riskLevel: 'dangerous',
                    reason: `Suspicious domain pattern detected: ${suspicious}`,
                    category: 'domain'
                };
            }
        }
        
        // Check for suspicious file extensions
        for (const fileExt of this.suspiciousLinks.suspiciousFiles) {
            if (lowerUrl.includes(fileExt)) {
                return {
                    url: url,
                    isSuspicious: true,
                    riskLevel: 'dangerous',
                    reason: `Suspicious file detected: ${fileExt}`,
                    category: 'file'
                };
            }
        }
        
        return {
            url: url,
            isSuspicious: false,
            riskLevel: 'safe',
            reason: 'Link appears safe',
            category: 'safe'
        };
    }
    
    /**
     * Generate tooltip text based on analysis results
     * @param {string} level - Risk level
     * @param {Array} reasons - Detection reasons
     * @param {Array} links - Detected links
     * @returns {string} Formatted tooltip text
     */
    generateTooltip(level, reasons, links) {
        if (level === 'safe') {
            return '✅ Safe message - No threats detected';
        }
        
        let tooltip = '';
        
        if (level === 'dangerous') {
            tooltip = '🚨 DANGEROUS - High risk scam detected:\n';
        } else if (level === 'warning') {
            tooltip = '⚠️ WARNING - Suspicious content detected:\n';
        }
        
        // Add unique reasons
        const uniqueReasons = [...new Set(reasons.map(r => r.description))];
        uniqueReasons.slice(0, 3).forEach((reason, index) => {
            tooltip += `• ${reason}\n`;
        });
        
        // Add link information
        if (links.length > 0) {
            tooltip += `\n🔗 Suspicious links: ${links.length}`;
        }
        
        return tooltip.trim();
    }
    
    /**
     * Perform AI-based message classification (optional)
     * @param {string} messageText - Message to classify
     * @param {string} apiKey - OpenAI API key (optional)
     * @returns {Promise<Object>} AI classification result
     */
    async performAIClassification(messageText, apiKey = null) {
        if (!apiKey) {
            return {
                useAI: false,
                reason: 'No API key provided'
            };
        }
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{
                        role: 'system',
                        content: 'Classify this WhatsApp message as either "safe", "suspicious", or "scam". Respond with only the classification word.'
                    }, {
                        role: 'user',
                        content: messageText
                    }],
                    max_tokens: 10,
                    temperature: 0
                })
            });
            
            const data = await response.json();
            const classification = data.choices?.[0]?.message?.content?.toLowerCase().trim();
            
            return {
                useAI: true,
                classification: classification,
                confidence: classification ? 0.8 : 0
            };
            
        } catch (error) {
            console.error('AI classification failed:', error);
            return {
                useAI: false,
                reason: 'API request failed',
                error: error.message
            };
        }
    }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScamDetector;
} else {
    window.ScamDetector = ScamDetector;
}
