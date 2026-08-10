/**
 * EPL Scorers Command - Get English Premier League top scorers
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'eplscorers',
    aliases: ['premierscorers', 'epltopscores', 'premgoal'],
    category: 'sports',
    description: 'Get English Premier League top scorers',
    usage: '.eplscorers',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching EPL top scorers...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/football/epl/scorers?apikey=gifted';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch EPL scorers.');
            }
            
            const { competition, topScorers } = response.data.result;
            
            let message = `╭──⌈ ⚽ ${competition} ⌋\n┃\n┃ 📊 TOP SCORERS\n┃\n`;
            
            for (const scorer of topScorers) {
                message += `┃ ${scorer.rank}. ${scorer.player}\n`;
                message += `┃    🏟️ ${scorer.team}\n`;
                message += `┃    ⚽ ${scorer.goals} goals`;
                if (scorer.assists && scorer.assists !== 'N/A') message += ` | 🎯 ${scorer.assists} assists`;
                if (scorer.penalties && scorer.penalties !== 'N/A') message += ` | ⚠️ ${scorer.penalties} pens`;
                message += `\n┃\n`;
            }
            
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('EPL scorers error:', error);
            extra.reply('❌ Error fetching EPL scorers.');
        }
    }
};