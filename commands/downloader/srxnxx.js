/**
 * Search YouTube Video Command - Returns video results with thumbnails and URLs
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'srxnxx',
    aliases: ['sr18+'],
    category: 'downloader',
    description: 'Search 18+',
    usage: '.srxnxx <search query>',
    
    async execute(sock, msg, args, extra) {
        try {
            const query = args.join(' ');
            
            if (!query) {
                return extra.reply(`❌ Please provide a search query.\n\n📌 Usage: ${config.prefix}srxnxx black pussy`);
            }
            
            await extra.reply(`⏳ Searching for "${query}"...`);
            
            // Search API - replace with your working YouTube search API
           const searchApiUrl = `https://api.giftedtech.co.ke/api/search/xnxxsearch?apikey=gifted&query=${encodeURIComponent(query)}`;
            
            const response = await axios.get(searchApiUrl);
            
            let videos = [];
            
            // Parse response based on API format
            if (response.data.items) {
                // Xnxx Data API v3 format
                videos = response.data.items.map(item => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    published: item.snippet.publishedAt,
                    thumbnail: item.snippet.thumbnails.medium.url,
                    url: `https://youtu.be/${item.id.videoId}`
                }));
            } else if (response.data.result) {
                // Custom API format
                videos = response.data.result.map(video => ({
                    id: video.id,
                    title: video.title,
                    channel: video.channel,
                    thumbnail: video.thumbnail,
                    url: video.url
                }));
            }
            
            if (!videos || videos.length === 0) {
                return extra.reply('❌ No results found. Try a different query.');
            }
            
            // Send each video as a separate message with thumbnail and URL
            for (let i = 0; i < Math.min(videos.length, 5); i++) {
                const video = videos[i];
                
                const message = `🎬 *${video.title}*\n\n📺 Channel: ${video.channel}\n🔗 URL: ${video.url}`;
                
                await sock.sendMessage(extra.from, {
                    image: { url: video.thumbnail },
                    caption: message
                }, { quoted: msg });
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            console.error('Search error:', error);
            extra.reply('❌ Error searching videos. Please try again.');
        }
    }
};