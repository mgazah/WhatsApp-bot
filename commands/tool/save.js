/**
 * SaveStatus - Save WhatsApp Status (Images, Videos, Audio)
 * Category: Tools
 * Usage: .savestatus (reply to any status)
 */

const config = require('../../config');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'savestatus',
    aliases: ['ss', 'savestatus', 'dlstatus', 'getstatus'],
    description: 'Save WhatsApp status (images, videos, audio)',
    category: 'tools',
    usage: '.savestatus (reply to any status)',
    
    execute: async (sock, m, args, extra) => {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || 
                       m.quoted || 
                       m.message?.quotedMessage;
        
        // Show help menu if no quoted message
        if (!quoted) {
            const menu = `📱 *Status Saver*\n\nReply to any WhatsApp status with:\n${config.prefix}savestatus\n\n✨ Saves status permanently!`;
            await extra.reply(menu);
            return;
        }
        
        try {
            // Check if it's a status message
            const isStatus = m.key.remoteJid === 'status@broadcast';
            
            // Find media in quoted message
            let mediaData = null;
            let mediaType = null;
            
            if (quoted.imageMessage) {
                mediaData = quoted.imageMessage;
                mediaType = 'image';
            } else if (quoted.videoMessage) {
                mediaData = quoted.videoMessage;
                mediaType = 'video';
            } else if (quoted.audioMessage) {
                mediaData = quoted.audioMessage;
                mediaType = 'audio';
            } else {
                // Deep search for view once status
                const findMedia = (obj) => {
                    if (!obj || typeof obj !== 'object') return null;
                    if (obj.imageMessage) return { data: obj.imageMessage, type: 'image' };
                    if (obj.videoMessage) return { data: obj.videoMessage, type: 'video' };
                    if (obj.audioMessage) return { data: obj.audioMessage, type: 'audio' };
                    if (obj.viewOnceMessageV2?.message) return findMedia(obj.viewOnceMessageV2.message);
                    if (obj.viewOnceMessage) return findMedia(obj.viewOnceMessage);
                    for (const key in obj) {
                        const result = findMedia(obj[key]);
                        if (result) return result;
                    }
                    return null;
                };
                
                const found = findMedia(quoted);
                if (found) {
                    mediaData = found.data;
                    mediaType = found.type;
                }
            }
            
            if (!mediaData || !mediaType) {
                await extra.reply('❌ No status media found. Reply to a status image, video, or audio.');
                return;
            }
            
            // Download media
            const stream = await downloadContentFromMessage(mediaData, mediaType);
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            
            // Generate filename
            const fileName = mediaData.fileName || 
                            (mediaType === 'image' ? `status_${Date.now()}.jpg` : 
                             mediaType === 'video' ? `status_${Date.now()}.mp4` : 
                             `status_${Date.now()}.mp3`);
            
            const chatId = m.key.remoteJid;
            const caption = `✅ Status Saved | ${config.botName || 'NOVA MD'}`;
            
            // Send based on type
            switch (mediaType) {
                case 'image':
                    await sock.sendMessage(chatId, {
                        image: buffer,
                        caption: caption
                    }, { quoted: m });
                    break;
                    
                case 'video':
                    await sock.sendMessage(chatId, {
                        video: buffer,
                        caption: caption
                    }, { quoted: m });
                    break;
                    
                case 'audio':
                    await sock.sendMessage(chatId, {
                        audio: buffer,
                        mimetype: 'audio/mpeg',
                        fileName: fileName
                    }, { quoted: m });
                    break;
            }
            
        } catch (error) {
            console.error('Status Saver error:', error);
            await extra.reply(`❌ Failed to save status: ${error.message}`);
        }
    }
};