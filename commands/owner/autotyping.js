module.exports = {
  name: 'autotyping',
  aliases: ['typing'],
  category: 'owner',
  description: 'Toggle auto typing on/off',
  usage: '.autotyping on/off',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    const action = args[0]?.toLowerCase();
    
    if (!action || (action !== 'on' && action !== 'off')) {
      const status = sock.autoConfig.isTypingEnabled();
      return await extra.reply(`Auto Typing: ${status ? '✅ ON' : '❌ OFF'}\nUsage: .autotyping on/off`);
    }
    
    const enable = action === 'on';
    sock.autoConfig.setTypingEnabled(enable);
    await extra.reply(`✅ Auto Typing turned ${enable ? 'ON' : 'OFF'}`);
  }
};