/**
 * Leagues Command - Get list of football leagues
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'leagues',
    aliases: ['league', 'competitions', 'footballleagues'],
    category: 'sports',
    description: 'Get list of available football leagues',
    usage: '.leagues',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching leagues...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/football/leagues?apikey=gifted';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch leagues.');
            }
            
            const leagues = response.data.result;
            
            let message = `╭──⌈ 🏆 FOOTBALL LEAGUES ⌋\n┃\n`;
            
            for (let i = 0; i < leagues.length; i++) {
                const league = leagues[i];
                message += `┃ ${i + 1}. ${league.name}\n`;
                message += `┃    📋 ID: ${league.id}\n┃\n`;
            }
            
            message += `┃ 💡 Commands:\n`;
            message += `┃    .eplscorers - EPL top scorers\n`;
            message += `┃    .eplmatches - EPL matches\n`;
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Leagues error:', error);
            extra.reply('❌ Error fetching leagues.');
        }
    }
};