/**
 * Uptime Command - Display bot uptime since it was started
 */

const config = require('../../config');
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Format time difference into human-readable string
 * @param {number} seconds - Total seconds of uptime
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
  if (seconds <= 0) {
    return '0 seconds';
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  }
  
  return parts.join(', ');
}

module.exports = {
  name: 'uptime',
  aliases: ['runtime', 'botuptime', 'alive'],
  category: 'general',
  description: 'Show how long the bot has been running',
  usage: '.uptime',
  
  async execute(sock, msg, args, extra) {
    try {
      // Get process uptime in seconds
      const uptimeSeconds = process.uptime();
      const uptime = formatUptime(uptimeSeconds);
      
      // Get bot info
      const botName = config.botName || 'Bot';
      const botVersion = config.botVersion || '1.0.0';
      const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
      const totalMemory = 100;
      const platform = os.platform();
      const nodeVersion = process.version;
      
      // Build response message
      let message = `╭──⌈ 🤖 BOT UPTIME ⌋
┃
┃ 🤖 Bot Name: ${botName}
┃ 📦 Bot Version: ${botVersion}
┃ ⏱️ Uptime: ${uptime}
┃ 💾 Memory: ${usedMemory}MB / ${totalMemory}MB
┃ 💻 Platform: ${platform}
┃ 🟢 Node.js: ${nodeVersion}
┃
╰────────────────

✨ POWERED BY ${botName.toUpperCase()}`;
      
      // Read the image file
      const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
      
      // Check if image exists
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Send message with image
        await sock.sendMessage(msg.key.remoteJid, {
          image: imageBuffer,
          caption: message,
          mimetype: 'image/jpeg'
        });
      } else {
        // Fallback to text-only if image not found
        await extra.reply(message);
        console.warn('Image not found at:', imagePath);
      }
      
    } catch (error) {
      console.error('Error in uptime command:', error);
      await extra.reply('❌ An error occurred while fetching uptime information.');
    }
  }
};