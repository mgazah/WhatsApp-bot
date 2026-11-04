/**
 * Play Command - Download audio from YouTube as an MP3 document
 */

const yts = require('yt-search');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const APIs = require('../../utils/api');
const { toAudio } = require('../../utils/converter');
const config = require('../../config');

const execFileAsync = promisify(execFile);

async function compressForWhatsApp(buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyntron-audio-'));
  const input = path.join(dir, 'input.mp3');
  const output = path.join(dir, 'output.mp3');
  try {
    fs.writeFileSync(input, buffer);
    await execFileAsync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vn', '-b:a', '64k', '-ac', '2', output], { timeout: 60000 });
    return fs.readFileSync(output);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function downloadResolvedAudio(audioData) {
  const downloadUrl = audioData?.download || audioData?.url || audioData?.dl;
  if (!downloadUrl) throw new Error('Provider returned no download URL');
  const response = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxContentLength: 30 * 1024 * 1024,
    maxBodyLength: 30 * 1024 * 1024,
    headers: { 'User-Agent': 'CYNTRON-X/1.0', Accept: 'audio/mpeg,*/*' }
  });
  const buffer = Buffer.from(response.data);
  if (!buffer.length) throw new Error('Provider returned an empty audio file');
  return { buffer, remoteUrl: downloadUrl, extension: 'mp3', title: audioData.title, thumbnail: audioData.thumbnail, downloadUrl, source: audioData.source };
}

async function downloadWithKnight(url) {
  return downloadResolvedAudio(await APIs.getKnightAudioByUrl(url));
}

async function downloadWithApix(url) {
  return downloadResolvedAudio(await APIs.getApixAudioByUrl(url));
}

async function downloadWithYtDlp(url) {
  const strategies = [
    ['--extractor-args', 'youtube:player_client=android,web_safari'],
    ['--extractor-args', 'youtube:player_client=tv,android'],
    []
  ];
  const errors = [];

  for (const strategy of strategies) {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyntron-play-'));
    const outputTemplate = path.join(workDir, 'audio.%(ext)s');
    try {
      await execFileAsync('python3', [
        '-m', 'yt_dlp',
        '--ignore-config',
        '--no-playlist',
        '--format', 'bestaudio/best',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '5',
        '--max-filesize', '25M',
        '--no-warnings',
        '--no-progress',
        ...strategy,
        '-o', outputTemplate,
        url
      ], { timeout: 120000, maxBuffer: 2 * 1024 * 1024 });

      const file = fs.readdirSync(workDir)
        .map(name => path.join(workDir, name))
        .find(candidate => fs.statSync(candidate).isFile());
      if (!file) throw new Error('yt-dlp produced no audio file');
      return { buffer: fs.readFileSync(file), extension: path.extname(file).slice(1) || 'mp3' };
    } catch (error) {
      errors.push(error.stderr?.trim() || error.message);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }
  throw new Error(errors.join(' | '));
}

async function downloadWithApiFallbacks(url) {
  const apiMethods = [
    { name: 'EliteProTech', method: () => APIs.getEliteProTechDownloadByUrl(url) },
    { name: 'Yupra', method: () => APIs.getYupraDownloadByUrl(url) },
    { name: 'Okatsu', method: () => APIs.getOkatsuDownloadByUrl(url) },
    { name: 'Izumi', method: () => APIs.getIzumiDownloadByUrl(url) }
  ];
  const errors = [];

  for (const apiMethod of apiMethods) {
    try {
      const audioData = await apiMethod.method();
      const audioUrl = audioData.download || audioData.dl || audioData.url;
      if (!audioUrl) throw new Error('provider returned no download URL');

      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        decompress: true,
        validateStatus: status => status >= 200 && status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          Accept: '*/*',
          'Accept-Encoding': 'identity'
        }
      });
      const buffer = Buffer.from(response.data);
      if (buffer.length > 0) return { buffer, extension: 'mp3' };
      throw new Error('provider returned an empty file');
    } catch (error) {
      errors.push(`${apiMethod.name}: ${error.message}`);
    }
  }

  throw new Error(errors.join(' | '));
}

module.exports = {
  name: 'play',
  aliases: ['mp3', 'docaudio'],
  category: 'media',
  description: 'Download audio from YouTube as an MP3 file',
  usage: '.play <song name or YouTube link>',

  async execute(sock, msg, args, extra) {
    try {
      const text = args.join(' ').trim();
      const chatId = extra.from;
      if (!text) {
        return await extra.reply(`📌 Usage: ${config.prefix}play <song name or YouTube link>\n\nExample: ${config.prefix}play Believer Imagine Dragons`);
      }

      let candidates;
      if (/youtube\.com|youtu\.be/i.test(text)) {
        candidates = [{ url: text, title: 'YouTube audio', timestamp: 'Unknown' }];
      } else {
        const search = await yts(text);
        if (!search?.videos?.length) return await extra.reply('❌ No results found.');
        candidates = search.videos.slice(0, 3);
      }

      let video = candidates[0];
      const infoText = `🎵 *${video.title}*\n⏱ Duration: ${video.timestamp || 'Unknown'}\n📺 Channel: ${video.author?.name || 'Unknown'}\n\n⏳ Downloading audio...`;
      // Reply immediately; thumbnail delivery can block WhatsApp media uploads.
      await extra.reply(infoText);

      let download;
      const downloadErrors = [];
      for (const candidate of candidates) {
        try {
          download = await downloadWithYtDlp(candidate.url);
          console.log(`Play download completed with yt-dlp: ${candidate.url}`);
          video = candidate;
          break;
        } catch (ytDlpError) {
          downloadErrors.push(`yt-dlp ${candidate.url}: ${ytDlpError.message}`);
        }
        try {
          download = await downloadWithKnight(candidate.url);
          if (download.title) candidate.title = download.title;
          if (download.thumbnail) candidate.thumbnail = download.thumbnail;
          console.log(`Play download completed with KnightBot: ${candidate.url}`);
          video = candidate;
          break;
        } catch (knightError) {
          downloadErrors.push(`KnightBot ${candidate.url}: ${knightError.message}`);
        }
        try {
          download = await downloadWithApix(candidate.url);
          if (download.title) candidate.title = download.title;
          if (download.thumbnail) candidate.thumbnail = download.thumbnail;
          console.log(`Play download completed with Apix: ${candidate.url}`);
          video = candidate;
          break;
        } catch (apixError) {
          downloadErrors.push(`Apix ${candidate.url}: ${apixError.message}`);
          try {
            download = await downloadWithApiFallbacks(candidate.url);
            video = candidate;
            console.log(`Play download completed with API fallback: ${candidate.url}`);
            break;
          } catch (apiError) {
            downloadErrors.push(`API ${candidate.url}: ${apiError.message}`);
          }
        }
      }
      if (!download) {
        console.error('All play download attempts failed:', downloadErrors.join(' | '));
        throw new Error('All selected YouTube results failed to download');
      }

      let finalBuffer = download.buffer;
      let finalExtension = download.extension || 'mp3';
      if (!['mp3', 'm4a', 'ogg'].includes(finalExtension)) finalExtension = 'mp3';

      if (finalExtension !== 'mp3') {
        try {
          finalBuffer = await toAudio(finalBuffer, finalExtension);
          finalExtension = 'mp3';
        } catch (conversionError) {
          console.warn('Audio conversion failed; sending original format:', conversionError.message);
        }
      }

      const safeTitle = (video.title || 'audio').replace(/[^\w\s-]/g, '').trim() || 'audio';
      const fileName = `${safeTitle}.${finalExtension}`;
      try {
        const media = finalBuffer
          ? { audio: finalBuffer, mimetype: 'audio/mpeg', ptt: false }
          : { audio: { url: download.remoteUrl }, mimetype: 'audio/mpeg', ptt: false };
        await sock.sendMessage(chatId, {
          ...media,
          caption: `🎵 ${video.title}\n⏱ Duration: ${video.timestamp || 'Unknown'}\n\n✨ POWERED BY ${config.botName.toUpperCase()} ✨`
        }, { quoted: msg, mediaUploadTimeoutMs: 120000 });
      } catch (uploadError) {
        console.error('WhatsApp audio upload failed:', uploadError.message || uploadError);
        if (finalBuffer) {
          try {
            const smallerBuffer = await compressForWhatsApp(finalBuffer);
            await sock.sendMessage(chatId, {
              audio: smallerBuffer,
              mimetype: 'audio/mpeg',
              fileName,
              ptt: false
            }, { quoted: msg, mediaUploadTimeoutMs: 120000 });
            return;
          } catch (retryError) {
            console.error('Compressed audio upload also failed:', retryError.message || retryError);
          }
        }
        throw uploadError;
      }
    } catch (error) {
      console.error('Play command error:', error.message || error);
      await extra.reply('❌ Failed to download audio. Please try another song or YouTube link.');
    }
  }
};
