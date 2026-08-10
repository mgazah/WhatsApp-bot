/**
 * Live Matches Command - Get live football matches
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'live',
    aliases: ['livematch', 'livefootball'],
    category: 'sports',
    description: 'Get live football matches',
    usage: '.live',
    
    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('⏳ Fetching live matches...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/sports/live?apikey=gifted&category=football';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch live matches.');
            }
            
            const { totalMatches, matches } = response.data.result;
            
            if (totalMatches === 0) {
                return extra.reply('⚽ No live matches at the moment.');
            }
            
            let message = `╭──⌈ ⚽ LIVE MATCHES ⌋\n┃\n┃ 📊 Total: ${totalMatches} matches\n┃\n`;
            
            for (let i = 0; i < Math.min(matches.length, 10); i++) {
                const match = matches[i];
                const date = new Date(match.date).toLocaleTimeString();
                message += `┃ 🏆 ${match.title}\n┃ 🕒 Time: ${date}\n┃\n`;
            }
            
            if (matches.length > 10) {
                message += `┃ 📌 +${matches.length - 10} more matches\n┃\n`;
            }
            
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Live matches error:', error);
            extra.reply('❌ Error fetching live matches.');
        }
    }
};