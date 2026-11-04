/**
 * Song Command - compatibility wrapper for the reliable play implementation.
 * The live command path uses this module for song/audio aliases.
 */
const play = require('./play');

module.exports = {
  name: 'song',
  aliases: ['music', 'yta', 'audio'],
  category: 'media',
  description: 'Download audio from YouTube as playable audio',
  usage: '.song <song name or YouTube link>',
  async execute(sock, msg, args, extra) {
    return play.execute(sock, msg, args, extra);
  }
};
