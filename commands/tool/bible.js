/**
 * Bible Command - Get Bible verses
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'bible',
    category: 'tools',
    description: 'Get Bible verses by book, chapter, and verse',
    usage: '.bible john 3:16',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`📖 *Bible Verse Lookup*\n\nExample: ${config.prefix}bible john 3:16\n\n*Supported formats:*\n• genesis 1:1\n• john 3:16\n• psalms 23`);
        }

        const query = args.join(' ');
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/bible?query=${encodeURIComponent(query)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                const text = `╭──⌈ 📖 *BIBLE VERSE* ⌋
┃
┃ 📚 *Reference:* ${result.reference || query}
┃ 📖 *Verse:* ${result.verse || result.text}
┃
┃ 📝 *Text:*
┃ ${result.text || result.verse}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ No Bible verse found for "${query}"`);
            }
        } catch (error) {
            console.error('Bible error:', error);
            await extra.reply(`❌ Error fetching Bible verse. Please check your query format.`);
        }
    }
};
