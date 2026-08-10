/**
 * Define Command - Get word definitions from dictionary
 */

const config = require('../../config');
const fetch = require('node-fetch');

module.exports = {
    name: "define",
    aliases: ["dictionary", "meaning"],
    desc: "Get definition of a word",
    category: "utility",
    cooldown: 5,
    
    async execute(sock, message, args, extra) {
        const text = args.join(" ");
        if (!text) return extra.reply("📖 *Enter a word to define.*\n\nExample: .define hello");
        
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`);
            const json = await response.json();
            if (!json.length) throw new Error();

            const definitions = json[0].meanings[0].definitions
                .map((def, i) => `*Definition ${i + 1}:* ${def.definition}`)
                .join("\n\n");

            const messageText = `📖 *Definitions for:* ${text}\n\n${definitions}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            await extra.reply(messageText);
        } catch (error) {
            extra.reply(`❌ No definition found for *${text}*`);
        }
    }
};