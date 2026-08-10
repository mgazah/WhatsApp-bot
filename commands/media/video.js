/**
 * Video Downloader - Download video from YouTube
 */

const yts = require('yt-search');
const axios = require('axios');
const APIs = require('../../utils/api');
const config = require('../../config');

module.exports = {
  name: 'ytvideo',
  aliases: ['ytv', 'ytmp4', 'ytvid', 'video'],
  category: 'media',
  description: 'Download video from YouTube',
  usage: '.video <video name or URL>',

  async execute(sock, msg, args, extra) {
    try {
      const text = args.join(' ');
      const chatId = extra.from;
      
      if (!text) {
        return await extra.reply(`📌 Usage: ${config.prefix}video <video name or YouTube link>\n\nExample: ${config.prefix}video Never Gonna Give You Up`);
      }
      
      let video;
      
      // Check if input is a YouTube link
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        video = { url: text };
      } else {
        // Search for the video
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await extra.reply('❌ No results found.');
        }
        video = search.videos[0];
      }
      
      // Send detailed video information with thumbnail
      const views = video.views ? video.views.toLocaleString() : 'N/A';
      const likes = video.likes ? video.likes.toLocaleString() : 'N/A';
      const uploadedAt = video.ago || video.uploadedAt || 'Unknown';
      const duration = video.timestamp || video.duration || 'Unknown';
      const author = video.author?.name || video.author || 'Unknown';
      const description = video.description ? video.description.substring(0, 100) + '...' : 'No description';
      
      const infoCaption = `🎬 *${video.title}*\n\n` +
        `⏱ *Duration:* ${duration}\n` +
        `📺 *Channel:* ${author}\n` +
        `👁️ *Views:* ${views}\n` +
        `👍 *Likes:* ${likes}\n` +
        `📅 *Uploaded:* ${uploadedAt}\n` +
        `📝 *Description:* ${description}\n\n` +
        `⏳ Downloading video...`;
      
      await sock.sendMessage(chatId, {
        image: { url: video.thumbnail },
        caption: infoCaption
      }, { quoted: msg });
      
      let videoData;
      let downloadSuccess = false;
      let videoBuffer;
      let videoTitle = video.title;
      
      // Try multiple API sources
      const apiMethods = [
        { name: 'EliteProTech', method: () => APIs.getEliteProTechVideoByUrl(video.url) },
        { name: 'Yupra', method: () => APIs.getYupraVideoByUrl(video.url) },
        { name: 'Okatsu', method: () => APIs.getOkatsuVideoByUrl(video.url) }
      ];
      
      for (const apiMethod of apiMethods) {
        try {
          const data = await apiMethod.method();
          const videoUrl = data.download || data.dl || data.url;
          
          if (!videoUrl) continue;
          
          try {
            const response = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 120000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              decompress: true,
              validateStatus: s => s >= 200 && s < 400,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'video/mp4,video/webm,video/*',
                'Accept-Encoding': 'identity'
              }
            });
            
            videoBuffer = Buffer.from(response.data);
            
            if (videoBuffer && videoBuffer.length > 0) {
              downloadSuccess = true;
              videoData = data;
              break;
            }
          } catch (downloadErr) {
            continue;
          }
        } catch (apiErr) {
          continue;
        }
      }
      
      if (!downloadSuccess || !videoBuffer) {
        throw new Error('All download sources failed.');
      }
      
      // Determine video format
      let videoMime = 'video/mp4';
      let videoExt = 'mp4';
      
      // Check video signature
      const firstBytes = videoBuffer.slice(0, 4);
      const hexSignature = firstBytes.toString('hex');
      
      if (hexSignature.startsWith('1a45dfa3')) {
        videoMime = 'video/webm';
        videoExt = 'webm';
      } else if (hexSignature.startsWith('000000')) {
        videoMime = 'video/mp4';
        videoExt = 'mp4';
      }
      
      const fileName = `${(videoData?.title || videoTitle || 'video').replace(/[^\w\s-]/g, '')}.${videoExt}`;
      
      // Send final success caption
      const successCaption = `✅ *Video Downloaded Successfully!*\n\n` +
        `🎬 *Title:* ${videoData?.title || videoTitle}\n` +
        `📁 *Format:* ${videoExt.toUpperCase()}\n` +
        `💾 *Size:* ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB\n\n` +
        `> *_Downloaded by ${config.botName || 'NOVA MD'}_*`;
      
      // Send the video
      await sock.sendMessage(chatId, {
        video: videoBuffer,
        mimetype: videoMime,
        fileName: fileName,
        caption: successCaption
      }, { quoted: msg });
      
    } catch (err) {
      console.error('[VIDEO] Command Error:', err);
      await extra.reply('❌ Failed to download video. Please try again or use a different video.');
    }
  }
};
