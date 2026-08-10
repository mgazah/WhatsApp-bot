/**
 * SendImage Command - Send an image from a URL
 */

const config = require('../../config');

module.exports = {
  name: 'sendimage',
  aliases: ['imageurl', 'imgurl'],
  category: 'fun',
  description: 'Send an image from a URL',
  usage: '.sendimage <image_url>',
  
  async execute(sock, msg, args, extra) {
    try {
      // Check if an image URL was provided
      if (!args[0]) {
        return extra.reply(`❌ Please provide an image URL!\n\n📌 Usage: ${config.prefix}sendimage https://example.com/image.jpg`);
      }

      const imageUrl = args[0];
      
      // Validate URL format
      if (!imageUrl.match(/^https?:\/\/.+\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        return extra.reply('❌ Invalid image URL! Please provide a direct link to an image (jpg, jpeg, png, gif, webp).');
      }
      
      // Send the image
      await sock.sendMessage(extra.from, {
        image: { url: imageUrl },
        caption: `🖼️ Image from URL`,
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Error in sendimage command:', error);
      extra.reply(`❌ An error occurred: ${error.message}`);
    }
  }
};