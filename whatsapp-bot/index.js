require("dotenv").config();

const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

console.log("Avvio SlashRecap WhatsApp bot...");

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "slashrecap-local-bot",
  }),
  takeoverOnConflict: true,
  takeoverTimeoutMs: 0,
  puppeteer: {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("QR GENERATO. Scansionalo con WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("WhatsApp autenticato.");
});

client.on("ready", () => {
  console.log("SlashRecap WhatsApp bot pronto.");
});

client.on("message_create", async (message) => {
  try {
    console.log("EVENTO MESSAGE_CREATE:", {
      from: message.from,
      to: message.to,
      body: message.body,
      fromMe: message.fromMe,
    });

    const text = message.body?.trim();

    if (text !== "/recap") return;

    await message.reply(
      "SlashRecap V2 attivo: sto preparando il recap vero...",
    );

    const chat = await message.getChat();

    const messages = await chat.fetchMessages({
      limit: 60,
    });

    const chatText = messages
      .filter((msg) => msg.body && msg.body.trim())
      .filter((msg) => msg.body.trim() !== "/recap")
      .filter((msg) => !msg.body.includes("Sto preparando il recap"))
      .filter((msg) => !msg.body.includes("Risposta da evento"))
      .slice(-50)
      .map((msg) => {
        const author = msg.author || msg.from || "Utente";
        return `${author}: ${msg.body}`;
      })
      .join("\n");

    console.log("CHAT TEXT DA RIASSUMERE:");
    console.log(chatText);

    if (!chatText || chatText.length < 20) {
      await message.reply("Non ho trovato abbastanza messaggi da riassumere.");
      return;
    }

    const response = await fetch(process.env.SLASHRECAP_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": process.env.SLASHRECAP_BOT_SECRET,
      },
      body: JSON.stringify({ chatText }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ERRORE FUNCTION:", data);
      await message.reply("Errore durante la generazione del recap.");
      return;
    }

    const recap = data.recap;

    const formattedRecap = formatRecap(recap);

    await message.reply(formattedRecap);
  } catch (error) {
    console.error("ERRORE BOT:", error);
    await message.reply("Errore interno del bot SlashRecap.");
  }
});

function formatRecap(recap) {
  const important = formatList(recap.important);
  const decisions = formatList(recap.decisions);
  const openQuestions = formatList(recap.openQuestions);
  const actions = formatList(recap.actions);

  return `
/recap — ${recap.title || "Recap chat"}

Riassunto:
${recap.short || "Nessun riassunto disponibile."}

Punti importanti:
${important}

Decisioni:
${decisions}

Domande aperte:
${openQuestions}

Azioni:
${actions}
`.trim();
}

function formatList(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return "- Nessuno";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

client.initialize();
