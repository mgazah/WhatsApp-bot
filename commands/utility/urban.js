/**
 * Urban Command - Get definitions from Urban Dictionary
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: "urban",
    aliases: ["define2", "urbandict"],
    desc: "Get Urban Dictionary definition",
    category: "utility",
    cooldown: 5,
    
    async execute(sock, message, args, extra) {
        const text = args.join(" ");
        if (!text) return extra.reply("📖 *What do you want to define?*\n\nExample: .urban simp");
        
        try {
            const { data } = await axios.get(`http://api.urbandictionary.com/v0/define?term=${text}`);
            if (!data.list.length) throw new Error();

            const definition = data.list[0].definition.replace(/[\[\]]/g, "");
            const example = data.list[0].example.replace(/[\[\]]/g, "");
            
            const messageText = `📖 *Urban Definition of:* ${text}\n\n*Definition:* ${definition}\n\n*Example:* ${example}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            await extra.reply(messageText);
        } catch (error) {
            extra.reply(`❌ No definition found for *${text}*`);
        }
    }
};