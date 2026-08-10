/**
 * Inbox Command - Check temporary email inbox
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'inbox',
    aliases: ['checkinbox', 'tempmailinbox'],
    category: 'general',
    description: 'Check temporary email inbox',
    usage: '.inbox <email>',
    
    async execute(sock, msg, args, extra) {
        try {
            const email = args[0];
            
            if (!email) {
                return extra.reply(`❌ Please provide the temporary email.\n\n📌 Usage: ${config.prefix}inbox example@tempmail.com\n\n💡 Use .tempmail to generate one.`);
            }
            
            await extra.reply('⏳ Checking inbox...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/tempgen/v2/inbox?apikey=gifted&email=${encodeURIComponent(email)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ No messages found in inbox.');
            }
            
            const messages = response.data.result;
            
            if (!messages || messages.length === 0) {
                return extra.reply(`📭 Inbox is empty for ${email}`);
            }
            
            let message = `📬 INBOX FOR ${email}\n\n`;
            
            for (let i = 0; i < Math.min(messages.length, 5); i++) {
                const msg = messages[i];
                message += `📧 From: ${msg.from}\n📝 Subject: ${msg.subject}\n📅 Date: ${msg.date}\n\n`;
            }
            
            message += `✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Inbox error:', error);
            extra.reply('❌ Error checking inbox.');
        }
    }
};