/**
 * Color Command - Get color information
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'color',
    aliases: ['colour', 'hex'],
    category: 'tools',
    description: 'Get color information from hex or name',
    usage: '.color #FF0000\n.color red',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`🎨 *Color Info Tool*\n\nUsage: ${config.prefix}color #FF0000\n${config.prefix}color red\n\n*Get RGB, HSL, and other color information*`);
        }

        const color = args[0];
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/color?color=${encodeURIComponent(color)}`);
            
            if (response.data && response.data.status === 'success') {
                const c = response.data.result;
                
                const text = `╭──⌈ 🎨 *COLOR INFORMATION* ⌋
┃
┃ 🎨 *Color:* ${c.name || color}
┃ 🔴 *HEX:* ${c.hex || c.hexCode || color}
┃ 🔵 *RGB:* ${c.rgb || 'N/A'}
┃ 🟡 *HSL:* ${c.hsl || 'N/A'}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ No color information found for "${color}"`);
            }
        } catch (error) {
            console.error('Color error:', error);
            await extra.reply(`❌ Error fetching color information. Please try again.`);
        }
    }
};