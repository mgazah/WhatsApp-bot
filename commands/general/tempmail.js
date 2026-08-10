/**
 * Temp Mail Command - Generate temporary email
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'tempmail',
    aliases: ['tempmailgen', 'fakeemail'],
    category: 'general',
    description: 'Generate temporary email address',
    usage: '.tempmail',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Generating temporary email...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tempgen/v2/generate?apikey=gifted&mode=random`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ Failed to generate temporary email.');
            }
            
            const email = response.data.result.email;
            
            const message = `📧 TEMPORARY EMAIL\n\n📨 Email: ${email}\n\n💡 Use .inbox to check messages\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Temp mail error:', error);
            extra.reply('❌ Error generating temporary email.');
        }
    }
};