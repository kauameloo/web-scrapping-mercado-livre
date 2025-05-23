require("dotenv").config(); // Adicionado para carregar variáveis do .env
const TelegramBot = require("node-telegram-bot-api");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const scrapMercadoLivre = require("./scrapers/mercadolivre");

// Substitua valores hardcoded por variáveis de ambiente
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_BOT = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const WHATSAPP_CLIENT = new Client({
  authStrategy: new LocalAuth({ clientId: "bot-session" }),
});

let WHATSAPP_GROUP_ID = process.env.WHATSAPP_GROUP_ID;

// Inicializa o WhatsApp Web
WHATSAPP_CLIENT.on("qr", (qr) => qrcode.generate(qr, { small: true }));
WHATSAPP_CLIENT.on("ready", () =>
  console.log("✅ WhatsApp Web conectado com sucesso!")
);

// Comando para descobrir o ID de um grupo
WHATSAPP_CLIENT.on("message", (msg) => {
  if (msg.body === "!grupo") {
    console.log("🆔 ID do grupo:", msg.from);
  }
});

// Escuta mensagens no Telegram
TELEGRAM_BOT.on("message", async (msg) => {
  const chatId = msg.chat.id;
  // Log completo da mensagem recebida
  console.log(
    "Mensagem completa recebida no Telegram:",
    JSON.stringify(msg, null, 2)
  );

  // Tenta extrair texto de diferentes campos
  let text = msg.text || msg.caption || "";
  // Busca o link do Mercado Livre em qualquer parte do texto
  const mlRegex = /(https?:\/\/(?:www\.)?mercadolivre\.com[^\s]*)/i;
  const match = text.match(mlRegex);

  if (match && match[1]) {
    const url = match[1];
    try {
      const produto = await scrapMercadoLivre(url);
      console.log("Produto retornado pelo scrap:", produto); // debug

      if (!produto || !produto.title) {
        TELEGRAM_BOT.sendMessage(
          chatId,
          "Não foi possível extrair informações do produto. Tente outro link."
        );
        return;
      }

      // Monta mensagem para Telegram (Markdown V2)
      let precoMsgTelegram = `💰 *${produto.price}*`;
      if (produto.originalPrice && produto.discount) {
        precoMsgTelegram += `  ~${produto.originalPrice}~  🔥 *${produto.discount}*`;
      } else if (produto.originalPrice) {
        precoMsgTelegram += `  ~${produto.originalPrice}~`;
      }

      const anuncioTelegram = `
🎯 *ACHAMOS UMA OFERTA PRA VOCÊ!*

${produto.image ? `[🖼️ Ver imagem do produto](${produto.image})\n` : ""}
🛒 *${produto.title}*

${precoMsgTelegram}

🔗 [👉 Clique aqui para ver o produto no Mercado Livre](${produto.url})

*Compartilhe com seus amigos e aproveite! 🚀*
      `.trim();

      // Monta mensagem para WhatsApp (texto puro, links separados)
      let precoMsgWhats = `💰 ${produto.price}`;
      if (produto.originalPrice && produto.discount) {
        precoMsgWhats += `  (De: ${produto.originalPrice} | ${produto.discount})`;
      } else if (produto.originalPrice) {
        precoMsgWhats += `  (De: ${produto.originalPrice})`;
      }

      let anuncioWhats = `🎯 ACHAMOS UMA OFERTA PRA VOCÊ!

${produto.title}

${precoMsgWhats}

${produto.image ? "Imagem: " + produto.image + "\n" : ""}
Veja: ${produto.url}

Compartilhe com seus amigos e aproveite! 🚀`;

      console.log("Mensagem montada para envio:", anuncioTelegram); // debug

      // Envia no Telegram
      TELEGRAM_BOT.sendMessage(chatId, anuncioTelegram, {
        parse_mode: "Markdown",
      })
        .then((res) => {
          console.log("Mensagem enviada no Telegram com sucesso!", res);
        })
        .catch((err) => {
          console.error("Erro ao enviar mensagem no Telegram:", err);
          TELEGRAM_BOT.sendMessage(
            chatId,
            "Oferta Mercado Livre:\n" +
              produto.title +
              "\nPreço: " +
              produto.price +
              "\n" +
              produto.url
          );
        });

      // Envia no WhatsApp
      if (WHATSAPP_GROUP_ID) {
        WHATSAPP_CLIENT.sendMessage(WHATSAPP_GROUP_ID, anuncioWhats)
          .then(() => {
            console.log("Mensagem enviada no WhatsApp com sucesso!");
          })
          .catch((err) => {
            console.error("Erro ao enviar mensagem no WhatsApp:", err);
          });
      } else {
        console.log("⚠️ Grupo do WhatsApp não configurado.");
      }
    } catch (err) {
      console.error("Erro ao processar mensagem do Telegram:", err);
      TELEGRAM_BOT.sendMessage(
        chatId,
        "Ocorreu um erro ao buscar o produto. Tente novamente."
      );
    }
  }
});

// Inicializa WhatsApp
WHATSAPP_CLIENT.initialize();
