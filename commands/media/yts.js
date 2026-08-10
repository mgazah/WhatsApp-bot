/**
 * YouTube Search Command - Search for videos on YouTube with thumbnails
 */

const yts = require('yt-search');
const config = require('../../config');

module.exports = {
  name: 'yts',
  aliases: ['ytsearch', 'youtube', 'searchyt', 'ytfind'],
  category: 'media',
  description: 'Search for videos on YouTube',
  usage: '.yts <search query>',
  
  async execute(sock, msg, args, extra) {
    try {
      const query = args.join(' ');
      
      if (!query) {
        return extra.reply(`📌 Usage: ${config.prefix}yts <search query>\n\nExample: ${config.prefix}yts funny cats`);
      }
      
      await extra.reply(`🔍 Searching for "${query}"...`);
      
      const search = await yts(query);
      
      if (!search || !search.videos || search.videos.length === 0) {
        return extra.reply('❌ No results found. Please try a different search term.');
      }
      
      const videos = search.videos.slice(0, 5);
      
      // Send first 5 results with thumbnails
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const duration = video.timestamp || 'Unknown';
        const views = video.views ? video.views.toLocaleString() : 'N/A';
        const uploaded = video.ago || 'Unknown';
        
        const message = `🎬 *${video.title}*\n\n⏱️ Duration: ${duration}\n👁️ Views: ${views}\n📅 Uploaded: ${uploaded}\n📺 Channel: ${video.author?.name || 'Unknown'}\n\n🔗 https://youtu.be/${video.videoId}\n\n💡 Use ${config.prefix}play or ${config.prefix}song to download`;
        
        await sock.sendMessage(extra.from, {
          image: { url: video.thumbnail },
          caption: message
        }, { quoted: msg });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await extra.reply(`✨ Found ${search.videos.length} results for "${query}". Showing top 5.\n✨ POWERED BY ${config.botName.toUpperCase()}`);
      
    } catch (error) {
      console.error('YouTube search error:', error);
      extra.reply('❌ Error searching YouTube. Please try again.');
    }
  }
};