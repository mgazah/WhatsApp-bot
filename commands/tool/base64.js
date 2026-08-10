/**
 * Base64 Command - Encode or decode Base64
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'base64',
    aliases: ['b64'],
    category: 'tools',
    description: 'Encode or decode Base64 strings',
    usage: '.base64 encode hello world\n.base64 decode aGVsbG8gd29ybGQ=',
    
    async execute(sock, msg, args, extra) {
        if (args.length < 2) {
            return extra.reply(`🔐 *Base64 Tool*\n\n*Encode:* ${config.prefix}base64 encode text here\n*Decode:* ${config.prefix}base64 decode aGVsbG8=`);
        }

        const action = args[0].toLowerCase();
        const text = args.slice(1).join(' ');
        
        let endpoint = '';
        if (action === 'encode') {
            endpoint = `https://apis.xwolf.space/api/tools/base64encode?text=${encodeURIComponent(text)}`;
        } else if (action === 'decode') {
            endpoint = `https://apis.xwolf.space/api/tools/base64decode?text=${encodeURIComponent(text)}`;
        } else {
            return extra.reply(`❌ Invalid action. Use "encode" or "decode"`);
        }
        
        try {
            const response = await axios.get(endpoint);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                const text = `╭──⌈ 🔐 *BASE64 ${action.toUpperCase()}* ⌋
┃
┃ 📝 *${action === 'encode' ? 'Original' : 'Encoded'}:* 
┃ ${action === 'encode' ? text : result.original || text}
┃
┃ 🔄 *${action === 'encode' ? 'Encoded' : 'Decoded'}:* 
┃ ${action === 'encode' ? result.encoded : result.decoded}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Base64 ${action} failed. Check your input.`);
            }
        } catch (error) {
            console.error('Base64 error:', error);
            await extra.reply(`❌ Error during Base64 ${action}. Please try again.`);
        }
    }
};