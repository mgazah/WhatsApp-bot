/**
 * Password Strength Command - Check password strength
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'passwordstrength',
    aliases: ['passstrength', 'checkpass'],
    category: 'tools',
    description: 'Check password strength',
    usage: '.passwordstrength mypassword123',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`🔐 *Password Strength Checker*\n\nExample: ${config.prefix}passwordstrength MySecurePass123!\n\n*Get feedback on password strength*`);
        }

        const password = args.join(' ');
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/password-strength?password=${encodeURIComponent(password)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                
                let strengthEmoji = '';
                let strengthColor = '';
                if (result.strength === 'Weak') {
                    strengthEmoji = '🔴';
                } else if (result.strength === 'Medium') {
                    strengthEmoji = '🟡';
                } else if (result.strength === 'Strong') {
                    strengthEmoji = '🟢';
                } else if (result.strength === 'Very Strong') {
                    strengthEmoji = '💪';
                }
                
                const text = `╭──⌈ 🔐 *PASSWORD STRENGTH* ⌋
┃
┃ 🔑 *Password:* ${'*'.repeat(Math.min(password.length, 10))}
┃ ${strengthEmoji} *Strength:* ${result.strength || 'Unknown'}
┃
┃ 📊 *Score:* ${result.score || result.percentage || 'N/A'}/100
┃
${result.feedback ? `┃ 💡 *Feedback:* ${result.feedback}\n┃` : '┃'}
${result.suggestions ? `┃ 📝 *Suggestions:* ${result.suggestions}\n┃` : '┃'}
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Error checking password strength.`);
            }
        } catch (error) {
            console.error('Password strength error:', error);
            await extra.reply(`❌ Error checking password strength. Please try again.`);
        }
    }
};
