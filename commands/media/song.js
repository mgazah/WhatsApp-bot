/**
 * Song Command - Download audio from YouTube as playable audio
 */

const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const APIs = require('../../utils/api');
const { toAudio } = require('../../utils/converter');
const config = require('../../config');

module.exports = {
  name: 'song',
  aliases: ['music', 'yta', 'audio'],
  category: 'media',
  description: 'Download audio from YouTube as playable audio',
  usage: '.song <song name or YouTube link>',
  
  async execute(sock, msg, args, extra) {
    try {
      const text = args.join(' ');
      const chatId = extra.from;
      
      if (!text) {
        return await extra.reply(`📌 Usage: ${config.prefix}song <song name or YouTube link>\n\nExample: ${config.prefix}song Believer Imagine Dragons`);
      }
      
      let video;
      
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        video = { url: text };
      } else {
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await extra.reply('❌ No results found.');
        }
        video = search.videos[0];
      }
      
      // Send thumbnail with info
      await sock.sendMessage(chatId, {
        image: { url: video.thumbnail },
        caption: `🎵 *${video.title}*\n⏱ Duration: ${video.timestamp}\n📺 Channel: ${video.author?.name || 'Unknown'}\n👁️ Views: ${video.views?.toLocaleString() || 'N/A'}\n\n⏳ Downloading audio...`
      }, { quoted: msg });
      
      let audioData;
      let audioBuffer;
      let downloadSuccess = false;
      
      const apiMethods = [
        { name: 'EliteProTech', method: () => APIs.getEliteProTechDownloadByUrl(video.url) },
        { name: 'Yupra', method: () => APIs.getYupraDownloadByUrl(video.url) },
        { name: 'Okatsu', method: () => APIs.getOkatsuDownloadByUrl(video.url) },
        { name: 'Izumi', method: () => APIs.getIzumiDownloadByUrl(video.url) }
      ];
      
      for (const apiMethod of apiMethods) {
        try {
          audioData = await apiMethod.method();
          const audioUrl = audioData.download || audioData.dl || audioData.url;
          
          if (!audioUrl) continue;
          
          try {
            const audioResponse = await axios.get(audioUrl, {
              responseType: 'arraybuffer',
              timeout: 90000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              decompress: true,
              validateStatus: s => s >= 200 && s < 400,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity'
              }
            });
            audioBuffer = Buffer.from(audioResponse.data);
            
            if (audioBuffer && audioBuffer.length > 0) {
              downloadSuccess = true;
              break;
            }
          } catch (downloadErr) {
            continue;
          }
        } catch (apiErr) {
          continue;
        }
      }
      
      if (!downloadSuccess || !audioBuffer) {
        throw new Error('All download sources failed.');
      }

      let finalBuffer = audioBuffer;
      let finalExtension = 'mp3';
      
      const firstBytes = audioBuffer.slice(0, 12);
      const hexSignature = firstBytes.toString('hex');
      const asciiSignature = firstBytes.toString('ascii', 4, 8);
      
      let fileExtension = 'mp3';
      
      if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
        fileExtension = 'm4a';
      } else if (audioBuffer.toString('ascii', 0, 3) === 'ID3' || 
                 (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0)) {
        fileExtension = 'mp3';
      } else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') {
        fileExtension = 'ogg';
      } else {
        fileExtension = 'm4a';
      }

      if (fileExtension !== 'mp3') {
        try {
          finalBuffer = await toAudio(audioBuffer, fileExtension);
          finalExtension = 'mp3';
        } catch (convErr) {
          finalExtension = fileExtension;
        }
      }

      const fileName = `${(video.title || 'song').replace(/[^\w\s-]/g, '')}.${finalExtension}`;
      
      // Send only the audio, no extra text after
      await sock.sendMessage(chatId, {
        audio: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: fileName,
        ptt: false
      }, { quoted: msg });
      
    } catch (err) {
      console.error('Song command error:', err);
      await extra.reply('❌ Failed to download audio. Please try again.');
    }
  }
};