/**
 * Set Menu Command - Change menu display mode (1=Image+Text, 2=Text Only)
 */

const config = require('../../config');
const fs = require('fs');
const path = require('path');

const menuConfigPath = path.join(__dirname, '../../data/menuconfig.json');

function loadMenuConfig() {
  if (!fs.existsSync(menuConfigPath)) {
    return { defaultMode: 1, userPreferences: {}, availableModes: {} };
  }
  try {
    const data = fs.readFileSync(menuConfigPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading menu config:', error);
    return { defaultMode: 1, userPreferences: {}, availableModes: {} };
  }
}

function saveMenuConfig(menuConfig) {
  try {
    fs.writeFileSync(menuConfigPath, JSON.stringify(menuConfig, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving menu config:', error);
    return false;
  }
}

function setUserPreference(sender, mode) {
  const menuConfig = loadMenuConfig();
  if (menuConfig.availableModes[mode] && menuConfig.availableModes[mode].enabled) {
    menuConfig.userPreferences[sender] = mode;
    saveMenuConfig(menuConfig);
    return true;
  }
  return false;
}

module.exports = {
  name: 'setmenu',
  aliases: ['setmode', 'menumode'],
  category: 'general',
  description: 'Change your menu display mode (1=Image+Text, 2=Text Only)',
  usage: '.setmenu 1 or .setmenu 2',
  
  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        const menuConfig = loadMenuConfig();
        const currentMode = menuConfig.userPreferences[extra.sender] || menuConfig.defaultMode;
        
        let modeInfo = `🎨 *Menu Mode Settings*\n\n`;
        modeInfo += `Your Current Mode: *${currentMode}*\n\n`;
        modeInfo += `*Available Modes:*\n`;
        modeInfo += `\n1. 🖼️ *Image + Text*\n`;
        modeInfo += `   └─ Shows menu with bot image\n`;
        modeInfo += `\n2. 📝 *Text Only*\n`;
        modeInfo += `   └─ Shows menu as plain text\n\n`;
        modeInfo += `─────────────────────────────\n`;
        modeInfo += `💡 Usage: ${config.prefix}setmenu <1/2>\n`;
        modeInfo += `   Example: ${config.prefix}setmenu 2\n\n`;
        modeInfo += `✨ POWERED BY ${config.botName.toUpperCase()} ✨`;
        
        await extra.reply(modeInfo);
        return;
      }
      
      const mode = parseInt(args[0]);
      
      if (mode === 1 || mode === 2) {
        setUserPreference(extra.sender, mode);
        
        let successMsg = `✅ *Menu mode changed successfully!*\n\n`;
        if (mode === 1) {
          successMsg += `🖼️ *Image + Text Mode*\n`;
          successMsg += `Menu will be displayed with bot image\n\n`;
        } else {
          successMsg += `📝 *Text Only Mode*\n`;
          successMsg += `Menu will be displayed as plain text\n\n`;
        }
        successMsg += `💡 Type ${config.prefix}menu to see the new display!`;
        
        await extra.reply(successMsg);
      } else {
        await extra.reply(`❌ Invalid mode! Please use 1 or 2.\n\n💡 Type ${config.prefix}setmenu to see available modes.`);
      }
      
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
}