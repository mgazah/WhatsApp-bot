/**
 * Spotify Download Command - Download Spotify tracks
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'spotifydl',
    aliases: ['spotify', 'spdl', 'spotifydownload'],
    category: 'downloader',
    description: 'Download a Spotify track',
    usage: '.spotifydl <spotify_url>',
    
    async execute(sock, msg, args, extra) {
        try {
            const url = args[0];
            
            if (!url || !url.includes('spotify.com')) {
                return extra.reply(`❌ Please provide a valid Spotify track URL.\n\n📌 Usage: ${config.prefix}spotifydl https://open.spotify.com/track/...`);
            }
            
            await extra.reply('⏳ Downloading track...');
            
            const apiUrl = `https://api.giftedtech.co.ke/api/download/spotifydlv3?apikey=gifted&url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            await sock.sendMessage(extra.from, { audio: Buffer.from(response.data), mimetype: 'audio/mpeg', fileName: 'track.mp3' }, { quoted: msg });
            
        } catch (error) {
            console.error('Spotify download error:', error);
            extra.reply('❌ Error downloading Spotify track.');
        }
    }
};