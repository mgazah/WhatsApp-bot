/**
 * Lorem Command - Generate Lorem Ipsum text
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'lorem',
    aliases: ['lipsum'],
    category: 'tools',
    description: 'Generate Lorem Ipsum placeholder text',
    usage: '.lorem\n.lorem 5',
    
    async execute(sock, msg, args, extra) {
        let paragraphs = args[0] || 3;
        
        if (isNaN(paragraphs) || paragraphs < 1 || paragraphs > 10) {
            return extra.reply(`📝 *Lorem Ipsum Generator*\n\nUsage: ${config.prefix}lorem [paragraphs]\n\n*Paragraphs must be between 1-10*\nExample: ${config.prefix}lorem 5`);
        }
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/lorem?paragraphs=${paragraphs}`);
            
            if (response.data && response.data.status === 'success') {
                const text = `╭──⌈ 📝 *LOREM IPSUM* ⌋
┃
┃ ${response.data.result}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Error generating Lorem Ipsum text.`);
            }
        } catch (error) {
            console.error('Lorem error:', error);
            await extra.reply(`❌ Error generating text. Please try again.`);
        }
    }
};