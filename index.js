require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

const logger = P({ level: process.env.LOG_LEVEL || 'info' });
let starting = false;
let reconnectTimer;

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
  console.log(`Hydrated Baileys auth from ${config.sessionPrefix || 'configured'} SESSION_ID`);
  return true;
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
      console.log(`Autofollowed newsletter channel: ${jid}`);
    } catch (error) {
      console.error(`Could not follow newsletter channel ${jid}:`, error?.message || error);
    }
  }
}

async function sendConnectionMessage(sock) {
  const userId = sock.user?.id;
  if (!userId) throw new Error('WhatsApp user ID is not available after connection open');
  const recipient = `${userId.split(':')[0].split('@')[0]}@s.whatsapp.net`;
  const text = `🟢 *${config.botName} CONNECTED*\n\n✅ WhatsApp session is active.\n✅ Commands are ready.\n\nPrefix: ${config.prefix}\nTime: ${new Date().toISOString()}`;
  await sock.sendMessage(recipient, { text });
  console.log(`Connection message sent to ${recipient}`);
}

async function startBot() {
  if (starting) return;
  starting = true;
  try {
    hydrateAuthFromEnv();
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();
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
    starting = false;
    let connectionMessageSent = false;

    sock.ev.on('creds.update', saveCreds);
    initializeAntiCall(sock);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(`CYNTRON-X connected as ${sock.user?.id || 'unknown account'}`);
        if (!connectionMessageSent) {
          connectionMessageSent = true;
          sendConnectionMessage(sock).catch(error => {
            connectionMessageSent = false;
            console.error('Connection message failed:', error?.message || error);
          });
        }
        followConfiguredChannels(sock).catch(error => console.error('Autofollow failed:', error));
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.error(`WhatsApp connection closed (code ${statusCode || 'unknown'}). Reconnect: ${shouldReconnect}`);
        if (shouldReconnect && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = undefined;
            startBot().catch(error => console.error('Reconnect failed:', error));
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
          console.log(`Processed message ${message.key?.id || 'unknown'} from ${message.key?.remoteJid || 'unknown'}`);
        } catch (error) {
          console.error('Message handler error:', error.message || error);
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
  console.error('Fatal startup error:', error);
  process.exitCode = 1;
});

module.exports = { startBot };
