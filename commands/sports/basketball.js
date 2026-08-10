/**
 * Basketball Command - Get live basketball scores
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'basketball',
    aliases: ['nba', 'bblive', 'basketballlive'],
    category: 'sports',
    description: 'Get live basketball scores and results',
    usage: '.basketball',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching basketball results...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/football/basketball-live?apikey=gifted';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch basketball results.');
            }
            
            const { totalMatches, matches } = response.data.result;
            
            let message = `╭──⌈ 🏀 BASKETBALL RESULTS ⌋\n┃\n┃ 📊 Total Matches: ${totalMatches}\n┃\n`;
            
            for (let i = 0; i < Math.min(matches.length, 15); i++) {
                const match = matches[i];
                const date = new Date(match.startTime).toLocaleDateString();
                message += `┃ 🏆 ${match.homeTeam} vs ${match.awayTeam}\n`;
                message += `┃    🏟️ ${match.league}\n`;
                message += `┃    ⚽ Score: ${match.homeScore} - ${match.awayScore}\n`;
                message += `┃    📅 ${date}\n┃\n`;
            }
            
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Basketball error:', error);
            extra.reply('❌ Error fetching basketball results.');
        }
    }
};