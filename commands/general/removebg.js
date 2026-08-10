/**
 * Remove Background Command - Remove image background
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'removebg',
    aliases: ['rmbg', 'nobg', 'bgremove'],
    category: 'general',
    description: 'Remove background from an image',
    usage: '.removebg <image_url>',
    
    async execute(sock, msg, args, extra) {
        try {
            const url = args[0];
            
            if (!url) {
                return extra.reply(`❌ Please provide an image URL.\n\n📌 Usage: ${config.prefix}removebg https://example.com/image.jpg`);
            }
            
            await extra.reply('⏳ Removing background...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tools/removebgv2?apikey=gifted&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            await sock.sendMessage(extra.from, { image: Buffer.from(response.data), caption: '🖼️ Background removed successfully!' }, { quoted: msg });
            
        } catch (error) {
            console.error('Remove BG error:', error);
            extra.reply('❌ Error removing background.');
        }
    }
};