/**
 * Remini Command - Enhance image quality
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'remini',
    aliases: ['enhance', 'hdimage', 'improveimage'],
    category: 'ai',
    description: 'Enhance image quality using AI',
    usage: '.remini <image_url>',
    
    async execute(sock, msg, args, extra) {
        try {
            const url = args[0];
            
            if (!url) {
                return extra.reply(`❌ Please provide an image URL.\n\n📌 Usage: ${config.prefix}remini https://example.com/image.jpg`);
            }
            
            await extra.reply('⏳ Enhancing image quality...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tools/remini?apikey=gifted&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            await sock.sendMessage(extra.from, { image: Buffer.from(response.data), caption: '✨ Image enhanced successfully!' }, { quoted: msg });
            
        } catch (error) {
            console.error('Remini error:', error);
            extra.reply('❌ Error enhancing image.');
        }
    }
};