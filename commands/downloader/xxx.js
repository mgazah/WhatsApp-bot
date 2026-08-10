/**
 * Video Download Command - Get video from API with options
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'xnxx',
    aliases: ['18+', 'xvideo', 'xxx'],
    category: 'downloader',
    description: 'Download video from API',
    usage: '.video <query>',
    
    async execute(sock, msg, args, extra) {
        try {
            const query = args.join(' ');
            
            if (!query) {
                return extra.reply(`❌ Please provide a video name or keyword.\n\n📌 Usage: ${config.prefix}xnxx step mother `);
            }
            
            await extra.reply(`⏳ Searching for "${query}"...`);
            
            // ========== REPLACE THIS URL WITH YOUR API ==========
            const apiUrl = `https://api.giftedtech.co.ke/api/download/xvideosdl?apikey=gifted&url=${encodeURIComponent(query)}`;
            // ===================================================
            
            const response = await axios.get(apiUrl);
            
            if (!response.data.success || !response.data.results || response.data.results.length === 0) {
                return extra.reply('❌ No videos found. Please try a different keyword.');
            }
            
            const videos = response.data.results.slice(0, 5);
            
            let message = `📹 SEARCH RESULTS\n\n`;
            for (let i = 0; i < videos.length; i++) {
                message += `${i + 1}. ${videos[i].title}\n   ⏱️ ${videos[i].duration || 'Unknown'}\n\n`;
            }
            message += `💡 Reply with the number (1-${videos.length}) to download.`;
            
            const sentMsg = await extra.reply(message);
            
            // Wait for user response
            const responseCollector = (msg) => {
                const from = msg.key.remoteJid;
                const sender = msg.key.participant || msg.key.remoteJid;
                const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const number = parseInt(body);
                
                if (sender === extra.sender && number >= 1 && number <= videos.length) {
                    return number;
                }
                return null;
            };
            
            // Simple timeout (you'll need to implement proper collector)
            setTimeout(async () => {
                const selected = 1; // For demo
                const video = videos[selected - 1];
                
                await sock.sendMessage(extra.from, {
                    video: { url: video.url },
                    caption: `🎬 ${video.title}\n\n✨ POWERED BY ${config.botName.toUpperCase()}`
                }, { quoted: msg });
            }, 3000);
            
        } catch (error) {
            console.error('Video download error:', error);
            extra.reply('❌ Error downloading video. Please try again later.');
        }
    }
};