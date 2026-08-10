/**
 * EPL Matches Command - Get English Premier League matches
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'eplmatches',
    aliases: ['premmatches', 'eplresults', 'premresults'],
    category: 'sports',
    description: 'Get English Premier League matches and results',
    usage: '.eplmatches',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching EPL matches...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/football/epl/matches?apikey=gifted';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch EPL matches.');
            }
            
            const { competition, matches } = response.data.result;
            
            let message = `╭──⌈ ⚽ ${competition} ⌋\n┃\n┃ 📋 MATCH RESULTS\n┃\n`;
            
            let currentMatchday = 1;
            for (const match of matches) {
                if (match.matchday !== currentMatchday) {
                    currentMatchday = match.matchday;
                    message += `┃\n┃ 📅 Matchday ${currentMatchday}\n┃\n`;
                }
                
                const winnerEmoji = match.winner === 'Draw' ? '🤝' : (match.winner === match.homeTeam ? '🏠' : '✈️');
                message += `┃ ${match.homeTeam} vs ${match.awayTeam}\n`;
                message += `┃ ${winnerEmoji} Score: ${match.score} | Winner: ${match.winner}\n┃\n`;
            }
            
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('EPL matches error:', error);
            extra.reply('❌ Error fetching EPL matches.');
        }
    }
};