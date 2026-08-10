/**
 * Watermark Remover Command - Remove watermarks from images
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'watermarkremover',
    aliases: ['rmwatermark', 'nowatermark'],
    category: 'ai',
    description: 'Remove watermark from an image',
    usage: '.watermarkremover <image_url>',
    
    async execute(sock, msg, args, extra) {
        try {
            const url = args[0];
            
            if (!url) {
                return extra.reply(`❌ Please provide an image URL.\n\n📌 Usage: ${config.prefix}watermarkremover https://example.com/image.jpg`);
            }
            
            await extra.reply('⏳ Removing watermark...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tools/watermarkremover?apikey=gifted&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            await sock.sendMessage(extra.from, { image: Buffer.from(response.data), caption: '💧 Watermark removed!' }, { quoted: msg });
            
        } catch (error) {
            console.error('Watermark remover error:', error);
            extra.reply('❌ Error removing watermark.');
        }
    }
};