/**
 * TikTok Stalk Command - Get TikTok user info
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'tiktokstalk',
    aliases: ['ttstalk', 'tiktokuser', 'ttuser'],
    category: 'general',
    description: 'Get TikTok user information',
    usage: '.tiktokstalk <username>',
    
    async execute(sock, msg, args, extra) {
        try {
            const username = args[0];
            
            if (!username) {
                return extra.reply(`❌ Please provide a TikTok username.\n\n📌 Usage: ${config.prefix}tiktokstalk giftedtechke`);
            }
            
            await extra.reply(`⏳ Stalking @${username}...`);
            
            const apiUrl = `https://api.giftedtech.co.ke/api/stalk/tiktokstalk?apikey=gifted&username=${encodeURIComponent(username)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ User not found.');
            }
            
            const user = response.data.result;
            
            const message = `🎵 TIKTOK STALK\n\n👤 Username: @${user.username}\n📛 Name: ${user.name}\n📝 Bio: ${user.bio || 'No bio'}\n👥 Followers: ${user.followers}\n👣 Following: ${user.following}\n❤️ Likes: ${user.likes}\n🔒 Private: ${user.private ? 'Yes' : 'No'}\n✅ Verified: ${user.verified ? 'Yes' : 'No'}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
            
            if (user.avatar) {
                const avatarResponse = await axios.get(user.avatar, { responseType: 'arraybuffer' });
                await sock.sendMessage(extra.from, { image: Buffer.from(avatarResponse.data), caption: message }, { quoted: msg });
            } else {
                await extra.reply(message);
            }
            
        } catch (error) {
            console.error('TikTok stalk error:', error);
            extra.reply('❌ Error fetching TikTok user data.');
        }
    }
};