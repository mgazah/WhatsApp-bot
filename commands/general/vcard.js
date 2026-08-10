/**
 * VCard Command - Create contact card from replied message
 */

const config = require('../../config');

module.exports = {
    name: 'vcard',
    aliases: ['contact', 'savecontact'],
    category: 'general',
    description: 'Create a contact card (vCard) from a replied message',
    usage: '.vcard <Name>',
    
    async execute(sock, msg, args, extra) {
        try {
            // Check if the user provided a name
            if (!args || args.length === 0) {
                return extra.reply(`❌ *Invalid format!*\n\n➤ Usage: ${config.prefix}vcard <Name>\n➤ Example: ${config.prefix}vcard Lord Malvin\n\nℹ️ You must provide a name for the contact.`);
            }

            // Check if the user replied to a message
            if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                return extra.reply(`❌ *Missing Reply!*\n\n➤ You must reply to a user's message to create their contact.\n➤ Example: Reply to a user's message and type ${config.prefix}vcard Lord Malvin`);
            }

            // Get the sender's number from the quoted message
            const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
            const quotedSender = msg.message.extendedTextMessage.contextInfo.mentionedJid?.[0];
            
            let number = quotedParticipant || quotedSender;
            
            if (!number) {
                return extra.reply(`❌ *Phone Number Not Found!*\n\n➤ The bot was unable to extract the phone number from the replied message.\n➤ Try replying to a valid user message.`);
            }

            // Format the phone number
            const cleanNumber = number.replace(/[@s.whatsapp.net]/g, "");

            // Get the contact name from arguments
            const contactName = args.join(" ");

            // Create the vCard format
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL;type=CELL;waid=${cleanNumber}:${cleanNumber}\nEND:VCARD`;

            // Send the vCard
            await sock.sendMessage(extra.from, {
                contacts: {
                    displayName: contactName,
                    contacts: [{ vcard }]
                }
            }, { quoted: msg });
            
        } catch (error) {
            console.error('VCard error:', error);
            extra.reply(`❌ *An unexpected error occurred!*\n\n➤ Possible reasons:\n1️⃣ WhatsApp blocked vCard sending temporarily.\n2️⃣ The replied message doesn't contain a valid number.\n3️⃣ A bot error occurred.\n\n🔄 *Try again later or contact the bot owner.*`);
        }
    }
};