/**
 * Random Cat Images
 */

const config = require('../../config');

// ✏️ EDIT BACKUP APIS HERE ✏️
const BACKUP_APIS = [
    'https://alternative-cat-api.com/random',
    'https://backup-cat.images/random'
];

module.exports = {
    name: 'cat',
    category: 'ai',
    description: 'Get random cat images',
    usage: '.cat',

    async execute(sock, msg, args, extra) {
        const responses = [
            `🐱 *${config.botName}* on fire 🔥\n\nGet random cat pics: .cat\n\nPurrfect cuteness! 🎉`,
            `🐈 *${config.botName}* Cat Gallery!\n\nUsage: .cat\n\nEndless meow-gic! ✨`,
            `🔥 *${config.botName}* says: Need a dose of cuteness? Try .cat\n\nHope you're having fun! 🎊`
        ];
        
        await extra.reply(responses[Math.floor(Math.random() * responses.length)]);

        try {
            const fetch = require('node-fetch');
            
            // Primary API
            let response = await fetch('https://apis.xwolf.space/api/ai/image/cat');
            
            if (!response.ok) {
                for (const backupApi of BACKUP_APIS) {
                    try {
                        response = await fetch(backupApi);
                        if (response.ok) break;
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            if (!response.ok) throw new Error('All APIs failed');
            
            const data = await response.json();
            
            if (data.success && data.data.image) {
                const imageUrl = data.data.image;
                const imgRes = await fetch(imageUrl);
                const imgBuffer = await imgRes.buffer();
                
                const successMsgs = [
                    `🐱 *Random Kitty*\n\n✨ *${config.botName}* on fire 🔥\nMeow! 🎉`,
                    `🐈 *${config.botName}* found this cutie!\n\nPurrr... 🐾\n\nHope you're having fun! ✨`,
                    `🔥 Cat delivery!\n\n*${config.botName}* brings you happiness! 🐱\n\nUse .cat for more! 🎯`
                ];
                
                await sock.sendMessage(msg.key.remoteJid, {
                    image: imgBuffer,
                    caption: successMsgs[Math.floor(Math.random() * successMsgs.length)]
                }, { quoted: msg });
            } else {
                throw new Error('No cat image');
            }
        } catch (err) {
            console.error('[cat] error:', err);
            extra.reply(`❌ *${config.botName}* couldn't fetch a kitty! Try again 🐱`);
        }
    }
};