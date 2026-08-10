/**
 * GDrive Command - Download Google Drive files
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'gdrive',
  aliases: ['googledrive', 'gdrivedl'],
  category: 'downloader',
  description: 'Download files from Google Drive',
  usage: '.gdrive <url>',
  
  async execute(sock, msg, args, extra) {
    try {
      const url = args[0];
      
      if (!url) {
        return extra.reply(`❌ Please provide a valid Google Drive link.\n\n📌 Usage: ${config.prefix}gdrive https://drive.google.com/...`);
      }

      await extra.reply('⏳ Processing...');

      const apiUrl = `https://api.fgmods.xyz/api/downloader/gdrive?url=${url}&apikey=mnp3grlZ`;
      const response = await axios.get(apiUrl);
      
      if (!response.data || !response.data.result || !response.data.result.downloadUrl) {
        return extra.reply('⚠️ No download URL found. Please check the link and try again.');
      }

      const downloadUrl = response.data.result.downloadUrl;
      const fileName = response.data.result.fileName || 'google_drive_file';
      const mimeType = response.data.result.mimetype || 'application/octet-stream';

      await sock.sendMessage(extra.from, {
        document: { url: downloadUrl },
        mimetype: mimeType,
        fileName: fileName,
        caption: `📥 File: ${fileName}`
      }, { quoted: msg });

    } catch (error) {
      console.error('GDrive error:', error);
      extra.reply('❌ An error occurred while fetching the Google Drive file. Please try again.');
    }
  }
};