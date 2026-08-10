/**
 * Stats Command - Display bot statistics
 */

const config = require('../../config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { loadCommands } = require('../../utils/commandLoader');

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
    name: "stats",
    aliases: ["status", "botinfo", "about"],
    desc: "Display bot statistics and information",
    category: "general",
    cooldown: 5,
    
    async execute(sock, message, args, extra) {
        try {
            const commands = loadCommands();
            let totalCommands = 0;
            commands.forEach((cmd, name) => {
                if (cmd.name === name) totalCommands++;
            });
            
            const uptime = formatUptime(process.uptime());
            const usedMemory = process.memoryUsage();
            const cpuCores = os.cpus().length;
            const platform = os.platform();
            const nodeVersion = process.version;
            
            const statsText = `╭──⌈ 📊 ${config.botName} STATS ⌋
┃
┃ 🤖 *Bot Name:* ${config.botName}
┃ 📦 *Version:* ${config.botVersion}
┃ ⚡ *Prefix:* ${config.prefix}
┃ 📚 *Commands:* ${totalCommands}+
┃
┃ ⏱️ *Uptime:* ${uptime}
┃ 💾 *RAM Usage:* ${formatBytes(usedMemory.heapUsed)} / ${formatBytes(usedMemory.heapTotal)}
┃ 🖥️ *Platform:* ${platform}
┃ 🟢 *Node.js:* ${nodeVersion}
┃ 🧠 *CPU Cores:* ${cpuCores}
┃
┃ 👑 *Owner:* ${config.ownerName}
┃ 📱 *Mode:* ${config.selfMode ? 'Private' : 'Public'}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;

            const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
            const imageBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;
            
            if (imageBuffer) {
                await sock.sendMessage(extra.from, {
                    image: imageBuffer,
                    caption: statsText
                }, { quoted: message });
            } else {
                await extra.reply(statsText);
            }
        } catch (error) {
            console.error('Stats error:', error);
            await extra.reply(`❌ Error: ${error.message}`);
        }
    }
};