const fs = require('fs');
const path = require('path');
const config = require('../../config');

const STATUS_REACT_FILE = path.join(process.cwd(), 'data', 'statusReact.json');
const STATUS_VIEW_FILE = path.join(process.cwd(), 'data', 'statusView.json');

function getStatusReact() {
  try {
    if (fs.existsSync(STATUS_REACT_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_REACT_FILE, 'utf8'));
      return data.enabled === true;
    }
  } catch (e) {}
  return config.autoReactEnabled !== false;
}

function setStatusReact(enabled) {
  try {
    const dir = path.dirname(STATUS_REACT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATUS_REACT_FILE, JSON.stringify({ enabled }, null, 2));
  } catch (e) {}
}

function getStatusView() {
  try {
    if (fs.existsSync(STATUS_VIEW_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_VIEW_FILE, 'utf8'));
      return data.enabled === true;
    }
  } catch (e) {}
  return config.autoViewStatus !== false;
}

function setStatusView(enabled) {
  try {
    const dir = path.dirname(STATUS_VIEW_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATUS_VIEW_FILE, JSON.stringify({ enabled }, null, 2));
  } catch (e) {}
}

module.exports = {
  name: 'autostatus',
  aliases: ['astatus'],
  category: 'owner',
  description: 'Enable/disable auto-react and auto-view for statuses',
  usage: 'react on/off | view on/off | all on/off',
  async execute(sock, msg, args, extra) {
    const from = extra.from || msg.key.remoteJid;
    const prefix = config.prefix || '.';
    const reply = extra.reply || ((text) => sock.sendMessage(from, { text }, { quoted: msg }));

    if (!extra.isOwner) return reply('❌ Owner only.');

    if (args.length === 0) {
      const reactStatus = getStatusReact() ? '✅ ON' : '❌ OFF';
      const viewStatus = getStatusView() ? '✅ ON' : '❌ OFF';
      return reply(`📸 *Auto-Status*\nReact: ${reactStatus}\nView: ${viewStatus}\n\nUsage: ${prefix}autostatus react on/off`);
    }

    const feature = args[0].toLowerCase();
    const option = args[1]?.toLowerCase();

    if (!option || (option !== 'on' && option !== 'off')) {
      return reply(`Use: ${prefix}autostatus ${feature} on/off`);
    }

    if (feature === 'all') {
      setStatusReact(option === 'on');
      setStatusView(option === 'on');
      return reply(`✅ Auto-status ${option === 'on' ? 'ON' : 'OFF'}`);
    }

    if (feature === 'react') {
      setStatusReact(option === 'on');
      return reply(`✅ Auto-react ${option === 'on' ? 'ON' : 'OFF'}`);
    }

    if (feature === 'view') {
      setStatusView(option === 'on');
      return reply(`✅ Auto-view ${option === 'on' ? 'ON' : 'OFF'}`);
    }

    return reply(`❌ Use: react, view, or all`);
  }
};