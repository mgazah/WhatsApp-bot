/**
 * Timestamp Command - Convert timestamps
 */

const config = require('../../config');
const axios = require('axios');
const moment = require('moment-timezone');

module.exports = {
    name: 'timestamp',
    aliases: ['time', 'unixtime'],
    category: 'tools',
    description: 'Convert timestamps to readable dates',
    usage: '.timestamp\n.timestamp 1735689600',
    
    async execute(sock, msg, args, extra) {
        let timestamp = args[0] || Math.floor(Date.now() / 1000);
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/timestamp?timestamp=${timestamp}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                const timezone = config.timezone || 'Africa/Nairobi';
                const localTime = moment.unix(timestamp).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
                
                const text = `╭──⌈ ⏰ *TIMESTAMP CONVERTER* ⌋
┃
┃ 🕐 *Unix Timestamp:* ${timestamp}
┃
┃ 📅 *UTC Date:* ${result.utc || result.date}
┃ 📍 *Local Time:* ${localTime}
┃ 🕒 *Timezone:* ${timezone}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Error converting timestamp.`);
            }
        } catch (error) {
            console.error('Timestamp error:', error);
            await extra.reply(`❌ Error converting timestamp. Please provide a valid Unix timestamp.`);
        }
    }
};