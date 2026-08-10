/**
 * Read QR Command - Read data from QR code image
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'readqr',
    aliases: ['qrread', 'scanqr', 'qrscanner'],
    category: 'general',
    description: 'Read data from a QR code image URL',
    usage: '.readqr <image_url>',
    
    async execute(sock, msg, args, extra) {
        try {
            const url = args[0];
            
            if (!url) {
                return extra.reply(`❌ Please provide an image URL.\n\n📌 Usage: ${config.prefix}readqr https://example.com/qr.png`);
            }
            
            await extra.reply('⏳ Reading QR code...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tools/readqr?apikey=gifted&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ Failed to read QR code. Make sure the image contains a valid QR code.');
            }
            
            const qrData = response.data.result.qrcode_data;
            
            const message = `📷 QR CODE SCANNER\n\n🔍 Data: ${qrData}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Read QR error:', error);
            extra.reply('❌ Error reading QR code.');
        }
    }
};