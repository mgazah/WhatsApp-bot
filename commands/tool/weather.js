/**
 * Weather Command - Get weather information
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'weather',
    aliases: ['weatherinfo', 'climate'],
    category: 'tools',
    description: 'Get current weather for any city',
    usage: '.weather London',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`🌤️ *Weather Information*\n\nExample: ${config.prefix}weather Nairobi\n\n*Get current weather for any city*`);
        }

        const city = args.join(' ');
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/weather?city=${encodeURIComponent(city)}`);
            
            if (response.data && response.data.status === 'success') {
                const w = response.data.result;
                
                const text = `╭──⌈ 🌤️ *WEATHER INFO* ⌋
┃
┃ 📍 *Location:* ${w.city || w.name || city}
┃ 🌡️ *Temperature:* ${w.temperature || w.temp || 'N/A'}°C
┃ 🌡️ *Feels Like:* ${w.feelsLike || w.feels_like || 'N/A'}°C
┃ ☁️ *Conditions:* ${w.conditions || w.description || w.weather || 'N/A'}
┃ 💨 *Wind Speed:* ${w.windSpeed || w.wind || 'N/A'} km/h
┃ 💧 *Humidity:* ${w.humidity || 'N/A'}%
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ No weather data found for "${city}"`);
            }
        } catch (error) {
            console.error('Weather error:', error);
            await extra.reply(`❌ Error fetching weather data. Please check city name.`);
        }
    }
};