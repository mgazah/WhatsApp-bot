/**
 * Ping Command - Check bot response time
 */

const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ping',
    aliases: ['p', 'latency'],
    category: 'general',
    description: 'Check bot response time',
    usage: '.ping',
    
    async execute(sock, msg, args, extra) {
      try {
        const start = Date.now();
        
        // Simple ping message first
        const pingMsg = await sock.sendMessage(msg.key.remoteJid, { text: '🌚 ping...' });
        
        const end = Date.now();
        const responseTime = end - start;
        
        let status = '';
        let emoji = '';
        
        if (responseTime < 100) {
          status = 'Excellent';
          emoji = '🚀';
        } else if (responseTime < 300) {
          status = 'Good';
          emoji = '✅';
        } else if (responseTime < 600) {
          status = 'Slow';
          emoji = '⚠️';
        } else {
          status = 'Very Slow';
          emoji = '🐌';
        }
        
        const message = `╭──⌈ 📡 PONG ⌋
┃
┃ ${emoji} Status: ${status}
┃ ⚡ Latency: ${responseTime}ms
┃ 🤖 Bot: ${config.botName}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
        
        // Check if it's a channel (no quoted messages or reactions)
        const isChannel = msg.key.remoteJid?.includes('@newsletter') || 
                          msg.key.remoteJid?.includes('@broadcast');
        
        // Read the image file
        const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
        
        // Try to send with image if not in channel and image exists
        if (!isChannel && fs.existsSync(imagePath)) {
          try {
            const imageBuffer = fs.readFileSync(imagePath);
            
            // Send message with image
            await sock.sendMessage(msg.key.remoteJid, {
              image: imageBuffer,
              caption: message,
              mimetype: 'image/jpeg'
            });
          } catch (imageError) {
            // Fallback to text if image fails
            await sock.sendMessage(msg.key.remoteJid, { text: message });
          }
        } else {
          // Send text-only for channels or if image not found
          await sock.sendMessage(msg.key.remoteJid, { text: message });
          if (!isChannel && !fs.existsSync(imagePath)) {
            console.warn('Image not found at:', imagePath);
          }
        }
        
      } catch (error) {
        console.error('Ping error:', error);
        // Fallback error message
        try {
          await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` });
        } catch (e) {
          console.error('Could not send error message:', e);
        }
      }
    }
};