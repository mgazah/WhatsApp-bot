/**
 * Email Validate Command - Validate email addresses
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'emailvalidate',
    aliases: ['email', 'checkemail'],
    category: 'tools',
    description: 'Validate email addresses',
    usage: '.emailvalidate user@example.com',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`📧 *Email Validator*\n\nExample: ${config.prefix}emailvalidate user@example.com\n\n*Check if an email address is valid*`);
        }

        const email = args[0];
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/email-validate?email=${encodeURIComponent(email)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                
                const text = `╭──⌈ 📧 *EMAIL VALIDATION* ⌋
┃
┃ 📧 *Email:* ${email}
┃ ✅ *Valid Format:* ${result.valid ? 'Yes' : 'No'}
┃ ${result.domain ? `┃ 🌐 *Domain:* ${result.domain}\n┃` : '┃'}
┃ ${result.mx ? `┃ 📡 *MX Records:* ${result.mx}\n┃` : '┃'}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Email validation failed for "${email}"`);
            }
        } catch (error) {
            console.error('Email validate error:', error);
            await extra.reply(`❌ Error validating email. Please check the email address.`);
        }
    }
};