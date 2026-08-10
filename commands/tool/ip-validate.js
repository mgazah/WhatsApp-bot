/**
 * IP Validate Command - Validate IP addresses
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
    name: 'ipvalidate',
    aliases: ['ip', 'checkip'],
    category: 'tools',
    description: 'Validate and get info about IP addresses',
    usage: '.ipvalidate 192.168.1.1',
    
    async execute(sock, msg, args, extra) {
        if (!args.length) {
            return extra.reply(`🌐 *IP Validator*\n\nExample: ${config.prefix}ipvalidate 8.8.8.8\n\n*Validate and get information about IP addresses*`);
        }

        const ip = args[0];
        
        try {
            const response = await axios.get(`https://apis.xwolf.space/api/tools/ip-validate?ip=${encodeURIComponent(ip)}`);
            
            if (response.data && response.data.status === 'success') {
                const result = response.data.result;
                
                const text = `╭──⌈ 🌐 *IP VALIDATION* ⌋
┃
┃ 🌍 *IP Address:* ${ip}
┃ ✅ *Valid IP:* ${result.valid ? 'Yes' : 'No'}
┃ ${result.version ? `┃ 📌 *Version:* IPv${result.version}\n┃` : '┃'}
┃ ${result.type ? `┃ 🏷️ *Type:* ${result.type}\n┃` : '┃'}
┃ ${result.location ? `┃ 📍 *Location:* ${result.location}\n┃` : '┃'}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await extra.reply(text);
            } else {
                await extra.reply(`❌ Invalid IP address "${ip}"`);
            }
        } catch (error) {
            console.error('IP validate error:', error);
            await extra.reply(`❌ Error validating IP address. Please check the format.`);
        }
    }
};