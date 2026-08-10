/**
 * QR Code Command - Generate QR code from text
 */

const config = require('../../config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'qrcode',
    aliases: ['qr'],
    category: 'tools',
    description: 'Generate QR code from text or URL',
    usage: '.qrcode https://example.com',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`🔲 *QR Code Generator*\n\nExample: ${config.prefix}qrcode https://example.com\n\n*Usage:*\n• Text\n• URL\n• Phone number`);
        }

        const text = args.join(' ');
        
        try {
            await extra.reply(`⏳ *Generating QR code for:* ${text}`);
            
            const response = await axios.get(`https://apis.xwolf.space/api/tools/qrcode?text=${encodeURIComponent(text)}`, {
                responseType: 'arraybuffer'
            });
            
            const tempPath = path.join(__dirname, '../../temp', `qr_${Date.now()}.png`);
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            
            fs.writeFileSync(tempPath, response.data);
            
            await sock.sendMessage(extra.from, {
                image: fs.readFileSync(tempPath),
                caption: `🔲 *QR Code Generated*\n\n📝 *Data:* ${text}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`
            }, { quoted: msg });
            
            fs.unlinkSync(tempPath);
        } catch (error) {
            console.error('QR Code error:', error);
            await extra.reply(`❌ Error generating QR code. Please try again.`);
        }
    }
};