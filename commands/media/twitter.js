/**
 * Twitter Command - Download Twitter videos
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'twitter',
  aliases: ['tweet', 'twdl', 'twitterdl'],
  category: 'media',
  description: 'Download Twitter/X videos',
  usage: '.twitter <url>',
  
  async execute(sock, msg, args, extra) {
    try {
      const url = args[0];
      
      if (!url || !url.startsWith('https://')) {
        return extra.reply(`❌ Please provide a valid Twitter URL.\n\n📌 Usage: ${config.prefix}twitter https://twitter.com/...`);
      }

      await extra.reply('⏳ Processing...');

      const response = await axios.get(`https://www.dark-yasiya-api.site/download/twitter?url=${url}`);
      const data = response.data;

      if (!data || !data.status || !data.result) {
        return extra.reply('⚠️ Failed to retrieve Twitter video. Please check the link and try again.');
      }

      const { desc, thumb, video_sd, video_hd } = data.result;

      const caption = `📹 Twitter Video\n\nDescription: ${desc || 'No description'}\n\nQuality: SD & HD available`;

      // Send the HD video
      await sock.sendMessage(extra.from, {
        video: { url: video_hd || video_sd },
        caption: caption,
        thumbnail: { url: thumb }
      }, { quoted: msg });

    } catch (error) {
      console.error('Twitter error:', error);
      extra.reply('❌ An error occurred while processing your request. Please try again.');
    }
  }
};