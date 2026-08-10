/**
 * TikTok Command - Download TikTok videos without watermark
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'tiktok2',
  aliases: ['t', 'tiktokdl2'],
  category: 'media',
  description: 'Download TikTok video without watermark',
  usage: '.tiktok <url>',
  
  async execute(sock, msg, args, extra) {
    try {
      const url = args[0];
      
      if (!url) {
        return extra.reply(`❌ Please provide a TikTok video link.\n\n📌 Usage: ${config.prefix}tiktok https://www.tiktok.com/@user/video/123456789`);
      }
      
      if (!url.includes('tiktok.com')) {
        return extra.reply('❌ Invalid TikTok link. Please provide a valid TikTok URL.');
      }
      
      await extra.reply('⏳ Downloading video, please wait...');
      
      const apiUrl = `https://delirius-apiofc.vercel.app/download/tiktok?url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiUrl);
      
      if (!data.status || !data.data) {
        return extra.reply('❌ Failed to fetch TikTok video. Please try again.');
      }
      
      const { title, like, comment, share, author, meta } = data.data;
      const videoUrl = meta.media.find(v => v.type === 'video').org;
      
      const caption = `🎵 TikTok Video\n\n👤 User: ${author.nickname} (@${author.username})\n📖 Title: ${title}\n👍 Likes: ${like}\n💬 Comments: ${comment}\n🔁 Shares: ${share}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`;
      
      await sock.sendMessage(extra.from, {
        video: { url: videoUrl },
        caption: caption
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Error in TikTok downloader command:', error);
      extra.reply(`❌ An error occurred: ${error.message}`);
    }
  }
};