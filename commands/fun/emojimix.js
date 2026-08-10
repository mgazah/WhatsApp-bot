/**
 * Emoji Mix Command - Mix two emojis to create a new one
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'emojimix',
    aliases: ['mixemoji', 'emojicombine'],
    category: 'fun',
    description: 'Mix two emojis to create a new emoji',
    usage: '.emojimix 😂 🙄',
    
    async execute(sock, msg, args, extra) {
        try {
            if (args.length < 2) {
                return extra.reply(`❌ Please provide two emojis.\n\n📌 Usage: ${config.prefix}emojimix 😂 🙄`);
            }
            
            const emoji1 = args[0];
            const emoji2 = args[1];
            
            await extra.reply(`⏳ Mixing ${emoji1} + ${emoji2}...`);
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tools/emojimix?apikey=gifted&emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            if (!response.data) {
                return extra.reply('❌ Failed to mix emojis. Try different emojis.');
            }
            
            await sock.sendMessage(extra.from, {
                image: Buffer.from(response.data),
                caption: `🎨 Mixed: ${emoji1} + ${emoji2}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`
            }, { quoted: msg });
            
        } catch (error) {
            console.error('Emoji mix error:', error);
            extra.reply('❌ Error mixing emojis. Make sure you used valid emojis.');
        }
    }
};