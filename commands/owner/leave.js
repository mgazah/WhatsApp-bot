/**
 * Leave Command - Bot leaves the group (Owner only)
 */

const config = require('../../config');

module.exports = {
  name: 'leave',
  aliases: ['left', 'leftgc', 'leavegc'],
  category: 'owner',
  description: 'Bot leaves the group (Owner only)',
  usage: '.leave',
  
  async execute(sock, msg, args, extra) {
    try {
      const { isGroup, from, sender, reply } = extra;
      
      if (!isGroup) {
        return reply("❌ This command can only be used in groups.");
      }
      
      // Get bot owner number from config
      const ownerNumber = config.ownerNumber[0]?.replace(/[^0-9]/g, '');
      const senderNumber = sender.split('@')[0];
      
      if (senderNumber !== ownerNumber) {
        return reply("❌ Only the bot owner can use this command.");
      }
      
      await reply("🚪 Leaving group...");
      
      // Small delay before leaving
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await sock.groupLeave(from);
      
    } catch (error) {
      console.error("Error leaving group:", error);
      reply(`❌ Error: ${error.message}`);
    }
  }
};