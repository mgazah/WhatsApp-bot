/**
 * YouTube Stalk Command - Get information about a YouTube channel
 */

const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'ytstalk',
  aliases: ['youtubestalk', 'ytsearch', 'ytinfo'],
  category: 'utility',
  description: 'Get information about a YouTube channel',
  usage: '.ytstalk <channel name>',
  
  async execute(sock, msg, args, extra) {
    try {
      const channelName = args.join(' ');
      
      if (!channelName) {
        return extra.reply(`❌ Please provide a YouTube channel name.\n\n📌 Usage: ${config.prefix}ytstalk Malvin King Tech`);
      }

      await extra.reply('⏳ Searching for YouTube channel...');

      // Fetch YouTube channel information from the API
      const response = await axios.get(`https://api.siputzx.my.id/api/stalk/youtube?username=${encodeURIComponent(channelName)}`);
      const { status, data } = response.data;

      if (!status || !data) {
        return extra.reply('❌ No information found for the specified YouTube channel. Please try again.');
      }

      const {
        channel: {
          username: ytUsername,
          subscriberCount,
          videoCount,
          avatarUrl,
          channelUrl,
          description,
        },
        latest_videos,
      } = data;

      // Format the YouTube channel information message
      const ytMessage = `📺 YouTube Channel: ${ytUsername}
👥 Subscribers: ${subscriberCount}
🎥 Total Videos: ${videoCount}
📝 Description: ${description || 'N/A'}
🔗 Channel URL: ${channelUrl}

🎬 Latest Videos:
${latest_videos.slice(0, 3).map((video, index) => `
${index + 1}. ${video.title}
   ▶️ Views: ${video.viewCount}
   ⏱️ Duration: ${video.duration}
   📅 Published: ${video.publishedTime}
`).join('\n')}

✨ POWERED BY ${config.botName.toUpperCase()}`;

      // Send the YouTube channel information with profile picture
      await sock.sendMessage(extra.from, {
        image: { url: avatarUrl },
        caption: ytMessage
      }, { quoted: msg });

    } catch (error) {
      console.error('Error fetching YouTube channel information:', error);
      extra.reply('❌ Unable to fetch YouTube channel information. Please try again later.');
    }
  }
};