/**
 * Player Search Command - Search for football players
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'playersearch',
    aliases: ['player', 'searchplayer', 'findplayer'],
    category: 'sports',
    description: 'Search for football players by name',
    usage: '.playersearch <name>',
    
    async execute(sock, msg, args, extra) {
        try {
            const name = args.join(' ');
            
            if (!name) {
                return extra.reply(`❌ Please provide a player name.\n\n📌 Usage: ${config.prefix}playersearch Messi`);
            }
            
            await extra.reply(`⏳ Searching for "${name}"...`);
            
            const apiUrl = `https://api.giftedtech.co.ke/api/football/player-search?apikey=gifted&name=${encodeURIComponent(name)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ No players found.');
            }
            
            const players = response.data.result;
            
            if (players.length === 0) {
                return extra.reply(`❌ No players found for "${name}".`);
            }
            
            let message = `╭──⌈ ⚽ PLAYER SEARCH ⌋\n┃\n┃ 🔍 Search: ${name}\n┃ 📊 Results: ${players.length}\n┃\n`;
            
            for (let i = 0; i < Math.min(players.length, 10); i++) {
                const player = players[i];
                message += `┃ ${i + 1}. ${player.name}\n`;
                message += `┃    🏟️ ${player.team}\n`;
                message += `┃    📍 ${player.nationality || 'N/A'}\n`;
                message += `┃    📋 ${player.position || 'N/A'}\n┃\n`;
            }
            
            message += `┃ 💡 .playerid <id> for details\n`;
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Player search error:', error);
            extra.reply('❌ Error searching for players.');
        }
    }
};