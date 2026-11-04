/**
 * Ping Command - Check bot response time without media uploads
 */

const config = require('../../config');

module.exports = {
  name: 'ping',
  aliases: ['p', 'latency'],
  category: 'general',
  description: 'Check bot response time',
  usage: '.ping',

  async execute(sock, msg, args, extra) {
    const start = Date.now();
    const chat = extra?.from || msg?.key?.remoteJid;

    try {
      const responseTime = Date.now() - start;
      let status;
      let emoji;

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

      const text = `╭──⌈ 📡 PONG ⌋
┃
┃ ${emoji} Status: ${status}
┃ ⚡ Latency: ${responseTime}ms
┃ 🤖 Bot: ${config.botName}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()} ✨`;

      await sock.sendMessage(chat, { text }, { quoted: msg });
    } catch (error) {
      console.error('Ping error:', error?.message || error);
      try {
        await sock.sendMessage(chat, { text: '❌ Ping failed. Please try again.' }, { quoted: msg });
      } catch (sendError) {
        console.error('Could not send ping error:', sendError?.message || sendError);
      }
    }
  }
};
