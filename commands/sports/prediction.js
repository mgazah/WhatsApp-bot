/**
 * Prediction Command - Get football match predictions
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'prediction',
    aliases: ['predict', 'pred', 'matchpredict'],
    category: 'sports',
    description: 'Get football match predictions',
    usage: '.prediction <match name> or .prediction list',
    
    async execute(sock, msg, args, extra) {
        try {
            const query = args.join(' ').toLowerCase();
            
            if (!query) {
                return extra.reply(`❌ Please provide a match name or use ".prediction list" to see available matches.`);
            }
            
            await extra.reply('⏳ Fetching predictions...');
            
            const apiUrl = 'https://api.giftedtech.co.ke/api/football/predictions?apikey=gifted';
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.result) {
                return extra.reply('❌ Failed to fetch predictions.');
            }
            
            const predictions = response.data.result;
            
            // Show list of matches
            if (query === 'list') {
                let message = `╭──⌈ 📋 MATCH LIST ⌋\n┃\n`;
                for (let i = 0; i < Math.min(predictions.length, 20); i++) {
                    const p = predictions[i];
                    message += `┃ ${i + 1}. ${p.match}\n`;
                }
                message += `┃\n┃ 💡 .prediction <match name>\n`;
                message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
                return extra.reply(message);
            }
            
            // Find matching prediction
            const prediction = predictions.find(p => 
                p.match.toLowerCase().includes(query) || 
                query.includes(p.match.toLowerCase().split(' vs ')[0])
            );
            
            if (!prediction) {
                return extra.reply(`❌ Match not found. Use ".prediction list" to see available matches.`);
            }
            
            const result = prediction.result || 'Not yet played';
            const ft = prediction.predictions.fulltime;
            const over25 = prediction.predictions.over_2_5;
            const btts = prediction.predictions.bothTeamToScore;
            
            let message = `╭──⌈ 🔮 PREDICTION ⌋\n┃\n┃ 🏆 Match: ${prediction.match}\n┃ 🏟️ League: ${prediction.league}\n┃ 🕒 Time: ${prediction.time}\n┃\n`;
            message += `┃ 📊 Full Time:\n`;
            message += `┃   🏠 Home: ${ft.home}%\n`;
            message += `┃   🤝 Draw: ${ft.draw}%\n`;
            message += `┃   ✈️ Away: ${ft.away}%\n┃\n`;
            message += `┃ ⚽ Over 2.5 Goals: ${over25.yes}%\n`;
            message += `┃ 🚫 Under 2.5 Goals: ${over25.no}%\n┃\n`;
            message += `┃ 🤝 Both Teams Score: ${btts.yes}%\n┃\n`;
            message += `┃ 📝 Result: ${result}\n`;
            message += `╰────────────────\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            await extra.reply(message);
            
        } catch (error) {
            console.error('Prediction error:', error);
            extra.reply('❌ Error fetching predictions.');
        }
    }
};