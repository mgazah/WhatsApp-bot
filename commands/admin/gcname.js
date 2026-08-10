/**
 * Update Group Name Command - Change the group name
 */

const config = require('../../config');

module.exports = {
    name: 'updategname',
    aliases: ['upgname', 'gname', 'setname', 'renamegroup', 'setgcname', 'setgroupname', 'groupname'],
    category: 'admin',
    description: 'Change the group name',
    usage: '.gname <new name> or reply to message',
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
                return reply('❌ I need to be an admin to update the group name.');
            }
            
            let newName = args.join(' ');
            
            // Check if replying to a message
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !newName) {
                newName = quotedMsg.conversation || 
                          quotedMsg.extendedTextMessage?.text || 
                          '';
            }
            
            if (!newName || newName.trim() === '') {
                return reply(`❌ No name provided!\n\n📌 Usage: ${config.prefix}gname Nova MD Family\n📌 Or reply to a message with the name`);
            }
            
            // Name length limit
            if (newName.length > 100) {
                return reply(`❌ Name too long!\n\n📊 Length: ${newName.length} characters\n📦 Limit: 100 characters`);
            }
            
            // Get current group name
            let oldName = 'No name set';
            try {
                const metadata = await sock.groupMetadata(from);
                oldName = metadata.subject || 'No name set';
            } catch (err) {
                console.log('Could not fetch current group name');
            }
            
            // Check if name is the same
            if (oldName === newName) {
                return reply(`⚠️ Group name is already "${newName}". No changes made.`);
            }
            
            await reply(`⏳ Changing group name from "${oldName}" to "${newName}"...`);
            
            // Update the group name
            await sock.groupUpdateSubject(from, newName);
            
            reply(`✅ Group name updated!\n\n📛 Old: ${oldName}\n🆕 New: ${newName}`);
            
        } catch (error) {
            console.error('Update Group Name error:', error);
            
            if (error.message?.includes('not-authorized')) {
                reply('❌ I need to be an admin to change the group name.');
            } else if (error.message?.includes('429')) {
                reply('❌ Too many requests. Please wait a moment and try again.');
            } else if (error.message?.includes('403')) {
                reply('❌ I don\'t have permission to change the group name.');
            } else {
                reply(`❌ Failed to update group name: ${error.message}`);
            }
        }
    }
};