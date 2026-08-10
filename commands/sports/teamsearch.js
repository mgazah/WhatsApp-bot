/**
 * Team Search Command - Search for football teams
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'teamsearch',
    aliases: ['team', 'searchteam', 'findteam', 'club'],
    category: 'sports',
    description: 'Search for football teams by name',
    usage: '.teamsearch <team_name>',
    
    async execute(sock, msg, args, extra) {
        try {
            const teamName = args.join(' ');
            
            if (!teamName) {
                return extra.reply(`❌ Please provide a team name.\n\n📌 Usage: ${config.prefix}teamsearch Arsenal`);
            }
            
            await extra.reply(`⏳ Searching for "${teamName}"...`);
            
            const apiUrl = `https://api.giftedtech.co.ke/api/football/team-search?apikey=gifted&name=${encodeURIComponent(teamName)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ No teams found.');
            }
            
            const team = response.data.result[0];
            
            if (!team) {
                return extra.reply(`❌ No team found for "${teamName}".`);
            }
            
            let message = `╭──⌈ ⚽ TEAM DETAILS ⌋\n┃\n`;
            message += `┃ 🏆 Name: ${team.name}\n`;
            message += `┃ 📛 Short: ${team.shortName || 'N/A'}\n`;
            message += `┃ 🏟️ League: ${team.league || 'N/A'}\n`;
            message += `┃ 🏟️ Stadium: ${team.stadium || 'N/A'}\n`;
            message += `┃ 📍 Location: ${team.location || 'N/A'}\n`;
            message += `┃ 📅 Founded: ${team.formedYear || 'N/A'}\n`;
            message += `┃ 👥 Capacity: ${team.stadiumCapacity?.toLocaleString() || 'N/A'}\n`;
            message += `┃ 🌍 Country: ${team.country || 'N/A'}\n┃\n`;
            
            if (team.description) {
                const shortDesc = team.description.length > 200 ? team.description.substring(0, 200) + '...' : team.description;
                message += `┃ 📝 About:\n┃ ${shortDesc}\n┃\n`;
            }
            
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Team search error:', error);
            extra.reply('❌ Error searching for team.');
        }
    }
};