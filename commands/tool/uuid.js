/**
 * UUID Command - Generate UUIDs
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'uuid',
    aliases: ['guid', 'uniqueid'],
    category: 'tools',
    description: 'Generate UUID v4',
    usage: '.uuid\n.uuid 5',
    
    async execute(sock, msg, args, extra) {
        let count = args[0] || 1;
        
        if (isNaN(count) || count < 1 || count > 10) {
            return extra.reply(`🆔 *UUID Generator*\n\nUsage: ${config.prefix}uuid [count]\n\n*Count must be between 1-10*\nExample: ${config.prefix}uuid 3`);
        }
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/uuid?count=${count}`);
            
            if (response.data && response.data.status === 'success') {
                const uuids = response.data.result;
                let uuidList = '';
                
                if (Array.isArray(uuids)) {
                    uuids.forEach((uuid, i) => {
                        uuidList += `${i + 1}. \`${uuid}\`\n`;
                    });
                } else {
                    uuidList = `\`${uuids}\``;
                }
                
                const text = `╭──⌈ 🆔 *UUID GENERATOR* ⌋
┃
┃ 📊 *Count:* ${count}
┃
┃ 🔑 *UUID(s):*
┃ ${uuidList}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Error generating UUIDs.`);
            }
        } catch (error) {
            console.error('UUID error:', error);
            await extra.reply(`❌ Error generating UUIDs. Please try again.`);
        }
    }
};