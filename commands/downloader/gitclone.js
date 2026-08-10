/**
 * Git Clone Command - Download GitHub repository
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'gitclone',
    aliases: ['downloadrepo', 'clonerepo'],
    category: 'downloader',
    description: 'Download a GitHub repository as ZIP',
    usage: '.gitclone <github_url>',
    
    async execute(sock, msg, args, extra) {
        try {
            const url = args[0];
            
            if (!url || !url.includes('github.com')) {
                return extra.reply(`❌ Please provide a valid GitHub repository URL.\n\n📌 Usage: ${config.prefix}gitclone https://github.com/user/repo`);
            }
            
            await extra.reply('⏳ Downloading repository...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/download/gitclone?apikey=gifted&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            const repoName = url.split('/').pop();
            
            await sock.sendMessage(extra.from, { document: Buffer.from(response.data), mimetype: 'application/zip', fileName: `${repoName}.zip`, caption: '📦 Repository downloaded!' }, { quoted: msg });
            
        } catch (error) {
            console.error('Git clone error:', error);
            extra.reply('❌ Error downloading repository.');
        }
    }
};
