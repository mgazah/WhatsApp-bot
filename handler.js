/**
 * Message Handler - Processes incoming messages and executes commands
 */

const config = require('./config');
const database = require('./database');
const { loadCommands } = require('./utils/commandLoader');
const { addMessage } = require('./utils/groupstats');
const { jidDecode, jidEncode, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// =============== SIMPLE ANTI-DELETE ===============
const ANTI_DELETE_FILE = path.join(process.cwd(), 'data', 'antidelete_store.json');
const MEDIA_STORE_DIR = path.join(process.cwd(), 'data', 'MediaStore');
const { isAntiDeleteEnabled } = require('./utils/antideleteConfig');
let messageStore = {};

// Ensure directories exist
function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(MEDIA_STORE_DIR)) {
        fs.mkdirSync(MEDIA_STORE_DIR, { recursive: true });
    }
}

// Download media file
async function downloadMedia(msg, messageId, mediaType) {
    try {
        let mediaNode = null;
        let extension = '';
        
        if (mediaType === 'image') {
            mediaNode = msg.message?.imageMessage;
            extension = '.jpg';
        } else if (mediaType === 'video') {
            mediaNode = msg.message?.videoMessage;
            extension = '.mp4';
        } else if (mediaType === 'audio') {
            mediaNode = msg.message?.audioMessage;
            extension = '.mp3';
        } else if (mediaType === 'sticker') {
            mediaNode = msg.message?.stickerMessage;
            extension = '.webp';
        } else if (mediaType === 'document') {
            mediaNode = msg.message?.documentMessage;
            const fileName = mediaNode.fileName || 'document';
            const ext = path.extname(fileName);
            extension = ext || '.bin';
        }
        
        if (!mediaNode) return null;
        
        const stream = await downloadContentFromMessage(mediaNode, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const filePath = path.join(MEDIA_STORE_DIR, `${messageId}${extension}`);
        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch (error) {
        return null;
    }
}

// Load stored messages from file
function loadMessageStore() {
    try {
        ensureDataDir();
        
        if (fs.existsSync(ANTI_DELETE_FILE)) {
            const data = fs.readFileSync(ANTI_DELETE_FILE, 'utf8');
            messageStore = JSON.parse(data);
            
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            let cleaned = 0;
            Object.keys(messageStore).forEach(key => {
                if (messageStore[key].timestamp < oneDayAgo) {
                    if (messageStore[key].mediaPath && fs.existsSync(messageStore[key].mediaPath)) {
                        try {
                            fs.unlinkSync(messageStore[key].mediaPath);
                        } catch (e) {}
                    }
                    delete messageStore[key];
                    cleaned++;
                }
            });
            if (cleaned > 0) {
                saveMessageStore();
            }
        } else {
            saveMessageStore();
        }
    } catch (error) {
        messageStore = {};
    }
}

// Save messages to file
function saveMessageStore() {
    try {
        ensureDataDir();
        fs.writeFileSync(ANTI_DELETE_FILE, JSON.stringify(messageStore, null, 2));
    } catch (error) {}
}

// Auto-cleanup every hour
setInterval(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let cleaned = 0;
    Object.keys(messageStore).forEach(key => {
        if (messageStore[key].timestamp < oneDayAgo) {
            if (messageStore[key].mediaPath && fs.existsSync(messageStore[key].mediaPath)) {
                try {
                    fs.unlinkSync(messageStore[key].mediaPath);
                } catch (e) {}
            }
            delete messageStore[key];
            cleaned++;
        }
    });
    if (cleaned > 0) {
        saveMessageStore();
    }
}, 60 * 60 * 1000);

// Store a message
async function storeMessage(messageId, messageData, originalMsg) {
    try {
        let mediaPath = null;
        
        if (messageData.type !== 'text' && originalMsg) {
            mediaPath = await downloadMedia(originalMsg, messageId, messageData.type);
        }
        
        messageStore[messageId] = {
            ...messageData,
            mediaPath: mediaPath,
            timestamp: Date.now()
        };
        saveMessageStore();
    } catch (error) {}
}

// Get and delete a message
function getAndDeleteMessage(messageId) {
    try {
        const message = messageStore[messageId];
        if (message) {
            delete messageStore[messageId];
            saveMessageStore();
            return message;
        }
    } catch (error) {}
    return null;
}

// Helper to extract message content
async function extractMessageContent(message, sock) {
    try {
        if (!message.message) return null;
        
        let content = '';
        let type = 'text';
        
        if (message.message.conversation) {
            content = message.message.conversation;
            type = 'text';
        } else if (message.message.extendedTextMessage) {
            content = message.message.extendedTextMessage.text || '';
            type = 'text';
        } else if (message.message.imageMessage) {
            content = message.message.imageMessage.caption || '[Image]';
            type = 'image';
        } else if (message.message.videoMessage) {
            content = message.message.videoMessage.caption || '[Video]';
            type = 'video';
        } else if (message.message.audioMessage) {
            content = '[Audio]';
            type = 'audio';
        } else if (message.message.stickerMessage) {
            content = '[Sticker]';
            type = 'sticker';
        } else if (message.message.documentMessage) {
            content = message.message.documentMessage.caption || `[Document: ${message.message.documentMessage.fileName || 'file'}]`;
            type = 'document';
        } else {
            content = '[Unsupported Message]';
            type = 'unknown';
        }
        
        return { content, type };
    } catch (error) {
        return null;
    }
}

// Get chat display name
async function getChatDisplayName(sock, chatId) {
    try {
        if (chatId && chatId.endsWith('@g.us')) {
            const metadata = await sock.groupMetadata(chatId);
            return metadata.subject || 'Unknown Group';
        }
        return 'Private Chat';
    } catch (error) {
        return 'Unknown Chat';
    }
}

loadMessageStore();
// =============== END ANTI-DELETE ===============

// Group metadata cache
const groupMetadataCache = new Map();
const CACHE_TTL = 60000;

// Load all commands
const commands = loadCommands();

// Unwrap WhatsApp containers
const getMessageContent = (msg) => {
  if (!msg || !msg.message) return null;
  
  let m = msg.message;
  
  if (m.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  
  return m;
};

// Check if message is from channel/newsletter
const isChannelMessage = (jid) => {
  if (!jid) return false;
  return jid.includes('@newsletter') || jid.includes('@broadcast');
};

// Get channel ID
const getChannelId = (jid) => {
  if (!jid) return null;
  if (jid.includes('@newsletter')) {
    return jid.split('@')[0];
  }
  return null;
};

// Cached group metadata getter
const getCachedGroupMetadata = async (sock, groupId) => {
  try {
    if (!groupId || !groupId.endsWith('@g.us')) {
      return null;
    }
    
    const cached = groupMetadataCache.get(groupId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    
    const metadata = await sock.groupMetadata(groupId);
    
    groupMetadataCache.set(groupId, {
      data: metadata,
      timestamp: Date.now()
    });
    
    return metadata;
  } catch (error) {
    if (error.message && (
      error.message.includes('forbidden') || 
      error.message.includes('403') ||
      error.statusCode === 403 ||
      error.output?.statusCode === 403 ||
      error.data === 403
    )) {
      groupMetadataCache.set(groupId, {
        data: null,
        timestamp: Date.now()
      });
      return null;
    }
    
    if (error.message && error.message.includes('rate-overlimit')) {
      const cached = groupMetadataCache.get(groupId);
      if (cached) {
        return cached.data;
      }
      return null;
    }
    
    const cached = groupMetadataCache.get(groupId);
    if (cached) {
      return cached.data;
    }
    
    return null;
  }
};

// Live group metadata getter
const getLiveGroupMetadata = async (sock, groupId) => {
  try {
    const metadata = await sock.groupMetadata(groupId);
    
    groupMetadataCache.set(groupId, {
      data: metadata,
      timestamp: Date.now()
    });
    
    return metadata;
  } catch (error) {
    const cached = groupMetadataCache.get(groupId);
    if (cached) {
      return cached.data;
    }
    return null;
  }
};

const getGroupMetadata = getCachedGroupMetadata;

// Helper functions
const isOwner = (sender) => {
  if (!sender) return false;
  
  const normalizedSender = normalizeJidWithLid(sender);
  const senderNumber = normalizeJid(normalizedSender);
  
  return config.ownerNumber.some(owner => {
    const normalizedOwner = normalizeJidWithLid(owner.includes('@') ? owner : `${owner}@s.whatsapp.net`);
    const ownerNumber = normalizeJid(normalizedOwner);
    return ownerNumber === senderNumber;
  });
};

const isMod = (sender) => {
  const number = sender.split('@')[0];
  return database.isModerator(number);
};

// LID mapping cache
const lidMappingCache = new Map();

const normalizeJid = (jid) => {
  if (!jid) return null;
  if (typeof jid !== 'string') return null;
  
  if (jid.includes(':')) {
    return jid.split(':')[0];
  }
  if (jid.includes('@')) {
    return jid.split('@')[0];
  }
  return jid;
};

const getLidMappingValue = (user, direction) => {
  if (!user) return null;
  
  const cacheKey = `${direction}:${user}`;
  if (lidMappingCache.has(cacheKey)) {
    return lidMappingCache.get(cacheKey);
  }
  
  const sessionPath = path.join(__dirname, config.sessionName || 'session');
  const suffix = direction === 'pnToLid' ? '.json' : '_reverse.json';
  const filePath = path.join(sessionPath, `lid-mapping-${user}${suffix}`);
  
  if (!fs.existsSync(filePath)) {
    lidMappingCache.set(cacheKey, null);
    return null;
  }
  
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    const value = raw ? JSON.parse(raw) : null;
    lidMappingCache.set(cacheKey, value || null);
    return value || null;
  } catch (error) {
    lidMappingCache.set(cacheKey, null);
    return null;
  }
};

const normalizeJidWithLid = (jid) => {
  if (!jid) return jid;
  
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) {
      return `${jid.split(':')[0].split('@')[0]}@s.whatsapp.net`;
    }
    
    let user = decoded.user;
    let server = decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server;
    
    const mapToPn = () => {
      const pnUser = getLidMappingValue(user, 'lidToPn');
      if (pnUser) {
        user = pnUser;
        server = server === 'hosted.lid' ? 'hosted' : 's.whatsapp.net';
        return true;
      }
      return false;
    };
    
    if (server === 'lid' || server === 'hosted.lid') {
      mapToPn();
    } else if (server === 's.whatsapp.net' || server === 'hosted') {
      mapToPn();
    }
    
    if (server === 'hosted') {
      return jidEncode(user, 'hosted');
    }
    return jidEncode(user, 's.whatsapp.net');
  } catch (error) {
    return jid;
  }
};

const buildComparableIds = (jid) => {
  if (!jid) return [];
  
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) {
      return [normalizeJidWithLid(jid)].filter(Boolean);
    }
    
    const variants = new Set();
    const normalizedServer = decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server;
    
    variants.add(jidEncode(decoded.user, normalizedServer));
    
    const isPnServer = normalizedServer === 's.whatsapp.net' || normalizedServer === 'hosted';
    const isLidServer = normalizedServer === 'lid' || normalizedServer === 'hosted.lid';
    
    if (isPnServer) {
      const lidUser = getLidMappingValue(decoded.user, 'pnToLid');
      if (lidUser) {
        const lidServer = normalizedServer === 'hosted' ? 'hosted.lid' : 'lid';
        variants.add(jidEncode(lidUser, lidServer));
      }
    } else if (isLidServer) {
      const pnUser = getLidMappingValue(decoded.user, 'lidToPn');
      if (pnUser) {
        const pnServer = normalizedServer === 'hosted.lid' ? 'hosted' : 's.whatsapp.net';
        variants.add(jidEncode(pnUser, pnServer));
      }
    }
    
    return Array.from(variants);
  } catch (error) {
    return [jid];
  }
};

const findParticipant = (participants = [], userIds) => {
  const targets = (Array.isArray(userIds) ? userIds : [userIds])
    .filter(Boolean)
    .flatMap(id => buildComparableIds(id));
  
  if (!targets.length) return null;
  
  return participants.find(participant => {
    if (!participant) return false;
    
    const participantIds = [
      participant.id,
      participant.lid,
      participant.userJid
    ]
      .filter(Boolean)
      .flatMap(id => buildComparableIds(id));
    
    return participantIds.some(id => targets.includes(id));
  }) || null;
};

const isAdmin = async (sock, participant, groupId, groupMetadata = null) => {
  if (!participant) return false;
  
  if (!groupId || !groupId.endsWith('@g.us')) {
    return false;
  }
  
  let liveMetadata = groupMetadata;
  if (!liveMetadata || !liveMetadata.participants) {
    if (groupId) {
      liveMetadata = await getLiveGroupMetadata(sock, groupId);
    } else {
      return false;
    }
  }
  
  if (!liveMetadata || !liveMetadata.participants) return false;
  
  const foundParticipant = findParticipant(liveMetadata.participants, participant);
  if (!foundParticipant) return false;
  
  return foundParticipant.admin === 'admin' || foundParticipant.admin === 'superadmin';
};

const isBotAdmin = async (sock, groupId, groupMetadata = null) => {
  if (!sock.user || !groupId) return false;
  
  if (!groupId.endsWith('@g.us')) {
    return false;
  }
  
  try {
    const botId = sock.user.id;
    const botLid = sock.user.lid;
    
    if (!botId) return false;
    
    const botJids = [botId];
    if (botLid) {
      botJids.push(botLid);
    }
    
    const liveMetadata = await getLiveGroupMetadata(sock, groupId);
    
    if (!liveMetadata || !liveMetadata.participants) return false;
    
    const participant = findParticipant(liveMetadata.participants, botJids);
    if (!participant) return false;
    
    return participant.admin === 'admin' || participant.admin === 'superadmin';
  } catch (error) {
    return false;
  }
};

const isUrl = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return urlRegex.test(text);
};

const hasGroupLink = (text) => {
  const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
  return linkRegex.test(text);
};

// System JID filter
const isSystemJid = (jid) => {
  if (!jid) return true;
  return jid.includes('@broadcast') || 
         jid.includes('status.broadcast') || 
         jid.includes('@newsletter') ||
         jid.includes('@newsletter.');
};

// Status update handler
const handleStatusUpdate = async (sock, msg) => {
  try {
    const isStatus = msg.key && msg.key.remoteJid === 'status@broadcast';
    if (!isStatus) return false;
    
    const senderJid = msg.key.participant || msg.key.remoteJid;
    
    if (sock.autoReactEmoji && sock.autoReactEmoji !== 'false') {
      try {
        await sock.sendMessage(senderJid, {
          react: { text: sock.autoReactEmoji, key: msg.key }
        });
      } catch (err) {}
    }

    if (sock.autoViewStatus) {
      try {
        await sock.readMessages([msg.key]);
      } catch (err) {}
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Main message handler
const handleMessage = async (sock, msg) => {
  try {
    const isStatus = await handleStatusUpdate(sock, msg);
    if (isStatus) return;
    
    if (!msg.message) return;
    
    const from = msg.key.remoteJid;
    const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
    
    // Check if message is from channel/newsletter
    const isChannel = isChannelMessage(from);
    
    // =============== STORE MESSAGE FOR ANTI-DELETE ===============
    if (msg.key && msg.key.id && !msg.key.fromMe && !isChannel) {
      const extracted = await extractMessageContent(msg, sock);
      if (extracted) {
        await storeMessage(msg.key.id, {
          content: extracted.content,
          type: extracted.type,
          sender: sender,
          senderName: sender.split('@')[0],
          chatId: from
        }, msg);
      }
    }
    // =============== END STORE MESSAGE ===============
    
    // =============== DETECT DELETED MESSAGES ===============
    let isDeleted = false;
    let originalMessageId = msg.key?.id || null;
    let originalChatId = from || null;

    try {
      if (msg.message?.protocolMessage) {
        const protocolMsg = msg.message.protocolMessage;
        
        if (protocolMsg.key) {
          if (protocolMsg.key.id) {
            isDeleted = true;
            originalMessageId = protocolMsg.key.id;
          }
          if (protocolMsg.key.remoteJid) {
            originalChatId = protocolMsg.key.remoteJid;
          }
        }
      }
      
      if (isDeleted && isAntiDeleteEnabled()) {
        if (originalMessageId) {
          const deletedMessage = getAndDeleteMessage(originalMessageId);
          
          if (deletedMessage) {
            try {
              const { getAntiDeleteRoute } = require('./utils/antideleteConfig');
              const route = getAntiDeleteRoute();
              
              let targetChat;
              let isGroupChat = false;
              
              if (route === 'dm') {
                  targetChat = config.ownerNumber[0] + '@s.whatsapp.net';
              } else {
                  targetChat = originalChatId;
                  isGroupChat = originalChatId?.endsWith('@g.us');
              }
              
              const chatDisplayName = await getChatDisplayName(sock, originalChatId);
              const deletedBy = sender;
              const deletedByName = deletedBy.split('@')[0];
              
              let highlightIndicator = '';
              let locationIndicator = '';
              
              if (route === 'chat') {
                  highlightIndicator = '⚠️ *MESSAGE DELETED IN THIS CHAT* ⚠️\n\n';
                  if (isGroupChat) {
                      locationIndicator = `📍 *Group:* ${chatDisplayName}\n`;
                  } else {
                      locationIndicator = `📍 *Chat:* Private Chat\n`;
                  }
              } else {
                  if (isGroupChat) {
                      locationIndicator = `📍 *Group:* ${chatDisplayName}\n`;
                  } else {
                      locationIndicator = `📍 *Chat:* Private Chat\n`;
                  }
              }
              
              let messageToBot = `${highlightIndicator}${locationIndicator}👤 *Deleted by:* @${deletedByName}\n`;
              messageToBot += `👤 *Original Sender:* @${deletedMessage.senderName || 'Unknown'}\n`;
              messageToBot += `📁 *Type:* ${deletedMessage.type || 'text'}\n`;
              messageToBot += `🕒 *Time:* ${new Date().toLocaleString()}\n\n`;
              messageToBot += `📝 *Deleted Message:*\n${deletedMessage.content || '[No Content]'}\n`;
              messageToBot += `\n✨ POWERED BY ${config.botName.toUpperCase()}`;
              
              await sock.sendMessage(targetChat, { 
                  text: messageToBot, 
                  mentions: [deletedBy, deletedMessage.sender] 
              });
              
              if (deletedMessage.mediaPath && fs.existsSync(deletedMessage.mediaPath)) {
                  const mediaBuffer = fs.readFileSync(deletedMessage.mediaPath);
                  const mediaCaption = `📎 Recovered ${deletedMessage.type} from @${deletedMessage.senderName}`;
                  
                  try {
                      if (deletedMessage.type === 'image') {
                          await sock.sendMessage(targetChat, { image: mediaBuffer, caption: mediaCaption, mentions: [deletedMessage.sender] });
                      } else if (deletedMessage.type === 'video') {
                          await sock.sendMessage(targetChat, { video: mediaBuffer, caption: mediaCaption, mentions: [deletedMessage.sender] });
                      } else if (deletedMessage.type === 'audio') {
                          await sock.sendMessage(targetChat, { audio: mediaBuffer, mimetype: 'audio/mpeg', ptt: false });
                      } else if (deletedMessage.type === 'sticker') {
                          await sock.sendMessage(targetChat, { sticker: mediaBuffer });
                      } else if (deletedMessage.type === 'document') {
                          const fileName = path.basename(deletedMessage.mediaPath);
                          await sock.sendMessage(targetChat, { document: mediaBuffer, fileName: fileName, caption: mediaCaption, mentions: [deletedMessage.sender] });
                      }
                  } catch (mediaError) {}
              }
            } catch (sendError) {}
          }
        }
      }
    } catch (deleteError) {}
    // =============== END DELETED MESSAGE CHECK ===============
    
    // Get message body
    const content = getMessageContent(msg);
    
    let body = '';
    if (content) {
      if (content.conversation) {
        body = content.conversation;
      } else if (content.extendedTextMessage) {
        body = content.extendedTextMessage.text || '';
      } else if (content.imageMessage) {
        body = content.imageMessage.caption || '';
      } else if (content.videoMessage) {
        body = content.videoMessage.caption || '';
      }
    }
    
    body = (body || '').trim();
    
    // =============== CHANNEL/NEWSLETTER COMMAND HANDLING ===============
    // Channels work the same way as groups/private chats for sending messages
    if (isChannel) {
      // Check if message starts with prefix
      if (body.startsWith(config.prefix)) {
        const args = body.slice(config.prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();
        
        const command = commands.get(commandName);
        if (command) {
          // Skip owner-only commands in channels
          if (command.ownerOnly) {
            await sock.sendMessage(from, { 
              text: '❌ This command is not available in channels.' 
            });
            return;
          }
          
          // Skip group-only commands
          if (command.groupOnly) {
            await sock.sendMessage(from, { 
              text: '❌ This command is only available in groups.' 
            });
            return;
          }
          
          // Execute command for channel
          await command.execute(sock, msg, args, {
            from,
            sender,
            isGroup: false,
            isChannel: true,
            groupMetadata: null,
            isOwner: isOwner(sender),
            isAdmin: false,
            isBotAdmin: false,
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }),
            react: (emoji) => {} // No reactions in channels
          });
        }
      }
      return; // Don't process further for channels
    }
    // =============== END CHANNEL HANDLING ===============
    
    // System message filter for non-channels
    if (isSystemJid(from)) {
      return;
    }
    
    // Auto-React System (skip channels)
    try {
      delete require.cache[require.resolve('./config')];
      const config = require('./config');

      if (config.autoReact && msg.message && !msg.key.fromMe) {
        const content = msg.message.ephemeralMessage?.message || msg.message;
        const text = content.conversation || content.extendedTextMessage?.text || '';

        const jid = msg.key.remoteJid;
        const emojis = ['❤️','🔥','👌','💀','😁','✨','👍','🤨','😎','😂','🤝','💫'];
        
        const mode = config.autoReactMode || 'bot';

        if (mode === 'bot') {
          const prefixList = ['.', '/', '#'];
          if (prefixList.includes(text?.trim()[0])) {
            await sock.sendMessage(jid, {
              react: { text: '⏳', key: msg.key }
            });
          }
        }

        if (mode === 'all') {
          const rand = emojis[Math.floor(Math.random() * emojis.length)];
          await sock.sendMessage(jid, {
            react: { text: rand, key: msg.key }
          });
        }
      }
    } catch (e) {}
    
    let actualMessageTypes = [];
    if (content) {
      const allKeys = Object.keys(content);
      const protocolMessages = ['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo'];
      actualMessageTypes = allKeys.filter(key => !protocolMessages.includes(key));
    }
    
    const isGroup = from.endsWith('@g.us');
    
    let groupMetadata = null;
    if (isGroup) {
      groupMetadata = await getGroupMetadata(sock, from);
    }
    
    // Anti-group mention protection
    if (isGroup) {
      try {
        await handleAntigroupmention(sock, msg, groupMetadata);
      } catch (error) {}
    }
    
    // Track group message statistics
    if (isGroup) {
      addMessage(from, sender);
    }
    
    if (!content || actualMessageTypes.length === 0) return;
    
    // Button response handling
    const btn = content.buttonsResponseMessage || msg.message?.buttonsResponseMessage;
    if (btn) {
      const buttonId = btn.selectedButtonId;
      
      if (buttonId === 'btn_menu') {
        const menuCmd = commands.get('menu');
        if (menuCmd) {
          await menuCmd.execute(sock, msg, [], {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
        }
        return;
      } else if (buttonId === 'btn_ping') {
        const pingCmd = commands.get('ping');
        if (pingCmd) {
          await pingCmd.execute(sock, msg, [], {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
        }
        return;
      } else if (buttonId === 'btn_help') {
        const listCmd = commands.get('list');
        if (listCmd) {
          await listCmd.execute(sock, msg, [], {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
        }
        return;
      }
    }
    
    // Check antiall protection
    if (isGroup) {
      const groupSettings = database.getGroupSettings(from);
      if (groupSettings.antiall) {
        const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
        const senderIsOwner = isOwner(sender);
        
        if (!senderIsAdmin && !senderIsOwner) {
          const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
          if (botIsAdmin) {
            await sock.sendMessage(from, { delete: msg.key });
            return;
          }
        }
      }
      
      // Anti-tag protection
      if (groupSettings.antitag && !msg.key.fromMe) {
        const ctx = content.extendedTextMessage?.contextInfo;
        const mentionedJids = ctx?.mentionedJid || [];
        
        const messageText = (
          body ||
          content.imageMessage?.caption ||
          content.videoMessage?.caption ||
          ''
        );
        
        const textMentions = messageText.match(/@[\d+\s\-()~.]+/g) || [];
        const numericMentions = messageText.match(/@\d{10,}/g) || [];
        
        const uniqueNumericMentions = new Set();
        numericMentions.forEach((mention) => {
          const numMatch = mention.match(/@(\d+)/);
          if (numMatch) uniqueNumericMentions.add(numMatch[1]);
        });
        
        const mentionedJidCount = mentionedJids.length;
        const numericMentionCount = uniqueNumericMentions.size;
        const totalMentions = Math.max(mentionedJidCount, numericMentionCount);
        
        if (totalMentions >= 3) {
          try {
            const participants = groupMetadata.participants || [];
            const mentionThreshold = Math.max(3, Math.ceil(participants.length * 0.5));
            const hasManyNumericMentions = numericMentionCount >= 10 ||
              (numericMentionCount >= 5 && numericMentionCount >= mentionThreshold);
            
            if (totalMentions >= mentionThreshold || hasManyNumericMentions) {
              const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
              const senderIsOwner = isOwner(sender);
              
              if (!senderIsAdmin && !senderIsOwner) {
                const action = (groupSettings.antitagAction || 'delete').toLowerCase();
                
                if (action === 'delete') {
                  try {
                    await sock.sendMessage(from, { delete: msg.key });
                    await sock.sendMessage(from, { 
                      text: '⚠️ *Tagall Detected!*',
                      mentions: [sender]
                    }, { quoted: msg });
                  } catch (e) {}
                } else if (action === 'kick') {
                  try {
                    await sock.sendMessage(from, { delete: msg.key });
                  } catch (e) {}
                  
                  const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
                  if (botIsAdmin) {
                    try {
                      await sock.groupParticipantsUpdate(from, [sender], 'remove');
                    } catch (e) {}
                    const usernames = [`@${sender.split('@')[0]}`];
                    await sock.sendMessage(from, {
                      text: `🚫 *Antitag Detected!*\n\n${usernames.join(', ')} has been kicked for tagging all members.`,
                      mentions: [sender],
                    }, { quoted: msg });
                  }
                }
                return;
              }
            }
          } catch (e) {}
        }
      }
    }
    
    // AutoSticker feature
    if (isGroup) {
      const groupSettings = database.getGroupSettings(from);
      if (groupSettings.autosticker) {
        const mediaMessage = content?.imageMessage || content?.videoMessage;
        
        if (mediaMessage) {
          if (!body.startsWith(config.prefix)) {
            try {
              const stickerCmd = commands.get('sticker');
              if (stickerCmd) {
                await stickerCmd.execute(sock, msg, [], {
                  from,
                  sender,
                  isGroup,
                  groupMetadata,
                  isOwner: isOwner(sender),
                  isAdmin: await isAdmin(sock, sender, from, groupMetadata),
                  isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
                  isMod: isMod(sender),
                  reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
                  react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
                });
                return;
              }
            } catch (error) {}
          }
        }
      }
    }

    // Check for active bomb games
    try {
      const bombModule = require('./commands/fun/bomb');
      if (bombModule.gameState && bombModule.gameState.has(sender)) {
        const bombCommand = commands.get('bomb');
        if (bombCommand && bombCommand.execute) {
          await bombCommand.execute(sock, msg, [], {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
          return;
        }
      }
    } catch (e) {}
    
    // Check for active tictactoe games
    try {
      const tictactoeModule = require('./commands/fun/tictactoe');
      if (tictactoeModule.handleTicTacToeMove) {
        const isInGame = Object.values(tictactoeModule.games || {}).some(room => 
          room.id.startsWith('tictactoe') && 
          [room.game.playerX, room.game.playerO].includes(sender) && 
          room.state === 'PLAYING'
        );
        
        if (isInGame) {
          const handled = await tictactoeModule.handleTicTacToeMove(sock, msg, {
            from,
            sender,
            isGroup,
            groupMetadata,
            isOwner: isOwner(sender),
            isAdmin: await isAdmin(sock, sender, from, groupMetadata),
            isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
            isMod: isMod(sender),
            reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
            react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
          });
          if (handled) return;
        }
      }
    } catch (e) {}
    
    // Check if message starts with prefix
    if (!body.startsWith(config.prefix)) return;
    
    // Parse command
    const args = body.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    
    // Get command
    const command = commands.get(commandName);
    if (!command) return;
    
    // Check self mode
    if (config.selfMode && !isOwner(sender)) {
      return;
    }
    
    // Permission checks
    if (command.ownerOnly && !isOwner(sender)) {
      return sock.sendMessage(from, { text: config.messages.ownerOnly }, { quoted: msg });
    }
    
    if (command.modOnly && !isMod(sender) && !isOwner(sender)) {
      return sock.sendMessage(from, { text: '🔒 This command is only for moderators!' }, { quoted: msg });
    }
    
    if (command.groupOnly && !isGroup) {
      return sock.sendMessage(from, { text: config.messages.groupOnly }, { quoted: msg });
    }
    
    if (command.privateOnly && isGroup) {
      return sock.sendMessage(from, { text: config.messages.privateOnly }, { quoted: msg });
    }
    
    if (command.adminOnly && !(await isAdmin(sock, sender, from, groupMetadata)) && !isOwner(sender)) {
      return sock.sendMessage(from, { text: config.messages.adminOnly }, { quoted: msg });
    }
    
    if (command.botAdminNeeded) {
      const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
      if (!botIsAdmin) {
        return sock.sendMessage(from, { text: config.messages.botAdminNeeded }, { quoted: msg });
      }
    }
    
    // Auto-typing
    if (config.autoTyping) {
      await sock.sendPresenceUpdate('composing', from);
    }
    
    // Execute command
    await command.execute(sock, msg, args, {
      from,
      sender,
      isGroup,
      groupMetadata,
      isOwner: isOwner(sender),
      isAdmin: await isAdmin(sock, sender, from, groupMetadata),
      isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
      isMod: isMod(sender),
      reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
      react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
    });
    
  } catch (error) {
    console.error('Error in message handler:', error);
    
    if (error.message && error.message.includes('rate-overlimit')) {
      return;
    }
    
    try {
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `${config.messages.error}\n\n${error.message}` 
      }, { quoted: msg });
    } catch (e) {}
  }
};

// Group participant update handler
const handleGroupUpdate = async (sock, update) => {
  try {
    const { id, participants, action } = update;
    
    if (!id || !id.endsWith('@g.us')) {
      return;
    }
    
    const groupSettings = database.getGroupSettings(id);
    
    if (!groupSettings.welcome && !groupSettings.goodbye) return;
    
    const groupMetadata = await getGroupMetadata(sock, id);
    if (!groupMetadata) return;
    
    const getParticipantJid = (participant) => {
      if (typeof participant === 'string') {
        return participant;
      }
      if (participant && participant.id) {
        return participant.id;
      }
      if (participant && typeof participant === 'object') {
        return participant.jid || participant.participant || null;
      }
      return null;
    };
    
    for (const participant of participants) {
      const participantJid = getParticipantJid(participant);
      if (!participantJid) continue;
      
      const participantNumber = participantJid.split('@')[0];
      
      if (action === 'add' && groupSettings.welcome) {
        try {
          let displayName = participantNumber;
          
          const participantInfo = groupMetadata.participants.find(p => {
            const pId = p.id || p.jid || p.participant;
            const pPhone = p.phoneNumber;
            return pId === participantJid || 
                   pId?.split('@')[0] === participantNumber ||
                   pPhone === participantJid ||
                   pPhone?.split('@')[0] === participantNumber;
          });
          
          let phoneJid = null;
          if (participantInfo && participantInfo.phoneNumber) {
            phoneJid = participantInfo.phoneNumber;
          } else {
            try {
              const normalized = normalizeJidWithLid(participantJid);
              if (normalized && normalized.includes('@s.whatsapp.net')) {
                phoneJid = normalized;
              }
            } catch (e) {
              if (participantJid.includes('@s.whatsapp.net')) {
                phoneJid = participantJid;
              }
            }
          }
          
          if (phoneJid) {
            try {
              if (sock.store && sock.store.contacts && sock.store.contacts[phoneJid]) {
                const contact = sock.store.contacts[phoneJid];
                if (contact.notify && contact.notify.trim() && !contact.notify.match(/^\d+$/)) {
                  displayName = contact.notify.trim();
                } else if (contact.name && contact.name.trim() && !contact.name.match(/^\d+$/)) {
                  displayName = contact.name.trim();
                }
              }
              
              if (displayName === participantNumber) {
                try {
                  await sock.onWhatsApp(phoneJid);
                  
                  if (sock.store && sock.store.contacts && sock.store.contacts[phoneJid]) {
                    const contact = sock.store.contacts[phoneJid];
                    if (contact.notify && contact.notify.trim() && !contact.notify.match(/^\d+$/)) {
                      displayName = contact.notify.trim();
                    }
                  }
                } catch (fetchError) {}
              }
            } catch (contactError) {}
          }
          
          if (displayName === participantNumber && participantInfo) {
            if (participantInfo.notify && participantInfo.notify.trim() && !participantInfo.notify.match(/^\d+$/)) {
              displayName = participantInfo.notify.trim();
            } else if (participantInfo.name && participantInfo.name.trim() && !participantInfo.name.match(/^\d+$/)) {
              displayName = participantInfo.name.trim();
            }
          }
          
          let profilePicUrl = '';
          try {
            profilePicUrl = await sock.profilePictureUrl(participantJid, 'image');
          } catch (ppError) {
            profilePicUrl = 'https://img.pyrocdn.com/dbKUgahg.png';
          }
          
          const groupName = groupMetadata.subject || 'the group';
          const groupDesc = groupMetadata.desc || 'No description';
          
          const now = new Date();
          const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          
          const welcomeMsg = `╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @${displayName} 👋\n┃Member count: #${groupMetadata.participants.length}\n┃𝚃𝙸𝙼𝙴: ${timeString}⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@${displayName}* Welcome to *${groupName}*! 🎉\n*Group 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\n${groupDesc}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;
          
          const apiUrl = `https://api.some-random-api.com/welcome/img/7/gaming4?type=join&textcolor=white&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;
          
          const imageResponse = await axios.get(apiUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(imageResponse.data);
          
          await sock.sendMessage(id, { 
            image: imageBuffer,
            caption: welcomeMsg,
            mentions: [participantJid] 
          });
        } catch (welcomeError) {
          let message = groupSettings.welcomeMessage || 'Welcome @user to @group! 👋\nEnjoy your stay!';
          message = message.replace('@user', `@${participantNumber}`);
          message = message.replace('@group', groupMetadata.subject || 'the group');
          
          await sock.sendMessage(id, { 
            text: message, 
            mentions: [participantJid] 
          });
        }
      } else if (action === 'remove' && groupSettings.goodbye) {
        try {
          let displayName = participantNumber;
          
          const participantInfo = groupMetadata.participants.find(p => {
            const pId = p.id || p.jid || p.participant;
            const pPhone = p.phoneNumber;
            return pId === participantJid || 
                   pId?.split('@')[0] === participantNumber ||
                   pPhone === participantJid ||
                   pPhone?.split('@')[0] === participantNumber;
          });
          
          let phoneJid = null;
          if (participantInfo && participantInfo.phoneNumber) {
            phoneJid = participantInfo.phoneNumber;
          } else {
            try {
              const normalized = normalizeJidWithLid(participantJid);
              if (normalized && normalized.includes('@s.whatsapp.net')) {
                phoneJid = normalized;
              }
            } catch (e) {
              if (participantJid.includes('@s.whatsapp.net')) {
                phoneJid = participantJid;
              }
            }
          }
          
          if (phoneJid) {
            try {
              if (sock.store && sock.store.contacts && sock.store.contacts[phoneJid]) {
                const contact = sock.store.contacts[phoneJid];
                if (contact.notify && contact.notify.trim() && !contact.notify.match(/^\d+$/)) {
                  displayName = contact.notify.trim();
                } else if (contact.name && contact.name.trim() && !contact.name.match(/^\d+$/)) {
                  displayName = contact.name.trim();
                }
              }
              
              if (displayName === participantNumber) {
                try {
                  await sock.onWhatsApp(phoneJid);
                  
                  if (sock.store && sock.store.contacts && sock.store.contacts[phoneJid]) {
                    const contact = sock.store.contacts[phoneJid];
                    if (contact.notify && contact.notify.trim() && !contact.notify.match(/^\d+$/)) {
                      displayName = contact.notify.trim();
                    }
                  }
                } catch (fetchError) {}
              }
            } catch (contactError) {}
          }
          
          if (displayName === participantNumber && participantInfo) {
            if (participantInfo.notify && participantInfo.notify.trim() && !participantInfo.notify.match(/^\d+$/)) {
              displayName = participantInfo.notify.trim();
            } else if (participantInfo.name && participantInfo.name.trim() && !participantInfo.name.match(/^\d+$/)) {
              displayName = participantInfo.name.trim();
            }
          }
          
          let profilePicUrl = '';
          try {
            profilePicUrl = await sock.profilePictureUrl(participantJid, 'image');
          } catch (ppError) {
            profilePicUrl = 'https://img.pyrocdn.com/dbKUgahg.png';
          }
          
          const groupName = groupMetadata.subject || 'the group';
          
          const goodbyeMsg = `Goodbye @${displayName} 👋 We will never miss you!`;
          
          const apiUrl = `https://api.some-random-api.com/welcome/img/7/gaming4?type=leave&textcolor=white&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;
          
          const imageResponse = await axios.get(apiUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(imageResponse.data);
          
          await sock.sendMessage(id, { 
            image: imageBuffer,
            caption: goodbyeMsg,
            mentions: [participantJid] 
          });
        } catch (goodbyeError) {
          const goodbyeMsg = `Goodbye @${participantNumber} 👋 We will never miss you! 💀`;
          
          await sock.sendMessage(id, { 
            text: goodbyeMsg, 
            mentions: [participantJid] 
          });
        }
      }
    }
  } catch (error) {
    if (error.message && (
      error.message.includes('forbidden') || 
      error.message.includes('403') ||
      error.statusCode === 403 ||
      error.output?.statusCode === 403 ||
      error.data === 403
    )) {
      return;
    }
    if (!error.message || !error.message.includes('forbidden')) {
      console.error('Error handling group update:', error);
    }
  }
};

// Antilink handler
const handleAntilink = async (sock, msg, groupMetadata) => {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    const groupSettings = database.getGroupSettings(from);
    if (!groupSettings.antilink) return;
    
    const body = msg.message?.conversation || 
                  msg.message?.extendedTextMessage?.text || 
                  msg.message?.imageMessage?.caption || 
                  msg.message?.videoMessage?.caption || '';
    
    const linkPattern = /(https?:\/\/)?([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(\/[^\s]*)?/i;
    
    if (linkPattern.test(body)) {
      const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
      const senderIsOwner = isOwner(sender);
      
      if (senderIsAdmin || senderIsOwner) return;
      
      const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
      const action = (groupSettings.antilinkAction || 'delete').toLowerCase();
      
      if (action === 'kick' && botIsAdmin) {
        try {
          await sock.sendMessage(from, { delete: msg.key });
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          await sock.sendMessage(from, { 
            text: `🔗 Anti-link triggered. Link removed.`,
            mentions: [sender]
          }, { quoted: msg });
        } catch (e) {}
      } else {
        try {
          await sock.sendMessage(from, { delete: msg.key });
          await sock.sendMessage(from, { 
            text: `🔗 Anti-link triggered. Link removed.`,
            mentions: [sender]
          }, { quoted: msg });
        } catch (e) {}
      }
    }
  } catch (error) {}
};

// Anti-group mention handler
const handleAntigroupmention = async (sock, msg, groupMetadata) => {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    const groupSettings = database.getGroupSettings(from);
    if (!groupSettings.antigroupmention) return;
    
    let isForwardedStatus = false;
    
    if (msg.message) {
      isForwardedStatus = isForwardedStatus || !!msg.message.groupStatusMentionMessage;
      isForwardedStatus = isForwardedStatus || 
        (msg.message.protocolMessage && msg.message.protocolMessage.type === 25);
      
      isForwardedStatus = isForwardedStatus || 
        (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo && 
         msg.message.extendedTextMessage.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || 
        (msg.message.conversation && msg.message.contextInfo && 
         msg.message.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || 
        (msg.message.imageMessage && msg.message.imageMessage.contextInfo && 
         msg.message.imageMessage.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || 
        (msg.message.videoMessage && msg.message.videoMessage.contextInfo && 
         msg.message.videoMessage.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || 
        (msg.message.contextInfo && msg.message.contextInfo.forwardedNewsletterMessageInfo);
      
      if (msg.message.contextInfo) {
        const ctx = msg.message.contextInfo;
        isForwardedStatus = isForwardedStatus || !!ctx.isForwarded;
        isForwardedStatus = isForwardedStatus || !!ctx.forwardingScore;
        isForwardedStatus = isForwardedStatus || !!ctx.quotedMessageTimestamp;
      }
      
      if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) {
        const extCtx = msg.message.extendedTextMessage.contextInfo;
        isForwardedStatus = isForwardedStatus || !!extCtx.isForwarded;
        isForwardedStatus = isForwardedStatus || !!extCtx.forwardingScore;
      }
    }
    
    if (isForwardedStatus) {
      const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
      const senderIsOwner = isOwner(sender);
      
      if (senderIsAdmin || senderIsOwner) return;
      
      const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
      const action = (groupSettings.antigroupmentionAction || 'delete').toLowerCase();
      
      if (action === 'kick' && botIsAdmin) {
        try {
          await sock.sendMessage(from, { delete: msg.key });
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
        } catch (e) {}
      } else {
        try {
          await sock.sendMessage(from, { delete: msg.key });
        } catch (e) {}
      }
    }
  } catch (error) {}
};

// Anti-call feature initializer
const initializeAntiCall = (sock) => {
  sock.ev.on('call', async (calls) => {
    try {
      delete require.cache[require.resolve('./config')];
      const config = require('./config');
      
      if (!config.defaultGroupSettings.anticall) return;

      for (const call of calls) {
        if (call.status === 'offer') {
          await sock.rejectCall(call.id, call.from);
          await sock.updateBlockStatus(call.from, 'block');
          await sock.sendMessage(call.from, {
            text: '🚫 Calls are not allowed. You have been blocked.'
          });
        }
      }
    } catch (err) {}
  });
};

// Export all functions
module.exports = {
  handleMessage,
  handleStatusUpdate,
  handleGroupUpdate,
  handleAntilink,
  handleAntigroupmention,
  initializeAntiCall,
  isOwner,
  isAdmin,
  isBotAdmin,
  isMod,
  getGroupMetadata,
  findParticipant,
  isChannelMessage,
  getChannelId
};