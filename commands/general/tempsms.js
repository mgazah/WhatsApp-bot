/**
 * Temp SMS Command - Generate temporary SMS number
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'tempsms',
    aliases: ['fakesms', 'tempnumber'],
    category: 'general',
    description: 'Generate temporary SMS number',
    usage: '.tempsms',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Generating temporary SMS number...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tempgen/sms/generate?apikey=gifted&country=random`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ Failed to generate temporary SMS number.');
            }
            
            const number = response.data.result.number;
            
            const message = `📱 TEMPORARY SMS NUMBER\n\n📞 Number: ${number}\n\n💡 Use .smsinbox <number> to check messages\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Temp SMS error:', error);
            extra.reply('❌ Error generating temporary SMS number.');
        }
    }
};