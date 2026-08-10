/**
 * Set Group Profile Picture Command - Change the group icon
 */

const config = require('../../config');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'setgroupdp',
    aliases: ['setgcdp', 'groupicon', 'setgpic', 'gcdp', 'updategcdp'],
    category: 'admin',
    description: 'Change the group profile picture',
    usage: '.setgcpp (reply to an image)',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const { from, reply, isGroup, isAdmin, isBotAdmin } = extra;
            
            if (!isGroup) {
                return reply('❌ This command can only be used in groups.');
            }
            
            if (!isAdmin) {
                return reply('❌ Only group admins can use this command.');
            }
            
            if (!isBotAdmin) {
                return reply('❌ I need to be an admin to update the group profile picture.');
            }
            
            // Check if replying to an image message
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMsg) {
                return reply(`❌ Please reply to an image message.\n\n📌 Usage: ${config.prefix}setgcpp (reply to an image)`);
            }
            
            // Check if the quoted message is an image
            let imageMessage = null;
            let isQuotedImage = false;
            
            if (quotedMsg.imageMessage) {
                imageMessage = quotedMsg.imageMessage;
                isQuotedImage = true;
            } else if (quotedMsg.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                imageMessage = quotedMsg.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
                isQuotedImage = true;
            }
            
            if (!isQuotedImage || !imageMessage) {
                return reply('❌ Please reply to an image message to set as group profile picture.');
            }
            
            await reply('⏳ Downloading image and updating group profile picture...');
            
            // Download the image
            let buffer = Buffer.from([]);
            try {
                const stream = await downloadContentFromMessage(imageMessage, 'image');
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
            } catch (downloadError) {
                console.error('Download error:', downloadError);
                return reply('❌ Failed to download the image. Please try again.');
            }
            
            if (!buffer || buffer.length === 0) {
                return reply('❌ Failed to download the image. Please try again.');
            }
            
            // Save temporary file
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempPath = path.join(tempDir, `gcpp_${Date.now()}.jpg`);
            fs.writeFileSync(tempPath, buffer);
            
            try {
                // Update group profile picture
                await sock.updateProfilePicture(from, { url: tempPath });
                
                // Clean up temp file
                fs.unlinkSync(tempPath);
                
                reply(`✅ Group profile picture updated successfully!`);
                
            } catch (updateError) {
                // Clean up temp file on error
                try { fs.unlinkSync(tempPath); } catch (e) {}
                
                if (updateError.message?.includes('not-authorized')) {
                    reply('❌ I need to be an admin to change the group profile picture.');
                } else if (updateError.message?.includes('429')) {
                    reply('❌ Too many requests. Please wait a moment and try again.');
                } else if (updateError.message?.includes('image')) {
                    reply('❌ Invalid image format. Please send a valid image.');
                } else {
                    reply(`❌ Failed to update group profile picture: ${updateError.message}`);
                }
            }
            
        } catch (error) {
            console.error('Update Group Profile Picture error:', error);
            reply(`❌ Failed to update group profile picture: ${error.message}`);
        }
    }
};