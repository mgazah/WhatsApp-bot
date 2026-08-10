/**
 * Menu Command - Display all available commands
 */

const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Menu configuration path
const menuConfigPath = path.join(__dirname, '../../data/menuconfig.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default menu configuration
const defaultMenuConfig = {
  defaultMode: 1,
  userPreferences: {},
  availableModes: {
    1: {
      name: "Image + Text",
      description: "Display menu with image banner and formatted text",
      enabled: true
    },
    2: {
      name: "Text Only",
      description: "Display menu as plain text only",
      enabled: true
    }
  }
};

// Load or create menu configuration
function loadMenuConfig() {
  if (!fs.existsSync(menuConfigPath)) {
    fs.writeFileSync(menuConfigPath, JSON.stringify(defaultMenuConfig, null, 2));
    return defaultMenuConfig;
  }
  try {
    const data = fs.readFileSync(menuConfigPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading menu config:', error);
    return defaultMenuConfig;
  }
}

// Save menu configuration
function saveMenuConfig(menuConfig) {
  try {
    fs.writeFileSync(menuConfigPath, JSON.stringify(menuConfig, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving menu config:', error);
    return false;
  }
}

// Update user preference
function setUserPreference(sender, mode) {
  const menuConfig = loadMenuConfig();
  if (menuConfig.availableModes[mode] && menuConfig.availableModes[mode].enabled) {
    menuConfig.userPreferences[sender] = mode;
    saveMenuConfig(menuConfig);
    return true;
  }
  return false;
}

// Get user preference
function getUserPreference(sender) {
  const menuConfig = loadMenuConfig();
  return menuConfig.userPreferences[sender] || menuConfig.defaultMode;
}

function getTimeGreeting() {
  const timezone = config.timezone || 'Africa/Nairobi';
  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const hours = localTime.getHours();
  
  if (hours >= 5 && hours < 12) {
    return '🌅 Good Morning';
  } else if (hours >= 12 && hours < 17) {
    return '☀️ Good Afternoon';
  } else if (hours >= 17 && hours < 21) {
    return '🌤️ Good Evening';
  } else {
    return '🌙 Good Night';
  }
}

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function getFormattedTime() {
  const timezone = config.timezone || 'Africa/Nairobi';
  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  let hours = localTime.getHours();
  const minutes = localTime.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function getFormattedDate() {
  const timezone = config.timezone || 'Africa/Nairobi';
  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return localTime.toLocaleDateString('en-US', options);
}

// Generate menu text
function generateMenuText(categories, totalCommands, extra, displayMode) {
  const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
  const displayOwner = ownerNames[0] || config.ownerName || 'Bot Owner';
  const userName = extra.sender.split('@')[0];
  const greeting = getTimeGreeting();
  const currentTime = getFormattedTime();
  const currentDate = getFormattedDate();
  const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
  const totalMemory = 100;
  const cpuCores = os.cpus().length;
  
  let menuText = `╭──⌈ *🐙 I am ${config.botName}* ⌋\n`;
  menuText += `┃ ${greeting} @${userName}\n`;
  menuText += `┃ ◆ Time: ${currentTime} | ${currentDate}\n`;
  menuText += `┃ ◆ Owner: ${displayOwner}\n`;
  menuText += `┃ ◆ Mode: ${config.selfMode ? 'Private' : 'Public'}\n`;
  menuText += `┃ ◆ Prefix: ${config.prefix}\n`;
  menuText += `┃ ◆ Version: ${config.botVersion}\n`;
  menuText += `┃ ◆ Platform: ${os.platform()}\n`;
  menuText += `┃ ◆ Status: Active\n`;
  menuText += `┃ ◆ CPU Cores: ${cpuCores}\n`;
  menuText += `┃ ◆ Timezone: ${config.timezone || 'Africa/Nairobi'}\n`;
  menuText += `┃ ◆ Uptime: ${formatUptime(process.uptime())}\n`;
  menuText += `┃ ◆ Memory: ${usedMemory}MB / ${totalMemory}MB\n`;
  menuText += `┃ ◆ Commands: ${totalCommands}\n`;
  menuText += `╰────────────────\n\n`;
  
  // Categories order
  const categoryOrder = ['general', 'ai', 'group', 'admin', 'owner', 'media', 'fun', 'utility', 'anime', 'textmaker', 'downloader', 'converter', 'sports', 'tools'];
  
  for (const category of categoryOrder) {
    if (categories[category] && categories[category].length > 0) {
      const categoryIcons = {
        general: '📌', ai: '🧠', group: '👥', admin: '🛡️', owner: '👑',
        media: '🎵', fun: '🎮', utility: '🔧', anime: '🎌', textmaker: '✏️',
        downloader: '📥', converter: '🔄', sports: '⚽', tools: '🛠️'
      };
      const icon = categoryIcons[category] || '📁';
      const categoryName = category.toUpperCase();
      
      menuText += `╭─⊷ ${icon} ${categoryName} COMMANDS\n`;
      menuText += `│\n`;
      categories[category].forEach(cmd => {
        menuText += `│ • ${config.prefix}${cmd.name}\n`;
      });
      menuText += `│\n`;
      menuText += `╰─⊷\n\n`;
    }
  }
  
  menuText += `╭────────────────────╮\n`;
  menuText += `│ 💡 ${config.prefix}help <cmd>\n`;
  menuText += `│ 🎨 ${config.prefix}setmenu 1/2\n`;
  menuText += `╰────────────────────╯\n\n`;
  menuText += `✨ POWERED BY ${config.botName.toUpperCase()} ✨`;
  
  return menuText;
}

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'general',
  description: 'Show all available commands',
  usage: '.menu',
  
  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const categories = {};
      
      // Count only main commands (not aliases)
      let totalCommands = 0;
      
      commands.forEach((cmd, name) => {
        if (cmd.name === name) {
          totalCommands++;
          if (!categories[cmd.category]) {
            categories[cmd.category] = [];
          }
          categories[cmd.category].push(cmd);
        }
      });
      
      const sender = extra.sender;
      const userMode = getUserPreference(sender);
      const menuText = generateMenuText(categories, totalCommands, extra, userMode);
      
      // Display menu based on user preference
      if (userMode === 1) {
        // Mode 1: Image + Text
        const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
        
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          await sock.sendMessage(extra.from, {
            image: imageBuffer,
            caption: menuText,
            mentions: [sender],
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
                newsletterName: config.botName,
                serverMessageId: -1
              }
            }
          }, { quoted: msg });
        } else {
          await sock.sendMessage(extra.from, { text: menuText, mentions: [sender] }, { quoted: msg });
        }
      } else {
        // Mode 2: Text Only
        await sock.sendMessage(extra.from, { text: menuText, mentions: [sender] }, { quoted: msg });
      }
      
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
}