/**
 * Football News Command - Get latest football news
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'footballnews',
    aliases: ['fnews', 'sportsnews', 'football-news'],
    category: 'sports',
    description: 'Get latest football news',
    usage: '.footballnews',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching football news...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/football/news?apikey=gifted';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch football news.');
            }
            
            const { items } = response.data.result;
            
            if (!items || items.length === 0) {
                return extra.reply('📰 No football news available at the moment.');
            }
            
            let message = `╭──⌈ 📰 FOOTBALL NEWS ⌋\n┃\n`;
            
            for (let i = 0; i < Math.min(items.length, 10); i++) {
                const news = items[i];
                const date = new Date(parseInt(news.createdAt)).toLocaleDateString();
                message += `┃ 📌 ${news.title}\n`;
                message += `┃ 📅 ${date}\n`;
                message += `┃ 👁️ ${news.stat.viewCount} views\n┃\n`;
            }
            
            message += `┃ 💡 Use .footballnews for more\n`;
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Football news error:', error);
            extra.reply('❌ Error fetching football news.');
        }
    }
};
