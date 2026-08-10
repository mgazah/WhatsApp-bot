/**
 * Create PDF Command - Convert text to PDF
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'topdf',
    aliases: ['makepdf', 'texttopdf'],
    category: 'utility',
    description: 'Convert text to PDF document',
    usage: '.topdf <text>',
    
    async execute(sock, msg, args, extra) {
        try {
            const text = args.join(' ');
            
            if (!text) {
                return extra.reply(`❌ Please provide text to convert.\n\n📌 Usage: ${config.prefix}topdf Hello World`);
            }
            
            await extra.reply('⏳ Creating PDF...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tools/topdf?apikey=gifted&query=${encodeURIComponent(text)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            await sock.sendMessage(extra.from, { document: Buffer.from(response.data), mimetype: 'application/pdf', fileName: 'document.pdf', caption: '📄 PDF created successfully!' }, { quoted: msg });
            
        } catch (error) {
            console.error('Create PDF error:', error);
            extra.reply('❌ Error creating PDF.');
        }
    }
};
