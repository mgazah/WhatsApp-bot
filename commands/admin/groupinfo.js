/**
 * Group Info Command - Display group information
 */

const config = require('../../config');

module.exports = {
    name: 'groupinfo',
    aliases: ['info', 'ginfo', 'groupdata'],
    category: 'admin',
    description: 'Show group information',
    usage: '.groupinfo',
    groupOnly: true,
    
    async execute(sock, msg, args, extra) {
      try {
        const metadata = extra.groupMetadata;
        
        const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const members = metadata.participants.filter(p => !p.admin);
        
        const groupIcon = metadata.subject?.charAt(0) || '👥';
        
        let text = `╭──⌈ 📊 GROUP INFO ⌋
┃
┃ 🏷️ Name: ${metadata.subject}
┃ 🆔 ID: ${metadata.id}
┃
┃ 👥 Total Members: ${metadata.participants.length}
┃ 👑 Admins: ${admins.length}
┃ 🧑 Members: ${members.length}
┃
┃ 🔒 Restricted: ${metadata.restrict ? '✅ Yes' : '❌ No'}
┃ 📢 Announce: ${metadata.announce ? '✅ Yes' : '❌ No'}
┃
┃ 📝 Description:
┃ ${metadata.desc || 'No description set'}
┃
┃ 📅 Created: ${new Date(metadata.creation * 1000).toLocaleDateString()}
┃
╰────────────────

╭──⌈ 👑 ADMINS LIST ⌋
┃
`;
        
        for (let i = 0; i < Math.min(admins.length, 15); i++) {
          const admin = admins[i];
          const adminName = admin.id.split('@')[0];
          text += `┃ ${i + 1}. @${adminName}\n`;
        }
        
        if (admins.length > 15) {
          text += `┃
┃ 📌 +${admins.length - 15} more admins
`;
        }
        
        text += `┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
        
        await sock.sendMessage(extra.from, {
          text,
          mentions: admins.map(a => a.id)
        }, { quoted: msg });
        
      } catch (error) {
        console.error('Group info error:', error);
        await extra.reply(`❌ Error: ${error.message}`);
      }
    }
  };