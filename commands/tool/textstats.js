/**
 * Text Stats Command - Get text statistics
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'textstats',
    aliases: ['stats'],
    category: 'tools',
    description: 'Get statistics about text',
    usage: '.textstats Your text here',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`📊 *Text Statistics*\n\nExample: ${config.prefix}textstats Hello world! This is a test.`);
        }

        const text = args.join(' ');
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/textstats?text=${encodeURIComponent(text)}`);
            
            if (response.data && response.data.status === 'success') {
                const stats = response.data.result;
                
                const textResult = `╭──⌈ 📊 *TEXT STATISTICS* ⌋
┃
┃ 📝 *Text:* ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}
┃
┃ 📈 *Stats:*
┃ • Characters: ${stats.characters || stats.length || text.length}
┃ • Words: ${stats.words || text.split(/\s+/).length}
┃ • Lines: ${stats.lines || text.split(/\n/).length}
┃ • Spaces: ${stats.spaces || (text.match(/\s/g) || []).length}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(textResult);
            } else {
                await extra.reply(`❌ Error analyzing text.`);
            }
        } catch (error) {
            console.error('Text stats error:', error);
            await extra.reply(`❌ Error calculating text statistics.`);
        }
    }
};