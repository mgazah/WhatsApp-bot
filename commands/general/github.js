/**
 * GitHub Command - Show bot GitHub repository and stats
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'github',
    aliases: ['repo', 'git', 'source', 'sc', 'script'],
    category: 'general',
    description: 'Show bot GitHub repository and statistics',
    usage: '.github',
    ownerOnly: false,

    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            
            // GitHub repository URL
            const repoUrl = 'https://github.com/AmonTech1/NOVA-MD';
            const apiUrl = 'https://api.github.com/repos/AmonTech1/NOVA-MD';
            
            // Send loading message
            await extra.reply('⏳ Fetching GitHub repository information...');
            
            try {
                // Fetch repository data from GitHub API
                const response = await axios.get(apiUrl, {
                    headers: {
                        'User-Agent': 'NOVA-MD'
                    }
                });
                
                const repo = response.data;
                
                // Format the response with new stylish design
                let message = `╭──⌈ 🐙 GITHUB REPOSITORY ⌋
┃
┃ 🤖 Bot Name: ${config.botName}
┃ 📦 Repository: ${repo.name}
┃ 👨‍💻 Owner: ${repo.owner.login}
┃
┃ 📄 Description:
┃ ${repo.description || 'No description provided'}
┃
┃ 🔗 URL: ${repo.html_url}
┃
╰────────────────

╭──⌈ 📊 STATISTICS ⌋
┃
┃ ⭐ Stars: ${repo.stargazers_count.toLocaleString()}
┃ 🍴 Forks: ${repo.forks_count.toLocaleString()}
┃ 👁️ Watchers: ${repo.watchers_count.toLocaleString()}
┃ 📦 Size: ${(repo.size / 1024).toFixed(2)} MB
┃ ⚠️ Issues: ${repo.open_issues_count}
┃
╰────────────────

╭──⌈ 🔗 QUICK LINKS ⌋
┃
┃ ⭐ Star: ${repo.html_url}/stargazers
┃ 🍴 Fork: ${repo.html_url}/fork
┃ 📥 Clone: git clone ${repo.clone_url}
┃
╰────────────────

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await sock.sendMessage(chatId, { text: message }, { quoted: msg });
                
            } catch (apiError) {
                console.error('GitHub API Error:', apiError.message);
                
                // Fallback message with stylish design
                let fallbackMessage = `╭──⌈ 🐙 GITHUB REPOSITORY ⌋
┃
┃ 🤖 Bot Name: ${config.botName}
┃ 📦 Repository: NOVA-MD
┃ 👨‍💻 Owner: AmonTech1
┃
┃ 🔗 URL: ${repoUrl}
┃
╰────────────────

⚠️ Note: Unable to fetch real-time statistics.
Please visit the repository directly for latest stats.

✨ POWERED BY ${config.botName.toUpperCase()}`;
                
                await sock.sendMessage(chatId, { text: fallbackMessage }, { quoted: msg });
            }
            
        } catch (error) {
            console.error('GitHub command error:', error);
            await extra.reply(`❌ Error: ${error.message}`);
        }
    }
};