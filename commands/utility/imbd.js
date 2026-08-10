/**
 * IMDB Command - Get movie/TV show information
 */

const config = require('../../config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "imdb",
    aliases: ["movie", "tv", "series"],
    desc: "Get movie or TV show information from IMDB",
    category: "utility",
    cooldown: 5,
    
    async execute(sock, message, args, extra) {
        const text = args.join(" ");
        if (!text) return extra.reply("🎬 *Provide a movie or series name.*\n\nExample: .imdb Inception");
        
        try {
            const { data } = await axios.get(`http://www.omdbapi.com/?apikey=742b2d09&t=${text}&plot=full`);
            if (data.Response === "False") throw new Error();

            const imdbText = `🎬 *IMDB SEARCH*\n\n`
                + `*Title:* ${data.Title}\n`
                + `*Year:* ${data.Year}\n`
                + `*Rated:* ${data.Rated}\n`
                + `*Released:* ${data.Released}\n`
                + `*Runtime:* ${data.Runtime}\n`
                + `*Genre:* ${data.Genre}\n`
                + `*Director:* ${data.Director}\n`
                + `*Actors:* ${data.Actors}\n`
                + `*Plot:* ${data.Plot}\n`
                + `*IMDB Rating:* ${data.imdbRating} ⭐\n`
                + `*Votes:* ${data.imdbVotes}\n\n`
                + `✨ POWERED BY ${config.botName.toUpperCase()}`;

            const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
            const imageBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;
            
            if (imageBuffer) {
                await sock.sendMessage(extra.from, {
                    image: imageBuffer,
                    caption: imdbText
                }, { quoted: message });
            } else {
                await extra.reply(imdbText);
            }
        } catch (error) {
            extra.reply("❌ Unable to fetch IMDb data.");
        }
    }
};