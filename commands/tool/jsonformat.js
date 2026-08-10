/**
 * JSON Format Command - Format and validate JSON
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'jsonformat',
    aliases: ['json', 'formatjson'],
    category: 'tools',
    description: 'Format and validate JSON data',
    usage: '.jsonformat {"name":"test"}',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`📋 *JSON Formatter*\n\nExample: ${config.prefix}jsonformat {"name":"John","age":30}\n\n*Format and validate your JSON data*`);
        }

        const json = args.join(' ');
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/jsonformat?json=${encodeURIComponent(json)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                
                const text = `╭──⌈ 📋 *JSON FORMATTER* ⌋
┃
┃ ✅ *Valid JSON:* ${result.valid ? 'Yes' : 'No'}
┃
┃ 📝 *Formatted JSON:*
┃ \`\`\`json
┃ ${result.formatted || JSON.stringify(JSON.parse(json), null, 2)}
┃ \`\`\`
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Invalid JSON format. Please check your JSON syntax.`);
            }
        } catch (error) {
            console.error('JSON format error:', error);
            await extra.reply(`❌ Error formatting JSON. Please provide valid JSON.`);
        }
    }
};