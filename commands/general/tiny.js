/**
 * TinyURL Command - Shorten URLs using TinyURL API
 */

const config = require('../../config');
const fetch = require('node-fetch');

const fetchJson = async (url, options) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error in fetchJson:", err);
    throw err;
  }
};

module.exports = {
  name: 'tinyurl',
  aliases: ['tiny', 'shorten', 'short', 'shorturl'],
  category: 'general',
  description: 'Shorten a URL using TinyURL',
  usage: '.tinyurl <url>',
  
  async execute(sock, msg, args, extra) {
    try {
      const url = args[0];
      
      if (!url) {
        return extra.reply(`❌ Please provide a URL to shorten.\n\n📌 Usage: ${config.prefix}tinyurl https://example.com`);
      }

      // Build API URL
      const apiUrl = `https://api.davidcyriltech.my.id/tinyurl?url=${encodeURIComponent(url)}`;

      // Call API to shorten URL
      const response = await fetchJson(apiUrl);
      const result = response.result;

      if (!result) {
        return extra.reply('❌ Failed to shorten URL. Please try again.');
      }

      // Send just the shortened link
      await sock.sendMessage(extra.from, {
        text: result
      }, { quoted: msg });

    } catch (error) {
      console.error("Error in shortening URL:", error);
      extra.reply(`❌ An error occurred: ${error.message}`);
    }
  }
};