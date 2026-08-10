/**
 * Chatbot - Replies to all messages automatically using Shizo API
 * Category: Owner
 * Works in: Private chats, Groups
 * Control: Only owner can toggle on/off/mode
 */

const config = require('../../config');
const APIs = require('../../utils/api');
const fs = require('fs');
const path = require('path');

// Chatbot state
let chatbotEnabled = true;
let mode = 'all'; // all, private, group

// Load chatbot state from file
const STATE_FILE = path.join(process.cwd(), 'data', 'chatbot_state.json');

try {
    if (fs.existsSync(STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        chatbotEnabled = data.enabled !== undefined ? data.enabled : true;
        mode = data.mode || 'all';
    }
} catch(e) {
    // Invalid JSON, ignore and use defaults
}

// Save state function
function saveState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify({ 
            enabled: chatbotEnabled, 
            mode: mode,
            updatedAt: new Date().toISOString() 
        }, null, 2));
    } catch(e) {}
}

// Custom responses for specific questions (HIGHEST PRIORITY)
function getCustomResponse(message, senderName) {
    const msg = message.toLowerCase().trim();
    
    // Who created you / who made you
    if (msg === 'who created u' || msg === 'who created you' || msg === 'who made you' || 
        msg === 'who is your owner' || msg === 'who built you' || msg === 'creator' ||
        msg.includes('who created') || msg.includes('who made') || msg.includes('your creator')) {
        return `I was created by *Amon*! 🎯 He's my amazing developer and owner. I'm ${config.botName || 'NOVA MD'}, his intelligent assistant. How can I help you today?`;
    }
    
    // What's your name / your name / uh name
    if (msg === 'uh name' || msg === 'your name' || msg === 'what is your name' || 
        msg === 'name' || msg === 'whats your name' || msg === 'tell me your name' ||
        msg.includes('what is your name') || msg.includes('whats your name')) {
        return `I'm ${config.botName || 'NOVA MD'}! 🤖 Your AI assistant. I was created by *Amon*. Nice to meet you!`;
    }
    
    // Who is Amon
    if (msg.includes('who is amon') || msg === 'amon' || msg.includes('tell me about amon')) {
        return `Amon is my creator and owner! 🎯 He's a talented developer who built me to help people on WhatsApp. He's awesome! 👑`;
    }
    
    // Bot info
    if (msg === 'about you' || msg === 'tell me about yourself' || msg === 'what can you do') {
        return `I'm ${config.botName || 'NOVA MD'}, a WhatsApp bot created by *Amon*. I can:\n\n🎵 Download music/videos\n🎤 Identify songs with Shazam\n🖼️ Generate AI images\n💬 Chat with you\n🔍 Search the web\n\nUse ${config.prefix}help to see all commands!`;
    }
    
    // Hello/Hi variations
    if (msg === 'hi' || msg === 'hello' || msg === 'hey' || msg === 'hola') {
        const responses = [
            `Hello ${senderName || 'there'}! 👋 How can I help you today?`,
            `Hey ${senderName || 'there'}! 😊 What's up?`,
            `Hi ${senderName || 'there'}! 🌟 Nice to hear from you!`,
            `Greetings ${senderName || 'there'}! 👋 What can I do for you?`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    return null;
}

// Main chatbot function using your API
async function chatbot(sock, message, text, isGroup, groupName, senderName, extra) {
    try {
        // Don't reply to own messages
        if (message.key.fromMe) return false;
        
        // Check mode (all/private/group)
        if (mode === 'private' && isGroup) return false;
        if (mode === 'group' && !isGroup) return false;
        
        // Don't reply to commands
        if (text && text.startsWith(config.prefix)) return false;
        
        // Don't reply to very short messages (except 'hi')
        if (!text || (text.length < 2 && text.toLowerCase() !== 'hi')) return false;
        
        // Show typing indicator
        try {
            await sock.sendPresenceUpdate('composing', extra.from);
        } catch(e) {}
        
        // Check for custom responses FIRST (before API)
        let response = getCustomResponse(text, senderName);
        
        // If no custom response, use AI API
        if (!response) {
            try {
                // Use your existing chatAI API from utils/api.js
                const aiResponse = await APIs.chatAI(text);
                if (aiResponse && aiResponse.msg) {
                    response = aiResponse.msg;
                    
                    // Post-process to fix any OpenAI references
                    response = response.replace(/OpenAI/g, 'Amon');
                    response = response.replace(/ChatGPT/g, config.botName || 'NOVA MD');
                    response = response.replace(/artificial intelligence research organization/g, `my creator ${config.ownerName || 'Amon'}`);
                } else {
                    throw new Error('Invalid API response');
                }
            } catch (error) {
                console.error('AI API error:', error.message);
                // Fallback to local responses
                response = getLocalResponse(text, senderName);
            }
        }
        
        // Clean up response
        response = response.replace(/[^\x20-\x7E\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\n]/gu, '');
        
        // Limit response length
        if (response.length > 1000) {
            response = response.substring(0, 997) + '...';
        }
        
        // Add group context if needed
        if (isGroup && groupName && Math.random() > 0.9) {
            response = `@${senderName?.split(' ')[0] || 'user'} ${response}`;
        }
        
        // Small delay for realism
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send response
        await sock.sendMessage(extra.from, {
            text: response,
            contextInfo: {
                mentionedJid: message.key.participant ? [message.key.participant] : [],
                forwardingScore: 0,
                isForwarded: false
            }
        }, { quoted: message });
        
        return true;
        
    } catch (error) {
        console.error('Chatbot error:', error.message);
        return false;
    }
}

// Local fallback responses when API fails
function getLocalResponse(message, senderName) {
    const msg = message.toLowerCase().trim();
    
    // Greetings
    if (msg.match(/^(hi|hello|hey|hola|hai|greetings|sup)$/i)) {
        const greetings = [
            `Hello ${senderName || 'there'}! 👋 How can I help you today?`,
            `Hey ${senderName || 'there'}! 😊 What's up?`,
            `Hi ${senderName || 'there'}! 🌟 Nice to hear from you!`,
            `Greetings ${senderName || 'there'}! 👋 What can I do for you?`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Who created you
    if (msg.includes('who created') || msg.includes('who made') || msg.includes('your creator')) {
        return `I was created by *Amon*! 🎯 He's my amazing developer and owner. I'm ${config.botName || 'NOVA MD'}, his intelligent assistant.`;
    }
    
    // Your name
    if (msg.includes('your name') || msg === 'uh name' || msg === 'name') {
        return `I'm ${config.botName || 'NOVA MD'}! 🤖 Created by *Amon*. Nice to meet you!`;
    }
    
    // How are you
    if (msg.includes('how are you') || msg.includes('how are u')) {
        return "I'm doing great! 🤖 Thanks for asking! How about you?";
    }
    
    // Thanks
    if (msg.includes('thank') || msg.includes('thanks')) {
        return "You're very welcome! 🎉 Happy to help!";
    }
    
    // Default responses
    const defaultResponses = [
        `Interesting! 🤔 Tell me more about that.`,
        `I see! 💭 How can I assist you with that?`,
        `Got it! 👍 Is there anything specific you'd like to know?`,
        `Thanks for sharing! 😊 What else is on your mind?`
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Command handler (ONLY OWNER CAN CONTROL)
module.exports = {
    name: 'chatbot',
    aliases: ['bot', 'ai'],
    category: 'owner',
    desc: 'Toggle chatbot or change mode',
    usage: '.chatbot on/off/status/mode',
    ownerOnly: true,
    
    async execute(sock, message, args, extra) {
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            return extra.reply(`🤖 *Chatbot Commands*\n\n• ${config.prefix}chatbot on - Enable auto responses\n• ${config.prefix}chatbot off - Disable auto responses\n• ${config.prefix}chatbot status - Check status\n• ${config.prefix}chatbot mode all - Respond everywhere\n• ${config.prefix}chatbot mode private - Only private chats\n• ${config.prefix}chatbot mode group - Only groups\n\n✨ Created by Amon | ${config.botName || 'NOVA MD'}\n\nCurrent Status: ${chatbotEnabled ? '🟢 ENABLED' : '🔴 DISABLED'}\nCurrent Mode: ${mode.toUpperCase()}`);
        }
        
        // Toggle chatbot on/off
        if (action === 'on' || action === 'enable') {
            chatbotEnabled = true;
            saveState();
            return extra.reply(`✅ *Chatbot Enabled*\n\nMode: ${mode.toUpperCase()}\nI will now respond to messages automatically!\n\nUse ${config.prefix}chatbot mode to change where I respond.`);
        } 
        else if (action === 'off' || action === 'disable') {
            chatbotEnabled = false;
            saveState();
            return extra.reply(`❌ *Chatbot Disabled*\n\nI will no longer respond to messages automatically.\n\nUse ${config.prefix}chatbot on to enable again.`);
        }
        else if (action === 'status') {
            let modeInfo = '';
            if (mode === 'all') modeInfo = 'Everywhere (Private + Groups)';
            else if (mode === 'private') modeInfo = 'Private Chats Only';
            else if (mode === 'group') modeInfo = 'Groups Only';
            
            return extra.reply(`🤖 *Chatbot Status*\n\nStatus: ${chatbotEnabled ? '🟢 ENABLED' : '🔴 DISABLED'}\nMode: ${modeInfo}\nBot Name: ${config.botName || 'NOVA MD'}\nCreator: Amon\n\nTo change mode: ${config.prefix}chatbot mode <all/private/group>`);
        }
        else if (action === 'mode') {
            const newMode = args[1]?.toLowerCase();
            if (newMode === 'all' || newMode === 'private' || newMode === 'group') {
                mode = newMode;
                saveState();
                return extra.reply(`✅ *Mode Changed*\n\nNow responding in: ${mode.toUpperCase()}\n\n• all: Private chats + Groups\n• private: Private chats only\n• group: Groups only`);
            } else {
                return extra.reply(`❌ *Invalid Mode*\n\nAvailable modes:\n• ${config.prefix}chatbot mode all - Everywhere\n• ${config.prefix}chatbot mode private - Private only\n• ${config.prefix}chatbot mode group - Groups only`);
            }
        }
        
        return extra.reply(`🤖 *Invalid option*\n\nUse: ${config.prefix}chatbot on/off/status/mode`);
    }
};

// Export for auto-processing (NO RESTRICTION - replies to everyone)
module.exports.processMessage = async (sock, message, text, isGroup, groupName, senderName, extra) => {
    if (!chatbotEnabled) return false;
    return await chatbot(sock, message, text, isGroup, groupName, senderName, extra);
};