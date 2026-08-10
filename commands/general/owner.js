/**
 * Owner Command - Sends bot owner's contact card (vCard)
 */

const config = require('../../config');

module.exports = {
    name: 'owner',
    aliases: ['creator', 'dev', 'botowner', 'support'],
    category: 'general',
    description: 'Show bot owner contact information',
    usage: '.owner',
    ownerOnly: false,

    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;

            const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
            const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber];
            
            let message = `╭──⌈ 👑 BOT OWNER ⌋
┃
┃ 🤖 Bot: ${config.botName}
┃ 📦 Version: ${config.botVersion || '1.0.0'}
┃
`;

            for (let i = 0; i < ownerNumbers.length; i++) {
                const num = ownerNumbers[i];
                const name = ownerNames[i] || ownerNames[0] || 'Bot Owner';
                const formattedNum = num.length === 12 ? `+${num}` : num;
                message += `┃ 👤 Owner ${i + 1}: ${name}
┃ 📞 Contact: ${formattedNum}
┃
`;
            }

            message += `╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;

            await extra.reply(message);
            
            // Also send vCard for easy saving
            const vCards = ownerNumbers.map((num, index) => {
                const name = ownerNames[index] || ownerNames[0] || 'Bot Owner';
                return {
                    vcard: `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;waid=${num}:${num}
END:VCARD`
                };
            });

            await sock.sendMessage(chatId, {
                contacts: {
                    displayName: ownerNames[0] || 'Bot Owner',
                    contacts: vCards
                }
            });

        } catch (error) {
            console.error('Owner command error:', error);
            await extra.reply(`❌ Error: ${error.message}`);
        }
    }
};