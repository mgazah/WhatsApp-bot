/**
 * YouTube Post Command - Download YouTube community posts
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'ytpost',
  aliases: ['ytcommunity', 'ytc', 'ytpostdl'],
  category: 'downloader',
  description: 'Download a YouTube community post',
  usage: '.ytpost <url>',
  
  async execute(sock, msg, args, extra) {
    try {
      const url = args[0];
      
      if (!url) {
        return extra.reply(`❌ Please provide a YouTube community post URL.\n\n📌 Usage: ${config.prefix}ytpost https://www.youtube.com/post/...`);
      }

      await extra.reply('⏳ Fetching community post...');

      const apiUrl = `https://api.siputzx.my.id/api/d/ytpost?url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiUrl);

      if (!data.status || !data.data) {
        return extra.reply('❌ Failed to fetch the community post. Please check the URL.');
      }

      const post = data.data;
      const caption = `📢 YouTube Community Post\n\n${post.content}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;

      if (post.images && post.images.length > 0) {
        // Send first image with caption
        await sock.sendMessage(extra.from, {
          image: { url: post.images[0] },
          caption: caption
        }, { quoted: msg });
        
        // Send remaining images without caption
        for (let i = 1; i < post.images.length; i++) {
          await sock.sendMessage(extra.from, {
            image: { url: post.images[i] }
          }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(extra.from, {
          text: caption
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('Error in ytpost command:', error);
      extra.reply('❌ An error occurred while fetching the YouTube community post.');
    }
  }
};