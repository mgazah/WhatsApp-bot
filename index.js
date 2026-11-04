require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const P = require('pino');
const config = require('./config');
const {
  handleMessage,
  handleGroupUpdate,
  initializeAntiCall
} = require('./handler');

const logger = P({
  level: process.env.BAILEYS_LOG_LEVEL || 'warn',
  transport: {
    target: require.resolve('pino-pretty'),
    options: {
      colorize: false,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});
let starting = false;
let reconnectTimer;
const FALLBACK_BAILEYS_VERSION = [2, 3000, 1043857760];

function panelLog(section, message) {
  console.log(`[${section.padEnd(7)}] ${message}`);
}

async function getBaileysVersion() {
  const configured = (process.env.BAILEYS_VERSION || '').trim();
  if (configured) {
    const version = configured.split('.').map(Number);
    if (version.length === 3 && version.every(Number.isInteger)) return version;
  }

  try {
    const result = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('version lookup timeout')), 4000))
    ]);
    return result.version;
  } catch (error) {
    panelLog('START', `Version lookup skipped (${error.message}); using cached Baileys version.`);
    return FALLBACK_BAILEYS_VERSION;
  }
}

function normalizeCredentialBuffers(value) {
  if (Array.isArray(value)) return value.map(normalizeCredentialBuffers);
  if (!value || typeof value !== 'object') return value;
  if (value.type === 'Buffer' && Array.isArray(value.data)) {
    return {
      type: 'Buffer',
      data: Buffer.from(value.data).toString('base64')
    };
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeCredentialBuffers(item)]));
}

function hydrateAuthFromEnv() {
  const rawSession = (process.env.SESSION_ID || '').trim();
  const credsPath = path.join(process.cwd(), 'auth', 'creds.json');
  if (!rawSession || fs.existsSync(credsPath)) return false;

  const separator = rawSession.indexOf('~');
  if (separator < 1) throw new Error('SESSION_ID must use the PREFIX:~base64 format');
  const payload = rawSession.slice(separator + 1);
  const credentials = normalizeCredentialBuffers(
    JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
  );
  if (!credentials?.noiseKey || !credentials?.signedIdentityKey) {
    throw new Error('SESSION_ID decoded, but required Baileys credentials are missing');
  }
  fs.mkdirSync(path.dirname(credsPath), { recursive: true });
  fs.writeFileSync(credsPath, JSON.stringify(credentials));
  fs.chmodSync(credsPath, 0o600);
  panelLog('AUTH', `Session loaded from ${config.sessionPrefix || 'configured'} SESSION_ID.`);
  return true;
}

function assertAuthConfigured() {
  const credsPath = path.join(process.cwd(), 'auth', 'creds.json');
  if (fs.existsSync(credsPath)) return;
  if (!(process.env.SESSION_ID || '').trim()) {
    throw new Error('No WhatsApp auth configured.');
  }
}

function clearLocalAuth() {
  const authPath = path.join(process.cwd(), 'auth');
  try {
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
    panelLog('AUTH', 'Cleared invalid local WhatsApp authentication state.');
  } catch (error) {
    panelLog('ERROR', `Could not clear invalid WhatsApp auth: ${error?.message || error}`);
  }
}

function askConsole(question) {
  if (!process.stdin.isTTY) {
    throw new Error('No WhatsApp auth found and the hosting console is not interactive. Set SESSION_ID in Pterodactyl or restore auth/.');
  }
  if (!global.consolePrompt) {
    global.consolePrompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return new Promise(resolve => global.consolePrompt.question(question, answer => resolve(answer.trim())));
}

async function configureAuthFromConsole() {
  const credsPath = path.join(process.cwd(), 'auth', 'creds.json');
  if ((process.env.SESSION_ID || '').trim() || fs.existsSync(credsPath)) return { pairingPhone: null };

  console.log('\n┌──────────────────────────────────────────┐');
  console.log('│          CYNTRON-X WHATSAPP SETUP        │');
  console.log('├──────────────────────────────────────────┤');
  console.log('│  1. Request a WhatsApp pairing code      │');
  console.log('│  2. Use a Base64 session ID              │');
  console.log('└──────────────────────────────────────────┘');
  const choice = await askConsole('Choose an option (1/2): ');

  if (choice === '1') {
    let phone = await askConsole('Enter your WhatsApp phone number with country code (digits only): ');
    phone = phone.replace(/\D/g, '');
    if (phone.length < 8) throw new Error('Invalid phone number. Include the country code, for example 2547XXXXXXXX.');
    panelLog('AUTH', 'Pairing code will be requested after the WhatsApp socket starts.');
    return { pairingPhone: phone };
  }

  if (choice === '2') {
    const sessionId = await askConsole('Paste the session ID (PREFIX~BASE64_SESSION): ');
    if (!sessionId || !sessionId.includes('~')) throw new Error('Invalid session ID. Expected PREFIX~BASE64_SESSION.');
    process.env.SESSION_ID = sessionId;
    hydrateAuthFromEnv();
    return { pairingPhone: null };
  }

  throw new Error('Invalid option. Restart the server and choose 1 or 2.');
}

async function followConfiguredChannels(sock) {
  const channels = Array.isArray(config.autofollowChannels) ? config.autofollowChannels : [];
  if (typeof sock.newsletterFollow !== 'function') {
    console.error('Newsletter follow API is unavailable in this Baileys build');
    return;
  }
  for (const jid of channels) {
    try {
      await sock.newsletterFollow(jid);
      panelLog('CHANNEL', `Following ${jid}`);
    } catch (error) {
      panelLog('ERROR', `Could not follow newsletter channel ${jid}: ${error?.message || error}`);
    }
  }
}

async function sendConnectionMessage(sock) {
  const userId = sock.user?.id;
  if (!userId) throw new Error('WhatsApp user ID is not available after connection open');
  const recipient = `${userId.split(':')[0].split('@')[0]}@s.whatsapp.net`;
  const account = userId.split(':')[0].split('@')[0];
  const text = `╭─❖ *${config.botName} ONLINE* ❖─╮\n│\n│ ✅ WhatsApp connected\n│ ✅ Commands are ready\n│ ✅ Session is active\n│\n│ *Account:* ${account}\n│ *Prefix:* ${config.prefix}\n│\n╰────────────────────────╯`;
  await sock.sendMessage(recipient, { text });
  panelLog('WHATSAPP', `Connection message sent to ${recipient}.`);
}

async function startBot() {
  if (starting) return;
  starting = true;
  try {
    panelLog('START', `Starting ${config.botName}...`);
    const { pairingPhone } = await configureAuthFromConsole();
    hydrateAuthFromEnv();
    if (!pairingPhone) assertAuthConfigured();
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const version = await getBaileysVersion();
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('CYNTRON-X'),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false
    });
    if (pairingPhone) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(pairingPhone);
          console.log('\n┌──────────────────────────────────────────┐');
          console.log(`│  WHATSAPP PAIRING CODE: ${code}            │`);
          console.log('│  WhatsApp → Linked devices → Link with    │');
          console.log('│  phone number instead                     │');
          console.log('└──────────────────────────────────────────┘');
        } catch (error) {
          panelLog('ERROR', `Pairing-code request failed: ${error?.message || error}`);
        }
      }, 1500);
    }
    starting = false;
    let connectionMessageSent = false;

    sock.ev.on('creds.update', saveCreds);
    initializeAntiCall(sock);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        panelLog('WHATSAPP', `Connected as ${sock.user?.id || 'unknown account'}.`);
        if (!connectionMessageSent) {
          connectionMessageSent = true;
          sendConnectionMessage(sock).catch(error => {
            connectionMessageSent = false;
            panelLog('ERROR', `Connection message failed: ${error?.message || error}`);
          });
        }
        followConfiguredChannels(sock).catch(error => panelLog('ERROR', `Autofollow failed: ${error?.message || error}`));
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === 401) {
          clearLocalAuth();
          // Do not reuse the rejected environment session on the next start.
          // The interactive setup will ask for a new session or pairing code.
          delete process.env.SESSION_ID;
          panelLog('AUTH', 'WhatsApp rejected this session (401). Restarting setup for fresh credentials.');
        }
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        panelLog('WA-CLOSE', `Connection closed (code ${statusCode || 'unknown'}). Reconnect: ${shouldReconnect}.`);
        if (shouldReconnect && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = undefined;
            startBot().catch(error => panelLog('ERROR', `Reconnect failed: ${error?.message || error}`));
          }, 3000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type && type !== 'notify') return;
      for (const message of messages) {
        if (!message?.message || message.key?.fromMe) continue;
        try {
          await handleMessage(sock, message);
          panelLog('MESSAGE', `Processed ${message.key?.remoteJid || 'unknown'}.`);
        } catch (error) {
          panelLog('ERROR', `Message handler error: ${error.message || error}`);
        }
      }
    });

    sock.ev.on('groups.update', async (updates) => {
      for (const update of updates) {
        try { await handleGroupUpdate(sock, update); } catch (error) { console.error('Group update error:', error.message); }
      }
    });

    sock.ev.on('group-participants.update', async (update) => {
      try { await handleGroupUpdate(sock, update); } catch (error) { console.error('Participant update error:', error.message); }
    });

    return sock;
  } catch (error) {
    starting = false;
    throw error;
  }
}

startBot().catch((error) => {
  panelLog('FATAL', error?.message || error);
  process.exitCode = 1;
});

module.exports = { startBot };
