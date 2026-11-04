/**
 * GitHub Command - Show the exact bot repository and its details
 */

const axios = require('axios');
const config = require('../../config');

const REPOSITORY_URL = 'https://github.com/mgazah/WhatsApp-bot';
const API_URL = 'https://api.github.com/repos/mgazah/WhatsApp-bot';

module.exports = {
  name: 'github',
  aliases: ['repo', 'git', 'source', 'sc', 'script'],
  category: 'general',
  description: 'Show the exact bot repository and details',
  usage: '.repo',
  ownerOnly: false,

  async execute(sock, msg, args, extra) {
    const chatId = extra?.from || msg?.key?.remoteJid;

    try {
      const response = await axios.get(API_URL, {
        headers: { 'User-Agent': 'CYNTRON-X' },
        timeout: 8000
      });
      const repo = response.data;
      const message = `╭──⌈ 🐙 GITHUB REPOSITORY ⌋
┃
┃ 🤖 Bot: ${config.botName}
┃ 📦 Repository: ${repo.full_name}
┃ 👨‍💻 Owner: ${repo.owner.login}
┃
┃ 📄 ${repo.description || 'No description provided'}
┃
┃ 🔗 URL: ${REPOSITORY_URL}
┃ ⭐ Stars: ${repo.stargazers_count.toLocaleString()}
┃ 🍴 Forks: ${repo.forks_count.toLocaleString()}
┃ ⚠️ Open issues: ${repo.open_issues_count.toLocaleString()}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()} ✨`;

      await sock.sendMessage(chatId, { text: message }, { quoted: msg });
    } catch (error) {
      console.error('GitHub repository lookup failed:', error?.message || error);
      await sock.sendMessage(chatId, {
        text: `📦 ${config.botName} repository\n\n🔗 ${REPOSITORY_URL}`
      }, { quoted: msg });
    }
  }
};
