/**
 * TGS Command - Download Telegram sticker packs to WhatsApp stickers
 */

const config = require('../../config');
const axios = require('axios');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
  name: 'tgs',
  aliases: ['tgsticker', 'telegramsticker'],
  category: 'media',
  description: 'Download and convert Telegram sticker packs to WhatsApp stickers',
  usage: '.tgs <telegram sticker link>',
  
  async execute(sock, msg, args, extra) {
    try {
      // Check if a Telegram sticker link is provided
      if (!args[0]) {
        return extra.reply(`❌ Please provide a Telegram sticker pack link.\n\n📌 Example: ${config.prefix}tgs https://t.me/addstickers/telegramkerm`);
      }

      const lien = args.join(' ');
      const name = lien.split('/addstickers/')[1];

      if (!name) {
        return extra.reply('❌ Invalid Telegram sticker link.');
      }

      await extra.reply('⏳ Downloading sticker pack...');

      const api = `https://api.telegram.org/bot7025486524:AAGNJ3lMa8610p7OAIycwLtNmF9vG8GfboM/getStickerSet?name=${encodeURIComponent(name)}`;

      // Fetch sticker pack details
      const stickers = await axios.get(api);
      
      if (!stickers.data.result) {
        return extra.reply('❌ Sticker pack not found. Please check the link.');
      }

      let type = stickers.data.result.is_animated ? 'Animated' : 'Static';
      
      await extra.reply(`📦 Pack: ${stickers.data.result.name}\n🎴 Type: ${type}\n📊 Total: ${stickers.data.result.stickers.length} stickers\n\n✅ Downloading...`);

      // Loop through each sticker in the pack
      for (let i = 0; i < stickers.data.result.stickers.length; i++) {
        const file = await axios.get(`https://api.telegram.org/bot7025486524:AAGNJ3lMa8610p7OAIycwLtNmF9vG8GfboM/getFile?file_id=${stickers.data.result.stickers[i].file_id}`);

        const buffer = await axios({
          method: 'get',
          url: `https://api.telegram.org/file/bot7025486524:AAGNJ3lMa8610p7OAIycwLtNmF9vG8GfboM/${file.data.result.file_path}`,
          responseType: 'arraybuffer',
        });

        // Create a WhatsApp sticker
        const sticker = new Sticker(buffer.data, {
          pack: config.botName,
          author: 'WhatsApp Bot',
          type: StickerTypes.FULL,
          categories: ['🎉'],
          quality: 50,
          background: '#000000'
        });

        const stickerBuffer = await sticker.toBuffer();

        // Send the sticker
        await sock.sendMessage(extra.from, { sticker: stickerBuffer }, { quoted: msg });

        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await extra.reply('✅ Sticker pack download complete!');

    } catch (error) {
      console.error('Error processing Telegram sticker pack:', error);
      extra.reply('❌ An error occurred while processing the sticker pack. Please try again.');
    }
  }
};