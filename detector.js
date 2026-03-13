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
        
        // Safe indicators (messages that are likely legitimate)
        this.safeIndicators = [
            /\b(hi|hello|hey|good morning|good evening|how are you)\b/gi,
            /\b(okay|ok|sure|alright|got it)\b/gi,
            /\b(thank you|thanks|appreciate)\b/gi,
            /\b(bye|goodbye|see you|talk later)\b/gi
        ];
    }
    
    /**
     * Analyze message text and return classification
     * @param {string} messageText - The message text to analyze
     * @returns {Object} Classification result with level and reasons
     */
    analyzeMessage(messageText) {
        if (!messageText || typeof messageText !== 'string') {
            return { level: 'safe', reasons: [] };
        }
        
        const text = messageText.toLowerCase().trim();
        const reasons = [];
        let maxRiskLevel = 'safe';
        
        // Check for dangerous patterns first
        for (const pattern of this.patterns.dangerous) {
            if (pattern.pattern.test(text)) {
                maxRiskLevel = 'dangerous';
                reasons.push({
                    level: 'dangerous',
                    description: pattern.description,
                    matched: text.match(pattern.pattern)?.[0] || ''
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
                        matched: text.match(pattern.pattern)?.[0] || ''
                    });
                }
            }
        }
        
        // Check for safe indicators
        let safeScore = 0;
        for (const safePattern of this.safeIndicators) {
            if (safePattern.test(text)) {
                safeScore++;
            }
        }
        
        // If message has multiple safe indicators and no scam patterns, mark as safe
        if (safeScore >= 1 && maxRiskLevel === 'safe') {
            reasons.push({
                level: 'safe',
                description: 'Normal conversation pattern',
                matched: ''
            });
        }
        
        return {
            level: maxRiskLevel,
            reasons: reasons
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
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScamDetector;
} else {
    window.ScamDetector = ScamDetector;
}
