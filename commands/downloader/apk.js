/**
 * APK Command - Download APK from Aptoide
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'apk',
  aliases: ['apkdl', 'downloadapk'],
  category: 'downloader',
  description: 'Download APK files from Aptoide',
  usage: '.apk <app_name>',
  
  async execute(sock, msg, args, extra) {
    try {
      const appName = args.join(' ');
      
      if (!appName) {
        return extra.reply(`❌ Please provide an app name to search.\n\n📌 Usage: ${config.prefix}apk whatsapp`);
      }

      await extra.reply('⏳ Searching for APK...');

      const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(appName)}/limit=1`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (!data || !data.datalist || !data.datalist.list.length) {
        return extra.reply('⚠️ No results found for the given app name.');
      }

      const app = data.datalist.list[0];
      const appSize = (app.size / 1048576).toFixed(2);

      const caption = `📦 ${app.name}\n📏 Size: ${appSize} MB\n📱 Package: ${app.package}\n📅 Updated: ${app.updated}\n👨‍💻 Developer: ${app.developer.name}`;

      await sock.sendMessage(extra.from, {
        document: { url: app.file.path_alt },
        fileName: `${app.name}.apk`,
        mimetype: 'application/vnd.android.package-archive',
        caption: caption
      }, { quoted: msg });

    } catch (error) {
      console.error('APK error:', error);
      extra.reply('❌ An error occurred while fetching the APK. Please try again.');
    }
  }
};
