const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const path = require('path')

// ========== CYNTRON-X CONFIG ==========
const BOT_NAME = "CYNTRON-X"
const OWNER_NAME = "UNSTOPPABLE"
const OWNER_NUMBER = "254116368398" // 0116368398
const PREFIX = "."

// Features ON/OFF - true = ON, false = OFF
const SETTINGS = {
  autoViewStatus: true,
  autoLikeStatus: true,
  autoSaveStatus: false,
  recoverDeleted: true,
  saveViewOnce: true,
  antiCall: true,
  alwaysOnline: true,
  autoRead: true,
  fakeTyping: true,
  fakeRecording: false,
  autoReact: false
}

let deletedMessages = new Map()

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()
  
  const sock = makeWASocket({
    version,
    auth: state,
   
