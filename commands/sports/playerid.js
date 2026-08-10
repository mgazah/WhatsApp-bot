/**
 * Player ID Command - Get detailed player information by ID
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'playerid',
    aliases: ['playerinfo', 'playerbyid'],
    category: 'sports',
    description: 'Get detailed player information by ID',
    usage: '.playerid <player_id>',
    
    async execute(sock, msg, args, extra) {
        try {
            const playerId = args[0];
            
            if (!playerId) {
                return extra.reply(`❌ Please provide a player ID.\n\n📌 Usage: ${config.prefix}playerid 34146370\n\n💡 Use .playersearch to find player IDs.`);
            }
            
            await extra.reply('⏳ Fetching player details...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/football/player-id?apikey=gifted&id=${playerId}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Player not found.');
            }
            
            const player = response.data.result;
            
            let message = `╭──⌈ ⚽ PLAYER DETAILS ⌋\n┃\n`;
            message += `┃ 🏆 Name: ${player.name}\n`;
            message += `┃ 🏟️ Team: ${player.team}\n`;
            message += `┃ 📍 Nationality: ${player.nationality || 'N/A'}\n`;
            message += `┃ 📅 Born: ${player.birthDate || 'N/A'}\n`;
            message += `┃ 📏 Height: ${player.height || 'N/A'}\n`;
            message += `┃ ⚖️ Weight: ${player.weight || 'N/A'}\n`;
            message += `┃ 📋 Position: ${player.position || 'N/A'}\n`;
            message += `┃ 📊 Status: ${player.status || 'N/A'}\n`;
            message += `┃\n`;
            
            if (player.description) {
                const shortDesc = player.description.length > 200 ? player.description.substring(0, 200) + '...' : player.description;
                message += `┃ 📝 Bio:\n┃ ${shortDesc}\n┃\n`;
            }
            
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Player ID error:', error);
            extra.reply('❌ Error fetching player details.');
        }
    }
};