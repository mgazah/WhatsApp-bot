module.exports = {
  name: 'autorecord',
  aliases: ['record'],
  category: 'owner',
  description: 'Toggle auto recording on/off',
  usage: '.autorecord on/off',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    const action = args[0]?.toLowerCase();
    
    if (!action || (action !== 'on' && action !== 'off')) {
      const status = sock.autoConfig.isRecordEnabled();
      return await extra.reply(`Auto Record: ${status ? '✅ ON' : '❌ OFF'}\nUsage: .autorecord on/off`);
    }
    
    const enable = action === 'on';
    sock.autoConfig.setRecordEnabled(enable);
    await extra.reply(`✅ Auto Record turned ${enable ? 'ON' : 'OFF'}`);
  }
};