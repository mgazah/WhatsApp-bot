// commands/admin/groupstats.js

const { getStats } = require('../../utils/groupstats');
const config = require('../../config');

module.exports = {
    name: 'groupstats',
    aliases: ['stats', 'leaderboard', 'gstats', 'topmembers', 'msgs', 'messagestats'],
    category: 'admin',
    description: 'Show today\'s group chat statistics',
    usage: '.groupstats',
    groupOnly: true,

    async execute(sock, msg, args, extra) {
        try {
            const from = extra.from;
            const stats = getStats(from);

            if (!stats)
                return extra.reply('📊 No activity recorded today.');

            const { total, users } = stats;

            // Get group name for header
            let groupName = 'Group';
            try {
                const metadata = await sock.groupMetadata(from);
                groupName = metadata.subject || 'Group';
            } catch (e) {}

            // top members
            const sortedUsers = Object.entries(users)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            let message = `╭──⌈ 📊 GROUP STATS ⌋
┃
┃ 🏷️ Group: ${groupName}
┃ 📅 Date: ${new Date().toLocaleDateString()}
┃
┃ 📨 Total Messages: ${total}
┃ 👥 Active Members: ${Object.keys(users).length}
┃
╰────────────────

╭──⌈ 🏆 TOP ACTIVE MEMBERS ⌋
┃
`;

            for (let i = 0; i < sortedUsers.length; i++) {
                const [id, count] = sortedUsers[i];
                const username = id.split('@')[0];
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📌';
                message += `┃ ${medal} ${i + 1}. @${username} — ${count} msgs\n`;
            }

            if (sortedUsers.length === 0) {
                message += `┃ 📭 No active users yet\n`;
            }

            message += `┃
╰────────────────

💡 Type ${config.prefix}myactivity to see your stats

✨ POWERED BY ${config.botName.toUpperCase()}`;

            await sock.sendMessage(from, {
                text: message,
                mentions: sortedUsers.map(u => u[0])
            }, { quoted: msg });

        } catch (err) {
            console.error('[groupstats cmd] error:', err);
            extra.reply('❌ Error loading stats.');
        }
    }
};