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

// Controle de estado por chat
const userStates = {};

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

  // Verifica se o usuário está em algum estado de cupom
  if (userStates[chatId] && userStates[chatId].step) {
    const state = userStates[chatId];

    if (state.step === "awaiting_coupon") {
      // Aceita variações de sim/não
      const yesList = ["sim", "s", "yes", "y"];
      const noList = ["não", "nao", "n", "no", "não"];
      const answer = text
        .trim()
        .toLowerCase()
        .replace(/[ãá]/g, "a")
        .replace(/[ôó]/g, "o");
      if (yesList.includes(answer)) {
        userStates[chatId].step = "awaiting_coupon_code";
        TELEGRAM_BOT.sendMessage(
          chatId,
          "Por favor, informe o CUPOM de desconto:"
        );
      } else if (noList.includes(answer)) {
        // Não tem cupom, envia oferta normalmente
        const produto = userStates[chatId].produto;
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

        // WhatsApp - mensagem mais envolvente
        let precoMsgWhats = `💰 ${produto.price}`;
        if (produto.originalPrice && produto.discount) {
          precoMsgWhats += `   ~${produto.originalPrice}~   🔥 ${produto.discount}`;
        } else if (produto.originalPrice) {
          precoMsgWhats += `   ~${produto.originalPrice}~`;
        }
        let anuncioWhats = `🎯 *ACHAMOS UMA OFERTA PRA VOCÊ!*

${produto.title.toUpperCase()}

${precoMsgWhats}

${produto.image ? "🖼️ Imagem do produto: " + produto.image + "\n" : ""}
👉 Veja: ${produto.url}

Compartilhe com seus amigos e aproveite! 🚀`;

        TELEGRAM_BOT.sendMessage(chatId, anuncioTelegram, {
          parse_mode: "Markdown",
        });
        if (WHATSAPP_GROUP_ID) {
          WHATSAPP_CLIENT.sendMessage(WHATSAPP_GROUP_ID, anuncioWhats)
            .then(() =>
              console.log("Mensagem enviada no WhatsApp com sucesso!")
            )
            .catch((err) =>
              console.error("Erro ao enviar mensagem no WhatsApp:", err)
            );
        }
        delete userStates[chatId];
      } else {
        TELEGRAM_BOT.sendMessage(
          chatId,
          "Por favor, responda apenas com 'sim' ou 'não'."
        );
      }
      return;
    }

    if (state.step === "awaiting_coupon_code") {
      userStates[chatId].couponCode = text.trim();
      userStates[chatId].step = "awaiting_coupon_percent";
      TELEGRAM_BOT.sendMessage(
        chatId,
        "Qual o percentual (%) de desconto desse cupom?"
      );
      return;
    }

    if (state.step === "awaiting_coupon_percent") {
      // Aceita percentual com ou sem símbolo %
      let percentText = text.trim().replace(",", ".").replace("%", "");
      const percent = parseFloat(percentText);
      if (isNaN(percent) || percent <= 0 || percent >= 100) {
        TELEGRAM_BOT.sendMessage(
          chatId,
          "Por favor, informe um percentual válido (apenas o número, ex: 10 para 10%)."
        );
        return;
      }
      userStates[chatId].couponPercent = percent;

      // Calcula valor final com desconto
      const produto = userStates[chatId].produto;
      const precoStr = (produto.price || "")
        .replace(/[^\d,]/g, "")
        .replace(",", ".");
      const preco = parseFloat(precoStr);
      if (isNaN(preco)) {
        TELEGRAM_BOT.sendMessage(
          chatId,
          "Não foi possível calcular o desconto. Preço inválido."
        );
        delete userStates[chatId];
        return;
      }
      const desconto = preco * (percent / 100);
      const precoFinal = preco - desconto;

      // Monta mensagem para Telegram (Markdown V2) com cupom e valor atualizado
      let precoMsgTelegram = `💰 *R$ ${precoFinal
        .toFixed(2)
        .replace(".", ",")}*  _(com cupom ${userStates[chatId].couponCode})_`;
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

*Cupom utilizado:* \`${userStates[chatId].couponCode}\` (${percent}% OFF)

*Compartilhe com seus amigos e aproveite! 🚀*
      `.trim();

      // WhatsApp - mensagem mais envolvente com cupom
      let precoMsgWhats = `💰 R$ ${precoFinal
        .toFixed(2)
        .replace(".", ",")} (com cupom ${userStates[chatId].couponCode})`;
      if (produto.originalPrice && produto.discount) {
        precoMsgWhats += `   ~${produto.originalPrice}~   🔥 ${produto.discount}`;
      } else if (produto.originalPrice) {
        precoMsgWhats += `   ~${produto.originalPrice}~`;
      }
      let anuncioWhats = `🎯 *ACHAMOS UMA OFERTA PRA VOCÊ!*

${produto.title.toUpperCase()}

${precoMsgWhats}

Cupom utilizado: ${userStates[chatId].couponCode} (${percent}% OFF)

${produto.image ? "🖼️ Imagem do produto: " + produto.image + "\n" : ""}
👉 Veja: ${produto.url}

Compartilhe com seus amigos e aproveite! 🚀`;

      // Envia mensagem no Telegram também
      TELEGRAM_BOT.sendMessage(chatId, anuncioTelegram, {
        parse_mode: "Markdown",
      });

      if (WHATSAPP_GROUP_ID) {
        WHATSAPP_CLIENT.sendMessage(WHATSAPP_GROUP_ID, anuncioWhats)
          .then(() => console.log("Mensagem enviada no WhatsApp com sucesso!"))
          .catch((err) =>
            console.error("Erro ao enviar mensagem no WhatsApp:", err)
          );
      }
      delete userStates[chatId];
      return;
    }
  }

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

      // Salva produto no estado e pergunta sobre cupom
      userStates[chatId] = {
        step: "awaiting_coupon",
        produto,
      };
      TELEGRAM_BOT.sendMessage(
        chatId,
        "Você possui algum cupom de desconto para esse produto? (Responda 'sim' ou 'não')"
      );

      // Não envia a oferta ainda, só após resposta do cupom
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
