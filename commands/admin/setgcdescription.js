/**
 * Set Group Description Command - Change the group description
 */

const config = require('../../config');

module.exports = {
    name: 'setgcdesc',
    aliases: ['setdesc', 'groupdesc', 'updatedesc', 'setgdesc', 'gcdesc'],
    category: 'admin',
    description: 'Change the group description',
    usage: '.setdesc <new description> or reply to message',
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
                return reply('❌ I need to be an admin to update the group description.');
            }
            
            let newDescription = args.join(' ');
            
            // Check if replying to a message
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !newDescription) {
                newDescription = quotedMsg.conversation || 
                                quotedMsg.extendedTextMessage?.text || 
                                '';
            }
            
            if (!newDescription || newDescription.trim() === '') {
                return reply(`❌ No description provided!\n\n📌 Usage: ${config.prefix}setdesc Welcome to NOVA MD Family\n📌 Or reply to a message with the description`);
            }
            
            // Description length limit (WhatsApp limit is 512 characters)
            if (newDescription.length > 512) {
                return reply(`❌ Description too long!\n\n📊 Length: ${newDescription.length} characters\n📦 Limit: 512 characters`);
            }
            
            // Get current group description
            let oldDescription = 'No description set';
            try {
                const metadata = await sock.groupMetadata(from);
                oldDescription = metadata.desc || 'No description set';
            } catch (err) {
                console.log('Could not fetch current group description');
            }
            
            // Check if description is the same
            if (oldDescription === newDescription) {
                return reply(`⚠️ Group description is already the same. No changes made.`);
            }
            
            // Show old description preview (first 50 chars)
            const oldPreview = oldDescription.length > 50 ? oldDescription.substring(0, 50) + '...' : oldDescription;
            const newPreview = newDescription.length > 50 ? newDescription.substring(0, 50) + '...' : newDescription;
            
            await reply(`⏳ Changing group description...\n\n📛 Old: ${oldPreview}\n🆕 New: ${newPreview}`);
            
            // Update the group description
            await sock.groupUpdateDescription(from, newDescription);
            
            reply(`✅ Group description updated successfully!`);
            
        } catch (error) {
            console.error('Update Group Description error:', error);
            
            if (error.message?.includes('not-authorized')) {
                reply('❌ I need to be an admin to change the group description.');
            } else if (error.message?.includes('429')) {
                reply('❌ Too many requests. Please wait a moment and try again.');
            } else if (error.message?.includes('403')) {
                reply('❌ I don\'t have permission to change the group description.');
            } else if (error.message?.includes('length')) {
                reply('❌ Description is too long. Maximum 512 characters.');
            } else {
                reply(`❌ Failed to update group description: ${error.message}`);
            }
        }
    }
};