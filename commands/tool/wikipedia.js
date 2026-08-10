/**
 * Wikipedia Command - Search Wikipedia articles
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'wikipedia',
    aliases: ['wiki'],
    category: 'tools',
    description: 'Search Wikipedia for information',
    usage: '.wikipedia Elon Musk',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`🌐 *Wikipedia Search*\n\nExample: ${config.prefix}wikipedia Earth\n\n*Search for any topic on Wikipedia*`);
        }

        const query = args.join(' ');
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/wikipedia?query=${encodeURIComponent(query)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                const summary = result.summary || result.extract || result.description || 'No summary available';
                const truncated = summary.length > 1500 ? summary.substring(0, 1500) + '...' : summary;
                
                const text = `╭──⌈ 🌐 *WIKIPEDIA* ⌋
┃
┃ 📚 *Title:* ${result.title || query}
┃
┃ 📝 *Summary:*
┃ ${truncated}
┃
${result.url ? `┃ 🔗 *URL:* ${result.url}\n┃` : '┃'}
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ No Wikipedia article found for "${query}"`);
            }
        } catch (error) {
            console.error('Wikipedia error:', error);
            await extra.reply(`❌ Error fetching Wikipedia article. Please try again.`);
        }
    }
};