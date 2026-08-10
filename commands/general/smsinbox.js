/**
 * SMS Inbox Command - Check temporary SMS inbox
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'smsinbox',
    aliases: ['checksms', 'tempsmsinbox'],
    category: 'general',
    description: 'Check temporary SMS inbox',
    usage: '.smsinbox <number>',
    
    async execute(sock, msg, args, extra) {
        try {
            const number = args[0];
            
            if (!number) {
                return extra.reply(`❌ Please provide the temporary number.\n\n📌 Usage: ${config.prefix}smsinbox +1234567890\n\n💡 Use .tempsms to generate one.`);
            }
            
            await extra.reply('⏳ Checking SMS inbox...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tempgen/sms/inbox?apikey=gifted&number=${encodeURIComponent(number)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ No SMS messages found.');
            }
            
            const messages = response.data.result;
            
            if (!messages || messages.length === 0) {
                return extra.reply(`📭 No messages for ${number}`);
            }
            
            let message = `📬 SMS INBOX FOR ${number}\n\n`;
            
            for (let i = 0; i < Math.min(messages.length, 5); i++) {
                const msg = messages[i];
                message += `📱 From: ${msg.from}\n💬 Message: ${msg.message}\n📅 Time: ${msg.time}\n\n`;
            }
            
            message += `✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('SMS inbox error:', error);
            extra.reply('❌ Error checking SMS inbox.');
        }
    }
};