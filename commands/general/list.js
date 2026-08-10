/**
 * List Command
 * Show all commands with descriptions
 */

const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');
const { sendButtons } = require('gifted-btns');

module.exports = {
  name: 'list',
  aliases: ['commands', 'cmdlist'],
  description: 'List all commands with descriptions',
  usage: '.list',
  category: 'general',
  
  async execute(sock, msg, args, extra) {
    try {
      const prefix = config.prefix;
      const commands = loadCommands();
      const categories = {};
      
      // Group commands by category
      commands.forEach((cmd, name) => {
        if (cmd.name === name) {
          const category = (cmd.category || 'other').toLowerCase();
          if (!categories[category]) {
            categories[category] = [];
          }
          categories[category].push({
            name: cmd.name,
            aliases: cmd.aliases || [],
            description: cmd.description || 'No description',
            usage: cmd.usage || `${prefix}${cmd.name}`
          });
        }
      });
      
      // Category display order
      const categoryOrder = {
        'general': 1,
        'ai': 2,
        'group': 3,
        'admin': 4,
        'owner': 5,
        'media': 6,
        'fun': 7,
        'utility': 8,
        'anime': 9,
        'textmaker': 10,
        'downloader': 11,
        'converter': 12,
        'other': 99
      };
      
      // Sort categories by defined order
      const orderedCats = Object.keys(categories).sort((a, b) => {
        const orderA = categoryOrder[a] || 99;
        const orderB = categoryOrder[b] || 99;
        return orderA - orderB;
      });
      
      // Category emoji mapping
      const categoryEmojis = {
        'general': '📌',
        'ai': '🧠',
        'group': '👥',
        'admin': '🛡️',
        'owner': '👑',
        'media': '🎵',
        'fun': '🎮',
        'utility': '🔧',
        'anime': '🎌',
        'textmaker': '✏️',
        'downloader': '📥',
        'converter': '🔄',
        'other': '📁'
      };
      
      let menuText = `╭──⌈ 📋 ${config.botName} COMMANDS ⌋\n`;
      menuText += `┃ ◆ Prefix: ${prefix}\n`;
      menuText += `┃ ◆ Total: ${commands.size} commands\n`;
      menuText += `╰────────────────\n\n`;
      
      for (const cat of orderedCats) {
        const emoji = categoryEmojis[cat] || '📁';
        const catName = cat.toUpperCase();
        menuText += `╭─⊷ ${emoji} ${catName}\n`;
        menuText += `│\n`;
        
        for (const cmd of categories[cat]) {
          const cmdDisplay = `${prefix}${cmd.name}`;
          const desc = cmd.description;
          menuText += `│ • ${cmdDisplay}\n`;
          menuText += `│   └─ ${desc}\n`;
          menuText += `│\n`;
        }
        
        menuText += `╰─⊷\n\n`;
      }
      
      menuText += `╭────────────────────╮\n`;
      menuText += `│ 💡 ${prefix}help <cmd>\n`;
      menuText += `│ 📖 Get command details\n`;
      menuText += `╰────────────────────╯\n\n`;
      menuText += `✨ POWERED BY ${config.botName.toUpperCase()} ✨`;
      
      // Send message with buttons using gifted-btns
      await sendButtons(sock, extra.from, {
        title: '',
        text: menuText,
        footer: `> Powered by ${config.botName}`,
        buttons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '📦 Bot Repo',
              url: config.social?.github || 'https://github.com/MrKing254'
            })
          },
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '📢 Join Channel',
              url: 'https://whatsapp.com/channel/0029VbBaJvI7IUYbtCeaPh0I'
            })
          }
        ]
      }, { quoted: msg });
      
    } catch (err) {
      console.error('list.js error:', err);
      await extra.reply('❌ Failed to load commands list.');
    }
  }
};