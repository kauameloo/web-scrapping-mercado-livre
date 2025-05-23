const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Web conectado!');
});

// 👇 Esse bloco captura mensagens recebidas
client.on('message', msg => {
    if (msg.body === '!grupo') {
        console.log('🆔 ID do grupo:', msg.from); // ← Aqui aparece o ID do grupo
        msg.reply('✅ Grupo identificado! Veja o terminal.'); // Feedback opcional
    }
});

client.initialize();
