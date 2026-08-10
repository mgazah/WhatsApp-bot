/**
 * Anti-Delete Command - Enable/disable anti-delete with routing options
 */

const config = require('../../config');
const { 
    isAntiDeleteEnabled, 
    getAntiDeleteRoute,
    enableAntiDelete, 
    disableAntiDelete,
    setAntiDeleteRoute
} = require('../../utils/antideleteConfig');

module.exports = {
    name: 'antidelete',
    aliases: ['ad', 'antidel'],
    category: 'owner',
    description: 'Enable/disable anti-delete with routing options',
    usage: '.antidelete on/off/route dm/chat/status',
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
        try {
            const { reply } = extra;
            const action = args[0]?.toLowerCase();
            const subAction = args[1]?.toLowerCase();
            
            // Show full status
            if (!action) {
                const status = isAntiDeleteEnabled() ? '✅ ENABLED' : '❌ DISABLED';
                const route = getAntiDeleteRoute() === 'dm' ? '📩 Bot DM' : '💬 Original Chat';
                return reply(`🛡️ ANTI-DELETE CONTROL\n\n┌──────────────────────┐\n│ Status: ${status}\n│ Route: ${route}\n└──────────────────────┘\n\n📌 Commands:\n${config.prefix}antidelete on - Enable\n${config.prefix}antidelete off - Disable\n${config.prefix}antidelete route dm - Send all recoveries to Bot DM\n${config.prefix}antidelete route chat - Send recoveries to where message was deleted\n${config.prefix}antidelete status - Show status`);
            }
            
            // Handle on/off
            if (action === 'on') {
                if (isAntiDeleteEnabled()) {
                    return reply('⚠️ Anti-delete is already ENABLED.');
                }
                enableAntiDelete();
                return reply('✅ Anti-delete has been ENABLED.\n\nDeleted messages will now be recovered.');
            }
            
            if (action === 'off') {
                if (!isAntiDeleteEnabled()) {
                    return reply('⚠️ Anti-delete is already DISABLED.');
                }
                disableAntiDelete();
                return reply('❌ Anti-delete has been DISABLED.\n\nDeleted messages will no longer be recovered.');
            }
            
            // Handle route setting
            if (action === 'route') {
                if (subAction === 'dm') {
                    setAntiDeleteRoute('dm');
                    return reply('✅ Anti-delete route set to: 📩 BOT DM\n\nAll recovered messages will be sent to your DM.');
                } 
                else if (subAction === 'chat') {
                    setAntiDeleteRoute('chat');
                    return reply('✅ Anti-delete route set to: 💬 ORIGINAL CHAT\n\nRecovered messages will be posted in the same chat where they were deleted (Groups & Private Chats).');
                }
                else {
                    const currentRoute = getAntiDeleteRoute() === 'dm' ? '📩 Bot DM' : '💬 Original Chat';
                    return reply(`📌 Anti-Delete Route Settings\n\nCurrent Route: ${currentRoute}\n\nUsage:\n${config.prefix}antidelete route dm - Send all to Bot DM\n${config.prefix}antidelete route chat - Send to where deleted`);
                }
            }
            
            // Handle status only
            if (action === 'status') {
                const status = isAntiDeleteEnabled() ? '✅ ENABLED' : '❌ DISABLED';
                const route = getAntiDeleteRoute() === 'dm' ? '📩 Bot DM' : '💬 Original Chat';
                return reply(`🛡️ Anti-Delete Status\n\nStatus: ${status}\nRoute: ${route}`);
            }
            
            return reply(`❌ Unknown command.\n\nUsage:\n${config.prefix}antidelete on/off\n${config.prefix}antidelete route dm/chat\n${config.prefix}antidelete status`);
            
        } catch (error) {
            console.error('Anti-delete command error:', error);
            extra.reply('❌ Error executing command.');
        }
    }
};