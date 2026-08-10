/**
 * Dictionary Command - Get word definitions
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'dictionary',
    aliases: ['dict', 'define'],
    category: 'tools',
    description: 'Get word definitions from dictionary',
    usage: '.dictionary hello',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`📖 *Dictionary Lookup*\n\nExample: ${config.prefix}dictionary hello\n\n*Get definitions for any English word*`);
        }

        const word = args[0];
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/dictionary?word=${encodeURIComponent(word)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                let definitions = '';
                
                if (result.definitions && result.definitions.length) {
                    definitions = result.definitions.slice(0, 5).map((def, i) => 
                        `${i + 1}. ${def.definition}${def.example ? `\n   📝 Example: ${def.example}` : ''}`
                    ).join('\n\n');
                } else if (result.meaning) {
                    definitions = result.meaning;
                } else {
                    definitions = result.definition || JSON.stringify(result);
                }
                
                const text = `╭──⌈ 📖 *DICTIONARY* ⌋
┃
┃ 🔤 *Word:* ${word}
┃ 🏷️ *Part of Speech:* ${result.partOfSpeech || result.type || 'Noun'}
┃
┃ 📝 *Definitions:*
┃ ${definitions}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ No definition found for "${word}"`);
            }
        } catch (error) {
            console.error('Dictionary error:', error);
            await extra.reply(`❌ Error fetching definition. Please try another word.`);
        }
    }
};