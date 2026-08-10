/**
 * URL Encode Command - Encode or decode URLs
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'urlencode',
    aliases: ['url'],
    category: 'tools',
    description: 'Encode or decode URL strings',
    usage: '.urlencode encode https://example.com\n.urlencode decode https%3A%2F%2Fexample.com',
    
    async execute(sock, msg, args, extra) {
        if (args.length < 2) {
            return extra.reply(`🔗 *URL Tool*\n\n*Encode:* ${config.prefix}urlencode encode https://example.com\n*Decode:* ${config.prefix}urlencode decode https%3A%2F%2Fexample.com`);
        }

        const action = args[0].toLowerCase();
        const text = args.slice(1).join(' ');
        
        let endpoint = '';
        if (action === 'encode') {
            endpoint = `https://apis.xwolf.space/api/tools/urlencode?text=${encodeURIComponent(text)}`;
        } else if (action === 'decode') {
            endpoint = `https://apis.xwolf.space/api/tools/urldecode?text=${encodeURIComponent(text)}`;
        } else {
            return extra.reply(`❌ Invalid action. Use "encode" or "decode"`);
        }
        
        try {
            const response = await axios.get(endpoint);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                const textResult = `╭──⌈ 🔗 *URL ${action.toUpperCase()}* ⌋
┃
┃ 📝 *${action === 'encode' ? 'Original' : 'Encoded'}:* 
┃ ${action === 'encode' ? text : result.original || text}
┃
┃ 🔄 *${action === 'encode' ? 'Encoded' : 'Decoded'}:* 
┃ ${action === 'encode' ? result.encoded : result.decoded}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(textResult);
            } else {
                await extra.reply(`❌ URL ${action} failed. Check your input.`);
            }
        } catch (error) {
            console.error('URL error:', error);
            await extra.reply(`❌ Error during URL ${action}. Please try again.`);
        }
    }
};