/**
 * Hash Command - Generate various hashes
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'hash',
    aliases: ['hashgen', 'encrypt'],
    category: 'tools',
    description: 'Generate MD5, SHA1, SHA256 hashes',
    usage: '.hash md5 text\n.hash sha256 text',
    
    async execute(sock, msg, args, extra) {
        if (args.length < 2) {
            return extra.reply(`🔐 *Hash Generator*\n\n*Usage:* ${config.prefix}hash md5 text here\n${config.prefix}hash sha256 text here\n\n*Supported algorithms:* md5, sha1, sha256, sha512`);
        }

        const algorithm = args[0].toLowerCase();
        const text = args.slice(1).join(' ');
        
        const validAlgos = ['md5', 'sha1', 'sha256', 'sha512'];
        if (!validAlgos.includes(algorithm)) {
            return extra.reply(`❌ Invalid algorithm. Use: ${validAlgos.join(', ')}`);
        }
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/hash?algorithm=${algorithm}&text=${encodeURIComponent(text)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                
                const textResult = `╭──⌈ 🔐 *HASH GENERATOR* ⌋
┃
┃ 🔧 *Algorithm:* ${algorithm.toUpperCase()}
┃ 📝 *Input:* ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}
┃
┃ 🔑 *Hash:* 
┃ \`${result.hash}\`
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(textResult);
            } else {
                await extra.reply(`❌ Error generating ${algorithm} hash.`);
            }
        } catch (error) {
            console.error('Hash error:', error);
            await extra.reply(`❌ Error generating hash. Please try again.`);
        }
    }
};