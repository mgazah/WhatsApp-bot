/**
 * Set Prefix Command - Change bot command prefix
 */

const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  category: 'owner',
  description: 'Change bot command prefix (use "none" for no prefix)',
  usage: '.setprefix <new prefix | none>',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    try {
      if (args.length === 0) {
        const displayPrefix = config.prefix === '' ? 'none' : config.prefix;
        return extra.reply(`📌 Current prefix: ${displayPrefix}\n\nUsage: .setprefix <new prefix | none>\n\nExample: .setprefix !\n.setprefix none`);
      }
      
      let newPrefix = args[0];
      
      // Handle "none" as empty prefix
      if (newPrefix.toLowerCase() === 'none') {
        newPrefix = '';
      }
      
      if (newPrefix !== '' && newPrefix.length > 3) {
        return extra.reply('❌ Prefix must be 1-3 characters long, or use "none" for no prefix!');
      }
      
      // Update config
      config.prefix = newPrefix;
      
      // Update config file
      const configPath = path.join(__dirname, '../../config.js');
      let configContent = fs.readFileSync(configPath, 'utf-8');
      
      // Handle empty prefix (none)
      const prefixValue = newPrefix === '' ? "''" : `'${newPrefix}'`;
      configContent = configContent.replace(/prefix: '.*'/, `prefix: ${prefixValue}`);
      configContent = configContent.replace(/prefix: ""/, `prefix: ${prefixValue}`);
      fs.writeFileSync(configPath, configContent);
      
      const displayPrefix = newPrefix === '' ? 'none (no prefix needed)' : newPrefix;
      await extra.reply(`✅ Prefix changed to: ${displayPrefix}\n\nNew command format: ${newPrefix === '' ? 'just type command name' : `${newPrefix}command`}\n\nExample: ${newPrefix === '' ? 'menu' : `${newPrefix}menu`}`);
      
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};