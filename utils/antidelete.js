/**
 * Anti-Delete Utility - Modular exports for handler.js
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('📁 Created data directory at:', dataDir);
    }
}

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Function to get folder size in MB
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                totalSize += stat.size;
            }
        }

        return totalSize / (1024 * 1024);
    } catch (err) {
        console.error('Error getting folder size:', err);
        return 0;
    }
};

// Function to clean temp folder if size exceeds 200MB
const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        
        if (sizeMB > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                try {
                    fs.unlinkSync(filePath);
                } catch (e) {
                    // ignore
                }
            }
            console.log('🧹 Temp folder cleaned');
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
};

// Start periodic cleanup check every 1 minute
setInterval(cleanTempFolderIfLarge, 60 * 1000);

// Load config
function loadAntideleteConfig() {
    try {
        ensureDataDir();
        if (!fs.existsSync(CONFIG_PATH)) {
            const defaultConfig = { enabled: false };
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: false };
    }
}

// Save config
function saveAntideleteConfig(config) {
    try {
        ensureDataDir();
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Config save error:', err);
    }
}

// Safe media download function
async function downloadMedia(message, mediaType) {
    try {
        let buffer = Buffer.alloc(0);
        const stream = await downloadContentFromMessage(message, mediaType);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        return buffer;
    } catch (error) {
        console.error(`Error downloading ${mediaType}:`, error.message);
        return null;
    }
}

// Safe file write function
async function safeWriteFile(filePath, buffer) {
    try {
        await writeFile(filePath, buffer);
        return true;
    } catch (error) {
        console.error('Error writing file:', error.message);
        return false;
    }
}

// Get current config
function getConfig() {
    return loadAntideleteConfig();
}

// Set config
function setConfig(enabled) {
    const config = loadAntideleteConfig();
    config.enabled = enabled;
    saveAntideleteConfig(config);
}

// Store incoming messages
async function storeMessage(message, sock) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        if (!message.key?.id) return;

        const messageId = message.key.id;
        const chatId = message.key.remoteJid;
        
        // Skip status broadcasts, newsletters, and bot's own messages
        if (chatId === 'status@broadcast' || chatId.includes('newsletter') || message.key.fromMe) {
            return;
        }

        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;
        let mimeType = '';

        const sender = message.key.participant || chatId;
        const isGroup = chatId.endsWith('@g.us');

        console.log(`💾 Storing message ${messageId.substring(0, 8)}... from ${sender}`);

        // Check for view-once messages
        const viewOnceContainer = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        
        if (viewOnceContainer) {
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content = viewOnceContainer.imageMessage.caption || '';
                mimeType = viewOnceContainer.imageMessage.mimetype || 'image/jpeg';
                const buffer = await downloadMedia(viewOnceContainer.imageMessage, 'image');
                if (buffer) {
                    mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                    await safeWriteFile(mediaPath, buffer);
                }
                isViewOnce = true;
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content = viewOnceContainer.videoMessage.caption || '';
                mimeType = viewOnceContainer.videoMessage.mimetype || 'video/mp4';
                const buffer = await downloadMedia(viewOnceContainer.videoMessage, 'video');
                if (buffer) {
                    mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                    await safeWriteFile(mediaPath, buffer);
                }
                isViewOnce = true;
            } else if (viewOnceContainer.audioMessage) {
                mediaType = 'audio';
                mimeType = viewOnceContainer.audioMessage.mimetype || 'audio/mpeg';
                const buffer = await downloadMedia(viewOnceContainer.audioMessage, 'audio');
                if (buffer) {
                    const ext = mimeType.includes('ogg') ? 'ogg' : 'mp3';
                    mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
                    await safeWriteFile(mediaPath, buffer);
                }
                isViewOnce = true;
            }
        } 
        // Regular text messages
        else if (message.message?.conversation) {
            content = message.message.conversation;
        } 
        else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } 
        // Images
        else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            mimeType = message.message.imageMessage.mimetype || 'image/jpeg';
            const buffer = await downloadMedia(message.message.imageMessage, 'image');
            if (buffer) {
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await safeWriteFile(mediaPath, buffer);
            }
        } 
        // Stickers
        else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            mimeType = message.message.stickerMessage.mimetype || 'image/webp';
            const buffer = await downloadMedia(message.message.stickerMessage, 'sticker');
            if (buffer) {
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
                await safeWriteFile(mediaPath, buffer);
            }
        } 
        // Videos
        else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            mimeType = message.message.videoMessage.mimetype || 'video/mp4';
            const buffer = await downloadMedia(message.message.videoMessage, 'video');
            if (buffer) {
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await safeWriteFile(mediaPath, buffer);
            }
        } 
        // Audio / Voice Notes
        else if (message.message?.audioMessage) {
            mediaType = 'audio';
            mimeType = message.message.audioMessage.mimetype || 'audio/mpeg';
            const ext = mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mpeg') ? 'mp3' : 'ogg');
            const buffer = await downloadMedia(message.message.audioMessage, 'audio');
            if (buffer) {
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
                await safeWriteFile(mediaPath, buffer);
            }
        } 
        // Documents
        else if (message.message?.documentMessage) {
            mediaType = 'document';
            content = message.message.documentMessage.fileName || 'document';
            mimeType = message.message.documentMessage.mimetype || 'application/octet-stream';
            const buffer = await downloadMedia(message.message.documentMessage, 'document');
            if (buffer) {
                const ext = content.split('.').pop() || 'bin';
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
                await safeWriteFile(mediaPath, buffer);
            }
        }

        // Store the message
        if (content || mediaType) {
            messageStore.set(messageId, {
                content,
                mediaType,
                mediaPath,
                mimeType,
                sender,
                chatId,
                isGroup,
                isViewOnce,
                timestamp: Date.now()
            });

            console.log(`💾 Stored: ${mediaType || 'text'} from ${sender}`);

            // Forward view-once media immediately
            if (isViewOnce && mediaType && mediaPath && fs.existsSync(mediaPath) && sock) {
                try {
                    const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const senderName = sender.split('@')[0];
                    
                    const mediaOptions = {
                        caption: `🚯 Anti-ViewOnce ${mediaType.toUpperCase()}\n\nFrom: @${senderName}\nTime: ${new Date().toLocaleString()}\n\nThis view-once media was automatically captured.`,
                        mentions: [sender]
                    };
                    
                    if (mediaType === 'image') {
                        await sock.sendMessage(ownerNumber, { image: fs.readFileSync(mediaPath), ...mediaOptions });
                    } else if (mediaType === 'video') {
                        await sock.sendMessage(ownerNumber, { video: fs.readFileSync(mediaPath), ...mediaOptions });
                    } else if (mediaType === 'audio') {
                        await sock.sendMessage(ownerNumber, { audio: fs.readFileSync(mediaPath), mimetype: mimeType, ptt: true, ...mediaOptions });
                    }
                    
                    console.log(`📸 View-once ${mediaType} captured and forwarded`);
                    
                    // Cleanup
                    try { 
                        if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath); 
                        messageStore.delete(messageId);
                    } catch (e) {}
                } catch (e) {
                    console.error('Error forwarding view-once media:', e.message);
                }
            }
        }

    } catch (err) {
        console.error('storeMessage error:', err.message);
    }
}

// Handle message deletion
async function handleMessageRevocation(sock, update) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        // Skip bot's own messages
        if (update.key?.fromMe) return;

        const messageId = update.key?.id;
        if (!messageId) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const time = new Date(original.timestamp).toLocaleString();

        console.log(`🚯 DELETION DETECTED: ${messageId.substring(0, 8)}...`);

        // Get group name if applicable
        let groupName = '';
        if (original.isGroup && original.chatId) {
            try {
                const groupMetadata = await sock.groupMetadata(original.chatId);
                groupName = groupMetadata.subject;
            } catch (err) {}
        }

        // Create alert message
        let alertText = `🚯 ANTIDELETE ALERT 🚯\n\n` +
            `🗑️ Message Deleted!\n` +
            `👤 From: @${senderName}\n` +
            `📱 Number: ${sender}\n` +
            `🕒 Time: ${time}\n`;

        if (groupName) {
            alertText += `👥 Group: ${groupName}\n`;
        }

        if (original.content) {
            alertText += `\n💬 Content:\n${original.content}\n`;
        }

        if (original.mediaType) {
            alertText += `\n📎 Media Type: ${original.mediaType.toUpperCase()}`;
            if (original.isViewOnce) alertText += ` (View Once)`;
        }

        // Remove from store to prevent loops
        messageStore.delete(messageId);

        // Send alert
        await sock.sendMessage(ownerNumber, {
            text: alertText,
            mentions: [sender]
        });

        console.log(`✅ Deletion alert sent`);

        // Send media if exists
        if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath) && !original.isViewOnce) {
            try {
                const mediaOptions = {
                    caption: `🗑️ Deleted ${original.mediaType.toUpperCase()}\n\nFrom: @${senderName}\nTime: ${time}`,
                    mentions: [sender]
                };

                const mediaBuffer = fs.readFileSync(original.mediaPath);

                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(ownerNumber, { image: mediaBuffer, ...mediaOptions });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerNumber, { video: mediaBuffer, ...mediaOptions });
                        break;
                    case 'audio':
                        await sock.sendMessage(ownerNumber, { audio: mediaBuffer, mimetype: original.mimeType, ptt: true, ...mediaOptions });
                        break;
                    case 'sticker':
                        await sock.sendMessage(ownerNumber, { sticker: mediaBuffer });
                        break;
                    case 'document':
                        await sock.sendMessage(ownerNumber, { document: mediaBuffer, fileName: original.content, mimetype: original.mimeType, ...mediaOptions });
                        break;
                }

                console.log(`✅ Deleted ${original.mediaType} forwarded`);
            } catch (err) {
                console.error('Error sending deleted media:', err.message);
            }

            // Cleanup
            try {
                if (fs.existsSync(original.mediaPath)) fs.unlinkSync(original.mediaPath);
            } catch (err) {}
        }

    } catch (err) {
        console.error('handleMessageRevocation error:', err.message);
    }
}

// Main antidelete handler for message deletions
async function AntiDelete(sock, updates) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        console.log(`🔍 Processing ${updates.length} deletion(s)`);

        for (const update of updates) {
            if (update.key?.fromMe) continue;
            await handleMessageRevocation(sock, update);
        }
    } catch (error) {
        console.error('AntiDelete error:', error.message);
    }
}

// Export only the modular functions
module.exports = {
    storeMessage,
    AntiDelete,
    handleMessageRevocation,
    getConfig,
    setConfig,
    loadAntideleteConfig,
    saveAntideleteConfig
};
