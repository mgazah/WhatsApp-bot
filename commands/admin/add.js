/**
 * Add Command - Add users to the group (Owner only)
 */

const config = require('../../config');

module.exports = {
    name: 'add',
    aliases: ['aja', 'invite', 'adduser'],
    category: 'admin',
    description: 'Add users to the group (Owner only)',
    usage: '.add <phone_number>',
    groupOnly: true,
    ownerOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const { from, reply, isGroup, isOwner, isBotAdmin } = extra;
            
            if (!isGroup) {
                return reply('❌ This command can only be used in groups.');
            }
            
            if (!isOwner) {
                return reply('❌ Only the bot owner can use this command.');
            }
            
            if (!isBotAdmin) {
                return reply('❌ I need to be an admin to add users.');
            }
            
            const phoneNumber = args[0];
            if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
                return reply(`❌ Please provide a valid phone number.\n\n📌 Usage: ${config.prefix}add 254712345678`);
            }
            
            const userToAdd = `${phoneNumber}@s.whatsapp.net`;
            
            // Check if user is already in the group
            try {
                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants || [];
                const alreadyInGroup = participants.some(p => {
                    const pNum = p.id?.split('@')[0] || '';
                    return pNum === phoneNumber;
                });
                
                if (alreadyInGroup) {
                    return reply(`❌ User ${phoneNumber} is already in the group.`);
                }
            } catch (err) {
                // If metadata fetch fails, still try to add
                console.log('Could not check existing members, proceeding anyway');
            }
            
            await reply(`⏳ Adding ${phoneNumber} to the group...`);
            
            // Add the user
            await sock.groupParticipantsUpdate(from, [userToAdd], "add");
            
            reply(`✅ User *${phoneNumber}* has been added to the group.`);
            
        } catch (error) {
            console.error('Add command error:', error);
            
            if (error.message?.includes('403')) {
                reply('❌ Cannot add user. The number may be invalid or the user has blocked the bot.');
            } else if (error.message?.includes('408')) {
                reply('❌ Request timed out. Please try again.');
            } else if (error.message?.includes('not-authorized')) {
                reply('❌ I need to be an admin to add users.');
            } else if (error.message?.includes('participant')) {
                reply('❌ Cannot add user. They may have left the group or blocked the bot.');
            } else {
                reply(`❌ An error occurred: ${error.message}`);
            }
        }
    }
};