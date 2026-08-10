/**
 * LiveScore Command - Get live football scores
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'livescore',
    aliases: ['score', 'livescores', 'footballscore'],
    category: 'sports',
    description: 'Get live football scores',
    usage: '.livescore',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching live scores...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/football/livescore?apikey=gifted';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch live scores.');
            }
            
            const scores = response.data.result;
            
            if (!scores.length) {
                return extra.reply('⚽ No live scores at the moment.');
            }
            
            let message = `╭──⌈ 📊 LIVE SCORES ⌋\n┃\n`;
            
            for (let i = 0; i < Math.min(scores.length, 15); i++) {
                const score = scores[i];
                message += `┃ 🏆 ${score.match}\n`;
                message += `┃ 🏟️ ${score.league}\n`;
                message += `┃ ⚽ Score: ${score.score || '0-0'}\n`;
                message += `┃ 🕒 ${score.time || 'Live'}\n┃\n`;
            }
            
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Live score error:', error);
            extra.reply('❌ Error fetching live scores.');
        }
    }
};
