/**
 * MediaFire Download Command - Download MediaFire files
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'mediafire',
    aliases: ['mfdl', 'mediafiredl'],
    category: 'downloader',
    description: 'Download files from MediaFire',
    usage: '.mediafire <mediafire_url>',
    
    async execute(sock, msg, args, extra) {
        try {
            const url = args[0];
            
            if (!url || !url.includes('mediafire.com')) {
                return extra.reply(`❌ Please provide a valid MediaFire URL.\n\n📌 Usage: ${config.prefix}mediafire https://www.mediafire.com/file/...`);
            }
            
            await extra.reply('⏳ Fetching file...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/download/mediafire?apikey=gifted&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data.success) {
                return extra.reply('❌ Failed to fetch file.');
            }
            
            const fileUrl = response.data.result.dl_link;
            const fileName = response.data.result.fileName || 'mediafire_file';
            
            const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            
            await sock.sendMessage(extra.from, { document: Buffer.from(fileResponse.data), fileName: fileName, caption: '📁 File downloaded from MediaFire!' }, { quoted: msg });
            
        } catch (error) {
            console.error('MediaFire error:', error);
            extra.reply('❌ Error downloading MediaFire file.');
        }
    }
};