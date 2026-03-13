# CyberCop WhatsApp Scam Detector

A Chrome extension that detects scam messages in WhatsApp Web chats with real-time analysis and visual indicators.

## Features

- **Real-time Scanning**: Automatically monitors WhatsApp Web messages as they appear
- **Three-Tier Classification**: 
  - 🟢 **SAFE** - Green border for legitimate messages
  - 🟡 **WARNING** - Yellow border for suspicious content  
  - 🔴 **DANGEROUS** - Red border for scam messages
- **Smart Detection**: Rule-based system for common scam patterns:
  - OTP and verification scams
  - Urgent payment requests
  - Bank account verification attempts
  - Job offer payment requests
  - Lottery and prize scams
  - Suspicious links
- **Visual Indicators**: Color-coded borders and badges
- **Statistics Dashboard**: Track detection counts in popup
- **Memory Efficient**: Only processes new messages, prevents duplicate scanning

## Installation

### Method 1: Load Unpacked Extension (Recommended for Development)

1. **Download or clone** this repository to your local machine
2. **Open Chrome browser** and navigate to: `chrome://extensions/`
3. **Enable Developer Mode** using the toggle in the top-right corner
4. **Click "Load unpacked"** button in the top-left
5. **Select the extension folder** (the folder containing `manifest.json`)
6. **Verify installation** - CyberCop should appear in your extensions list

### Method 2: Create Icons (Required)

Before loading, you'll need to create icon files:

1. Navigate to the `icons/` folder
2. Create these PNG files:
   - `icon16.png` (16x16 pixels)
   - `icon32.png` (32x32 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

**Quick icon creation:**
- Use https://favicon.io/ to generate simple icons
- Or create colored squares: Green shield with "🛡️" symbol
- Ensure transparent background for best results

## Usage

1. **Open WhatsApp Web** at https://web.whatsapp.com
2. **Start chatting** - messages are automatically scanned
3. **Look for visual indicators**:
   - Green border = Safe message
   - Yellow border = Suspicious, be careful
   - Red border = Dangerous scam detected
4. **Click extension icon** to view statistics and toggle scanning
5. **Hover over badges** to see detection reasons

## Detection Rules

### Dangerous (Red) Patterns:
- Urgent OTP/verification requests
- Bank account verification demands
- Emergency payment requests
- Job offers requiring payment
- Lottery/prize claim scams

### Warning (Yellow) Patterns:
- Shortened URLs (bit.ly, tinyurl)
- High urgency language
- Personal information requests
- Suspicious offers with time pressure

### Safe (Green) Indicators:
- Normal conversation patterns
- Greetings and casual chat
- No scam indicators detected

## File Structure

```
CyberCop WhatsApp Scam Detector/
├── manifest.json          # Extension configuration (Manifest V3)
├── detector.js           # Scam detection logic and patterns
├── content.js            # WhatsApp Web monitoring and DOM interaction
├── styles.css            # Visual styling for message indicators
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality and statistics
├── icons/                # Extension icons (you need to create these)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `activeTab`, `storage`, `https://web.whatsapp.com/*`
- **Content Scripts**: Injected into WhatsApp Web pages
- **Storage**: Uses Chrome storage API for settings and statistics
- **DOM Monitoring**: MutationObserver for real-time message detection
- **Memory Management**: Prevents duplicate processing with message tracking

## Privacy & Security

- ✅ **No data collection** - All processing happens locally
- ✅ **No external requests** - Works completely offline
- ✅ **No message content storage** - Only statistics and settings saved
- ✅ **Respects user privacy** - Minimal permissions required

## Troubleshooting

### Extension not working?
1. **Check Developer Mode** is enabled in `chrome://extensions/`
2. **Verify WhatsApp Web** is fully loaded
3. **Refresh WhatsApp Web** after installing
4. **Check console** for errors (F12 → Console)

### Messages not being highlighted?
1. **Ensure scanning is enabled** in popup
2. **Wait for new messages** to appear
3. **Check WhatsApp Web version** - selectors may need updates
4. **Look for console errors** indicating DOM changes

### Performance issues?
1. **Extension tracks only 1000 recent messages** to prevent memory issues
2. **Scanning is throttled** to every 3 seconds maximum
3. **Duplicate prevention** avoids re-processing same messages

## Development

### Modifying Detection Rules
Edit `detector.js` to add/remove scam patterns:

```javascript
// Add new dangerous pattern
{
    pattern: /\b(new scam pattern)\b/gi,
    description: "Description of scam"
}
```

### Updating WhatsApp Selectors
If WhatsApp Web updates break the extension, update selectors in `content.js`:

```javascript
this.selectors = {
    messageContainer: '[new-selector]',
    messageText: '[new-text-selector]',
    // ... other selectors
};
```

### Building Icons
Use online tools like:
- https://favicon.io/favicon-generator/
- https://www.flaticon.com/
- Adobe Illustrator or Figma for custom designs

## License

This extension is provided as-is for educational and security purposes. Use responsibly and comply with WhatsApp's terms of service.

## Support

For issues, feature requests, or contributions:
1. Check the troubleshooting section above
2. Review console logs for error details
3. Test on the latest WhatsApp Web version
4. Consider WhatsApp DOM changes may require selector updates

---

**Disclaimer**: This extension helps identify potential scams but is not 100% accurate. Always exercise caution and verify suspicious messages independently.
