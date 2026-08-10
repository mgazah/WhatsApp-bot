/**
 * WhatsApp MD Bot - Main Entry Point
 */
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer_cache_disabled';

const { initializeTempSystem } = require('./utils/tempManager');
const { startCleanup } = require('./utils/cleanup');
initializeTempSystem();
startCleanup();
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const forbiddenPatternsConsole = [
  'closing session',
  'closing open session',
  'sessionentry',
  'prekey bundle',
  'pendingprekey',
  '_chains',
  'registrationid',
  'currentratchet',
  'chainkey',
  'ratchet',
  'signal protocol',
  'ephemeralkeypair',
  'indexinfo',
  'basekey'
];

console.log = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleLog.apply(console, args);
  }
};

console.error = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleError.apply(console, args);
  }
};

console.warn = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleWarn.apply(console, args);
  }
};

// Now safe to load libraries
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  delay
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
let config = require('./config');
const handler = require('./handler');
const { AntiDelete } = require('./utils/antidelete');
const { loadCommands } = require('./utils/commandLoader');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

// =============== READ OWNER NUMBER FROM SETTINGS.JS ===============
let settingsConfig = {};
try {
  const settingsPath = path.join(process.cwd(), 'settings.js');
  if (fs.existsSync(settingsPath)) {
    delete require.cache[require.resolve(settingsPath)];
    settingsConfig = require(settingsPath);
    
    // Override owner number from settings.js - KEEP AS ARRAY to maintain compatibility
    if (settingsConfig.ownerNumber && Array.isArray(settingsConfig.ownerNumber) && settingsConfig.ownerNumber.length > 0) {
      config.ownerNumber = settingsConfig.ownerNumber; // Keep as array
      console.log(`✅ [CYNTRON-X] Owner number loaded from settings.js: ${config.ownerNumber[0]}`);
    }
    
    // Override session ID from settings.js if exists
    if (settingsConfig.SESSION_ID) {
      config.sessionID = settingsConfig.SESSION_ID;
      console.log(`✅ [CYNTRON-X] Session ID loaded from settings.js`);
    }
  }
} catch (err) {
  console.log(`⚠️ [CYNTRON-X] Using owner number from config.js`);
}
// ================================================================

// =============== CONFIGURATION FILES ===============
const DATA_DIR = path.join(process.cwd(), 'data');
const AUTOTYPING_FILE = path.join(DATA_DIR, 'autotyping.json');
const AUTORECORD_FILE = path.join(DATA_DIR, 'autorecord.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for autotyping
function isAutoTypingEnabled() {
  try {
    if (fs.existsSync(AUTOTYPING_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTOTYPING_FILE, 'utf8'));
      return data.enabled === true;
    }
  } catch (e) {}
  return true;
}

function setAutoTypingEnabled(enabled) {
  try {
    fs.writeFileSync(AUTOTYPING_FILE, JSON.stringify({ enabled, updatedAt: new Date().toISOString() }, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

function isAutoRecordEnabled() {
  try {
    if (fs.existsSync(AUTORECORD_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTORECORD_FILE, 'utf8'));
      return data.enabled === true;
    }
  } catch (e) {}
  return true;
}

function setAutoRecordEnabled(enabled) {
  try {
    fs.writeFileSync(AUTORECORD_FILE, JSON.stringify({ enabled, updatedAt: new Date().toISOString() }, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}
// =================================================

// Remove Puppeteer cache
function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');

    if (fs.existsSync(cacheDir)) {
      console.log('🧹 [CYNTRON-X] Removing Puppeteer cache at:', cacheDir);
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('✅ [CYNTRON-X] Puppeteer cache removed');
    }
  } catch (err) {
    console.error('⚠️ [CYNTRON-X] Failed to cleanup Puppeteer cache:', err.message || err);
  }
}

// =============== FAKE TYPING SYSTEM ===============
class FakeTypingManager {
  constructor(sock) {
    this.sock = sock;
    this.activeTyping = new Map();
  }

  async startFakeTyping(jid) {
    if (!isAutoTypingEnabled()) return;
    
    this.stopFakeTyping(jid);
    
    const typingData = {
      interval: setInterval(async () => {
        try {
          await this.sock.sendPresenceUpdate('composing', jid);
          if (isAutoRecordEnabled()) {
            await delay(3000);
            await this.sock.sendPresenceUpdate('recording', jid);
          }
        } catch (err) {}
      }, 5000),
      timeout: setTimeout(() => {
        this.stopFakeTyping(jid);
      }, 10000)
    };
    
    this.activeTyping.set(jid, typingData);
  }

  stopFakeTyping(jid) {
    const data = this.activeTyping.get(jid);
    if (data) {
      clearInterval(data.interval);
      clearTimeout(data.timeout);
      this.activeTyping.delete(jid);
      try {
        this.sock.sendPresenceUpdate('paused', jid);
      } catch (err) {}
    }
  }

  stopAllTyping() {
    for (const [jid] of this.activeTyping) {
      this.stopFakeTyping(jid);
    }
  }
}
// =================================================

// Optimized in-memory store
const store = {
  messages: new Map(),
  maxPerChat: 20,

  bind: (ev) => {
    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key?.id) continue;

        const jid = msg.key.remoteJid;
        if (!store.messages.has(jid)) {
          store.messages.set(jid, new Map());
        }

        const chatMsgs = store.messages.get(jid);
        chatMsgs.set(msg.key.id, msg);

        if (chatMsgs.size > store.maxPerChat) {
          const oldestKey = chatMsgs.keys().next().value;
          chatMsgs.delete(oldestKey);
        }
      }
    });
  },

  loadMessage: async (jid, id) => {
    return store.messages.get(jid)?.get(id) || null;
  }
};

// Optimized message deduplication
const processedMessages = new Set();

setInterval(() => {
  processedMessages.clear();
}, 5 * 60 * 1000);

// Custom Pino logger with suppression
const createSuppressedLogger = (level = 'silent') => {
  const forbiddenPatterns = [
    'closing session', 'closing open session', 'sessionentry', 'prekey bundle',
    'pendingprekey', '_chains', 'registrationid', 'currentratchet', 'chainkey',
    'ratchet', 'signal protocol', 'ephemeralkeypair', 'indexinfo', 'basekey'
  ];

  let logger;
  try {
    logger = pino({
      level,
      transport: process.env.NODE_ENV === 'production' ? undefined : {
        target: 'pino-pretty',
        options: { colorize: true, ignore: 'pid,hostname' }
      },
      customLevels: { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 },
      redact: ['registrationId', 'ephemeralKeyPair', 'rootKey', 'chainKey', 'baseKey']
    });
  } catch (err) {
    logger = pino({ level });
  }

  const originalInfo = logger.info.bind(logger);
  logger.info = (...args) => {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ').toLowerCase();
    if (!forbiddenPatterns.some(pattern => msg.includes(pattern))) {
      originalInfo(...args);
    }
  };
  logger.debug = () => { };
  logger.trace = () => { };
  return logger;
};

// =============== STYLISH CONNECTION LOGS ===============
function displayStylishConnectionLogs(botNumber, botName, prefix, ownerNames) {
  const botVersion = config.botVersion || '1.0.0';
  const platform = os.platform();
  const nodeVersion = process.version;
  const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
  
  console.log('\n╭──⌈ 🌟 CYNTRON-X CONNECTED ⌋');
  console.log('┃');
  console.log(`┃ 📱 Bot Number: ${botNumber}`);
  console.log(`┃ 🤖 Bot Name: ${botName}`);
  console.log(`┃ 📦 Version: ${botVersion}`);
  console.log(`┃ ⚡ Prefix: ${prefix}`);
  console.log(`┃ 👑 Owner: ${ownerNames}`);
  console.log(`┃ 💾 Memory: ${memory}MB / 100MB`);
  console.log(`┃ 💻 Platform: ${platform}`);
  console.log(`┃ 🟢 Node.js: ${nodeVersion}`);
  console.log('┃');
  console.log('┃ ✨ ACTIVE FEATURES:');
  console.log(`┃   • Auto Typing: ${isAutoTypingEnabled() ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`┃   • Auto Record: ${isAutoRecordEnabled() ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`┃   • Status React: ${config.autoReactEnabled !== false ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`┃   • Status View: ${config.autoViewStatus ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`┃   • Chatbot: ${config.chatbotEnabled !== false ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log('┃');
  console.log('┃ ✅ Bot is ready to receive messages!');
  console.log(`┃ ⏰ Started at: ${new Date().toLocaleString()}`);
  console.log('┃');
  console.log('╰────────────────');
  console.log(`✨ POWERED BY CYNTRON-X\n`);
}

const STATUS_REACT_FILE = path.join(process.cwd(), 'data', 'statusReact.json');
function isStatusReactEnabled() {
  try {
    if (fs.existsSync(STATUS_REACT_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_REACT_FILE, 'utf8'));
      return data.enabled === true;
    }
  } catch (e) {}
  return config.autoReactEnabled !== false;
}

// Check if message is from channel/newsletter
function isChannelMessage(jid) {
  if (!jid) return false;
  return jid.includes('@newsletter') || jid.includes('@broadcast');
}

// ---------- Helper: Download creds.json from Mega using file ID + key ----------
async function downloadFromMega(megaIdWithKey) {
  // megaIdWithKey format: "fileID#key"
  // First try to use the local ./mega module (assumed to export a 'download' function)
  try {
    const megaModule = require('./mega');
    if (typeof megaModule.download === 'function') {
      console.log('📡 [CYNTRON-X] Using ./mega.download()');
      const data = await megaModule.download(megaIdWithKey);
      return data; // should be Buffer or string
    }
  } catch (err) {
    console.log('📡 [CYNTRON-X] ./mega module not available or no download method, trying megajs...');
  }

  // Fallback: try megajs npm package
  try {
    const { File } = require('megajs');
    const file = File.fromURL(`https://mega.nz/file/${megaIdWithKey}`);
    const data = await file.downloadBuffer();
    return data;
  } catch (err) {
    throw new Error(`Failed to download from Mega: ${err.message}`);
  }
}
// -------------------------------------------------------------------------------

// Main connection function
async function startBot() {
  const sessionFolder = `./${config.sessionName}`;
  const sessionFile = path.join(sessionFolder, 'creds.json');

  // Use SESSION_ID from settings.js
  const SESSION_ID = config.sessionID || null;
  
  if (SESSION_ID && SESSION_ID.startsWith('cyntron-x~')) {
    const rest = SESSION_ID.slice('cyntron-x~'.length);
    
    // Check if this is the new Mega format (contains '#')
    if (rest.includes('#')) {
      try {
        console.log('📡 [CYNTRON-X] Session : Mega format detected, downloading creds.json...');
        const credsData = await downloadFromMega(rest);
        
        if (!fs.existsSync(sessionFolder)) {
          fs.mkdirSync(sessionFolder, { recursive: true });
        }
        // credsData is a Buffer; write directly
        fs.writeFileSync(sessionFile, credsData);
        console.log('📡 [CYNTRON-X] Session : ✅ Credentials restored from Mega session');
      } catch (e) {
        console.error('📡 [CYNTRON-X] Session : ❌ Error restoring Mega session:', e.message);
      }
    } else {
      // Old base64 compressed format
      try {
        const compressedData = Buffer.from(rest, 'base64');
        const decompressedData = zlib.gunzipSync(compressedData);
        if (!fs.existsSync(sessionFolder)) {
          fs.mkdirSync(sessionFolder, { recursive: true });
        }
        fs.writeFileSync(sessionFile, decompressedData, 'utf8');
        console.log('📡 [CYNTRON-X] Session : 🔑 Retrieved from CYNTRON-X Session (base64)');
      } catch (e) {
        console.error('📡 [CYNTRON-X] Session : ❌ Error processing CYNTRON-X session:', e.message);
      }
    }
  } else if (SESSION_ID) {
    console.log('📡 [CYNTRON-X] Session : Using session ID from settings.js');
  } else {
    console.log('📡 [CYNTRON-X] Session : No session ID provided, will generate QR code');
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const suppressedLogger = createSuppressedLogger('silent');

  const sock = makeWASocket({
    version,
    logger: suppressedLogger,
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined
  });

  store.bind(sock.ev);

  const fakeTypingManager = new FakeTypingManager(sock);
  sock.fakeTyping = fakeTypingManager;
  
  sock.autoConfig = {
    isTypingEnabled: isAutoTypingEnabled,
    setTypingEnabled: setAutoTypingEnabled,
    isRecordEnabled: isAutoRecordEnabled,
    setRecordEnabled: setAutoRecordEnabled
  };

  let lastActivity = Date.now();
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

  sock.ev.on('messages.upsert', () => {
    lastActivity = Date.now();
  });

  const watchdogInterval = setInterval(async () => {
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT && sock.ws.readyState === 1) {
      console.log('⚠️ [CYNTRON-X] No activity detected. Forcing reconnect...');
      await sock.end(undefined, undefined, { reason: 'inactive' });
      clearInterval(watchdogInterval);
      setTimeout(() => startBot(), 5000);
    }
  }, 5 * 60 * 1000);

  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'open') {
      lastActivity = Date.now();
    } else if (connection === 'close') {
      clearInterval(watchdogInterval);
      fakeTypingManager.stopAllTyping();
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n\n📱 [CYNTRON-X] Scan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || 'Unknown error';

      if (statusCode === 515 || statusCode === 503 || statusCode === 408) {
        console.log(`⚠️ [CYNTRON-X] Connection closed (${statusCode}). Reconnecting...`);
      } else {
        console.log('[CYNTRON-X] Connection closed due to:', errorMessage, '\nReconnecting:', shouldReconnect);
      }

      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000);
      }
    } else if (connection === 'open') {
      const botNumber = sock.user.id.split(':')[0];
      const prefix = config.prefix === '' ? 'none' : config.prefix;
      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(', ') : config.ownerName;
      
      displayStylishConnectionLogs(botNumber, config.botName, prefix, ownerNames);

      if (config.autoBio) {
        await sock.updateProfileStatus(`${config.botName} | Active 24/7`);
      }

      handler.initializeAntiCall(sock);

      const now = Date.now();
      for (const [jid, chatMsgs] of store.messages.entries()) {
        const timestamps = Array.from(chatMsgs.values()).map(m => m.messageTimestamp * 1000 || 0);
        if (timestamps.length > 0 && now - Math.max(...timestamps) > 24 * 60 * 60 * 1000) {
          store.messages.delete(jid);
        }
      }
      console.log(`🧹 [CYNTRON-X] Store cleaned. Active chats: ${store.messages.size}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  const isSystemJid = (jid) => {
    if (!jid) return true;
    return jid.includes('@broadcast') ||
      jid.includes('status.broadcast') ||
      jid.includes('@newsletter') ||
      jid.includes('@newsletter.');
  };

  // =============== MESSAGES UPSERT HANDLER WITH CHANNEL SUPPORT ===============
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || !msg.key?.id) continue;

      const from = msg.key.remoteJid;
      if (!from) continue;

      // Check if it's a channel/newsletter message
      const isChannel = isChannelMessage(from);

      // ----- STATUS AUTO-REACT & AUTO-VIEW -----
      if (from === 'status@broadcast') {
        const senderJid = msg.key.participant || (msg.key.fromMe ? sock.user.id : from);
        if (senderJid && senderJid !== sock.user.id) {
          if (isStatusReactEnabled()) {
            const emojis = config.autoReactEmojis || ['🚘', '🔥', '💪', '🏎️', '✅'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            try {
              await sock.sendMessage(senderJid, {
                react: { text: randomEmoji, key: msg.key }
              });
              console.log(`✅ [CYNTRON-X] Auto-reacted ${randomEmoji} to status from ${senderJid.split('@')[0]}`);
            } catch (err) {}
          }
          if (config.autoViewStatus) {
            try {
              await sock.readMessages([msg.key]);
              console.log(`👁️ [CYNTRON-X] Auto-viewed status from ${senderJid.split('@')[0]}`);
            } catch (err) {}
          }
        }
        continue;
      }

      if (isSystemJid(from) && !isChannel) continue;

      const msgId = msg.key.id;
      if (processedMessages.has(msgId)) continue;

      let messageAge = 0;
      if (msg.messageTimestamp) {
        messageAge = Date.now() - (msg.messageTimestamp * 1000);
        if (messageAge > 5 * 60 * 1000) continue;
      }

      processedMessages.add(msgId);

      if (msg.key && msg.key.id) {
        if (!store.messages.has(from)) {
          store.messages.set(from, new Map());
        }
        const chatMsgs = store.messages.get(from);
        chatMsgs.set(msg.key.id, msg);

        if (chatMsgs.size > store.maxPerChat) {
          const sortedIds = Array.from(chatMsgs.entries())
            .sort((a, b) => (a[1].messageTimestamp || 0) - (b[1].messageTimestamp || 0))
            .map(([id]) => id);
          for (let i = 0; i < sortedIds.length - store.maxPerChat; i++) {
            chatMsgs.delete(sortedIds[i]);
          }
        }
      }

      // =============== CHANNEL/NEWSLETTER COMMAND HANDLER ===============
      if (isChannel) {
        // Get message text
        let messageText = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || 
                         msg.message?.imageMessage?.caption ||
                         msg.message?.videoMessage?.caption || '';
        
        console.log(`📢 [CYNTRON-X] Channel message from ${from}: ${messageText}`);
        
        // Check if it's a command
        if (messageText && messageText.startsWith(config.prefix)) {
          const args = messageText.slice(config.prefix.length).trim().split(/\s+/);
          const commandName = args.shift().toLowerCase();
          
          // Load commands
          const commands = loadCommands();
          const command = commands.get(commandName);
          
          if (command) {
            // Skip owner-only and group-only commands in channels
            if (command.ownerOnly) {
              await sock.sendMessage(from, { text: '❌ Owner only commands are not available in channels.' });
              continue;
            }
            
            if (command.groupOnly) {
              await sock.sendMessage(from, { text: '❌ Group only commands are not available in channels.' });
              continue;
            }
            
            console.log(`🎯 [CYNTRON-X] Executing ${commandName} in channel`);
            
            // Execute command for channel
            try {
              await command.execute(sock, msg, args, {
                from: from,
                sender: msg.key.participant || from,
                isGroup: false,
                isChannel: true,
                groupMetadata: null,
                isOwner: false,
                isAdmin: false,
                isBotAdmin: false,
                isMod: false,
                reply: (text) => sock.sendMessage(from, { text }),
                react: () => {}
              });
              console.log(`✅ [CYNTRON-X] Executed ${commandName} in channel successfully`);
            } catch (err) {
              console.error('[CYNTRON-X] Channel command error:', err);
              await sock.sendMessage(from, { text: `❌ Error: ${err.message}` });
            }
          } else {
            // Command not found
            await sock.sendMessage(from, { text: `❌ Unknown command: ${commandName}\n\nUse ${config.prefix}help for available commands.` });
          }
        }
        continue; // Skip normal processing for channels
      }
      // =============== END CHANNEL HANDLER ===============

      // =============== AUTO TYPING ON ALL MESSAGES ===============
      fakeTypingManager.startFakeTyping(from);
      // ===========================================================

      // =============== CHATBOT PROCESSING ===============
      let messageText = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption ||
                       msg.message?.videoMessage?.caption || '';
      
      if (messageText && !messageText.startsWith(config.prefix)) {
        try {
          const isGroup = from.endsWith('@g.us');
          let senderName = msg.pushName || 'User';
          let groupName = '';
          
          if (isGroup) {
            try {
              const groupMeta = await sock.groupMetadata(from);
              groupName = groupMeta.subject;
              if (msg.key.participant) {
                const participant = groupMeta.participants.find(p => p.id === msg.key.participant);
                if (participant && participant.notify) senderName = participant.notify;
              }
            } catch(e) {}
          }
          
          const chatbot = require('./commands/owner/chatbot');
          await chatbot.processMessage(sock, msg, messageText, isGroup, groupName, senderName, {
            from: from,
            reply: (text) => sock.sendMessage(from, { text: text }, { quoted: msg })
          });
        } catch (chatbotErr) {
          console.error('[CYNTRON-X] Chatbot error:', chatbotErr.message);
        }
      }
      // ===================================================

      handler.handleMessage(sock, msg).catch(err => {
        if (!err.message?.includes('rate-overlimit') &&
          !err.message?.includes('not-authorized')) {
          console.error('[CYNTRON-X] Error handling message:', err.message);
        }
      });

      setImmediate(async () => {
        if (config.autoRead && from.endsWith('@g.us')) {
          try {
            await sock.readMessages([msg.key]);
          } catch (e) {}
        }
        if (from.endsWith('@g.us')) {
          try {
            const groupMetadata = await handler.getGroupMetadata(sock, msg.key.remoteJid);
            if (groupMetadata) {
              await handler.handleAntilink(sock, msg, groupMetadata);
            }
          } catch (error) {}
        }
      });
    }
  });

  // =============== ANTI-DELETE ===============
  sock.ev.on('messages.delete', async (deletedMessages) => {
    await AntiDelete(sock, deletedMessages);
  });

  sock.ev.on('message-receipt.update', () => {});
  sock.ev.on('messages.update', () => {});
  sock.ev.on('group-participants.update', async (update) => {
    await handler.handleGroupUpdate(sock, update);
  });

  sock.ev.on('error', (error) => {
    const statusCode = error?.output?.statusCode;
    if (statusCode === 515 || statusCode === 503 || statusCode === 408) {
      return;
    }
    console.error('[CYNTRON-X] Socket error:', error.message || error);
  });

  return sock;
}

// Start the bot
console.log('\n╭──⌈ 🚀 STARTING CYNTRON-X ⌋');
console.log('┃');
console.log(`┃ 📦 Bot Name: ${config.botName}`);
console.log(`┃ ⚡ Prefix: ${config.prefix}`);
const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(', ') : config.ownerName;
console.log(`┃ 👑 Owner: ${ownerNames}`);
console.log('┃');
console.log('╰────────────────\n');

cleanupPuppeteerCache();

startBot().catch(err => {
  console.error('[CYNTRON-X] Error starting bot:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    console.error('⚠️ [CYNTRON-X] ENOSPC Error: No space left on device. Attempting cleanup...');
    const { cleanupOldFiles } = require('./utils/cleanup');
    cleanupOldFiles();
    console.warn('⚠️ [CYNTRON-X] Cleanup completed. Bot will continue but may experience issues until space is freed.');
    return;
  }
  console.error('[CYNTRON-X] Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    console.warn('⚠️ [CYNTRON-X] ENOSPC Error in promise: No space left on device. Attempting cleanup...');
    const { cleanupOldFiles } = require('./utils/cleanup');
    cleanupOldFiles();
    console.warn('⚠️ [CYNTRON-X] Cleanup completed. Bot will continue but may experience issues until space is freed.');
    return;
  }

  if (err.message && err.message.includes('rate-overlimit')) {
    console.warn('⚠️ [CYNTRON-X] Rate limit reached. Please slow down your requests.');
    return;
  }
  console.error('[CYNTRON-X] Unhandled Rejection:', err);
});

module.exports = { store };
