/**
 * WhatsApp MD Bot - Settings Configuration
 * 
 * This file contains all configurable settings for the bot.
 * Settings here will override those in config.js
 */

// =============== OWNER SETTINGS ===============
// IMPORTANT: Add your WhatsApp number(s) with country code (without + or spaces)
// Example: ['12345678901'] or ['12345678901', '98765432101']
const ownerNumber = ['254737565761']; // ← REPLACE WITH YOUR NUMBER(S)

// Owner name(s) - displayed in bot status and logs
const ownerName = ['amon']; // ← REPLACE WITH YOUR NAME

// =============== SESSION SETTINGS ===============
// Get your session ID from the bot panel
// Format: "NovaMd~base64data" or "NovaMd~fileID#key" for Mega
const SESSION_ID = 'benzo~fCBm2LiL#ndE0L-h7DKUq0J52075TFYHUeKWh6rcTivkO4yFc-QU'; // ← ADD YOUR SESSION ID HERE

// =============== EXPORT SETTINGS ===============
module.exports = {
    // Owner settings
    ownerNumber: ownerNumber,  // Array of owner numbers
    ownerName: ownerName,       // Array of owner names
    
    // Session settings
    SESSION_ID: SESSION_ID,     // Your session ID string
    
    // =============== ADDITIONAL SETTINGS ===============
    // You can add more settings here if needed
    // These will also override config.js if present
    
    // Bot name (override from config.js)
    // botName: 'MyBot',
    
    // Command prefix (override from config.js)
    // prefix: '.',
    
    // Auto-read messages (override from config.js)
    // autoRead: true,
    
    // Auto-view status (override from config.js)
    // autoViewStatus: true,
    
    // Auto-react to status (override from config.js)
    // autoReactEnabled: true,
    
    // Auto-react emojis (override from config.js)
    // autoReactEmojis: ['🚘', '🔥', '💪', '🏎️', '✅'],
    
    // Chatbot enabled (override from config.js)
    // chatbotEnabled: true,
    
    // Auto bio (override from config.js)
    // autoBio: true,
    
    // Session name (override from config.js)
    // sessionName: 'session',
    
    // Bot version (override from config.js)
    // botVersion: '1.0.0'
};