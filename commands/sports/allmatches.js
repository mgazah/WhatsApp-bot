/**
 * All Matches Command - Get all football matches
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'allmatches',
    aliases: ['matches', 'football', 'sports'],
    category: 'sports',
    description: 'Get all football matches',
    usage: '.allmatches',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching all matches...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/sports/all?apikey=gifted&category=football';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch matches.');
            }
            
            const { totalMatches, matches } = response.data.result;
            
            let message = `╭──⌈ ⚽ ALL MATCHES ⌋\n┃\n┃ 📊 Total: ${totalMatches} matches\n┃\n`;
            
            for (let i = 0; i < Math.min(matches.length, 15); i++) {
                const match = matches[i];
                const date = new Date(match.date).toLocaleString();
                message += `┃ 🏆 ${match.title}\n┃ 🕒 ${date}\n┃\n`;
            }
            
            if (matches.length > 15) {
                message += `┃ 📌 +${matches.length - 15} more matches\n┃\n`;
            }
            
            message += `┃ 💡 .prediction <match> for predictions\n`;
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('All matches error:', error);
            extra.reply('❌ Error fetching matches.');
        }
    }
};