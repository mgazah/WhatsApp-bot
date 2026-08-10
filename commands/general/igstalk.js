/**
 * Instagram Stalk Command - Get Instagram user info
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'igstalk',
    aliases: ['instagramstalk', 'iguser', 'instastalk'],
    category: 'general',
    description: 'Get Instagram user information',
    usage: '.igstalk <username>',
    
    async execute(sock, msg, args, extra) {
        try {
            const username = args[0];
            
            if (!username) {
                return extra.reply(`❌ Please provide an Instagram username.\n\n📌 Usage: ${config.prefix}igstalk giftedtechnexus`);
            }
            
            await extra.reply(`⏳ Stalking @${username}...`);
            
            const apiUrl = `https://api.giftedtech.co.ke/api/stalk/igstalk?apikey=gifted&username=${encodeURIComponent(username)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ User not found or account is private.');
            }
            
            const user = response.data.result;
            
            const message = `📸 INSTAGRAM STALK\n\n👤 Username: @${user.username}\n📛 Name: ${user.full_name}\n📝 Bio: ${user.description || 'No bio'}\n📊 Posts: ${user.posts}\n👥 Followers: ${user.followers}\n👣 Following: ${user.following}\n🔒 Private: ${user.is_private ? 'Yes' : 'No'}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            if (user.avatar) {
                const avatarResponse = await axios.get(user.avatar, { responseType: 'arraybuffer' });
                await sock.sendMessage(extra.from, { image: Buffer.from(avatarResponse.data), caption: message }, { quoted: msg });
            } else {
                await extra.reply(message);
            }
            
        } catch (error) {
            console.error('IG stalk error:', error);
            extra.reply('❌ Error fetching Instagram user data.');
        }
    }
};