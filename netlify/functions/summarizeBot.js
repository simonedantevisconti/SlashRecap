const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const botSecret = event.headers["x-bot-secret"];

    if (!botSecret || botSecret !== process.env.WHATSAPP_BOT_SECRET) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized bot request" }),
      };
    }

    const { chatText } = JSON.parse(event.body || "{}");

    if (!chatText || chatText.trim().length < 20) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Chat troppo corta per generare un recap.",
        }),
      };
    }

    const kimiResponse = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          {
            role: "system",
            content: `
Sei SlashRecap, un assistente che riassume chat WhatsApp.

Devi restituire SOLO JSON valido, senza markdown.

Formato:
{
  "title": "Titolo breve",
  "short": "Riassunto breve",
  "important": ["punto importante 1", "punto importante 2"],
  "decisions": ["decisione 1"],
  "openQuestions": ["domanda aperta 1"],
  "actions": ["azione 1"]
}
            `,
          },
          {
            role: "user",
            content: `Riassumi questa chat WhatsApp:\n\n${chatText}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!kimiResponse.ok) {
      const errorText = await kimiResponse.text();

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Errore Kimi/Moonshot",
          details: errorText,
        }),
      };
    }

    const kimiData = await kimiResponse.json();
    const content = kimiData?.choices?.[0]?.message?.content;

    let recap;

    try {
      recap = JSON.parse(content);
    } catch (err) {
      recap = {
        title: "Recap chat",
        short: content || "Recap non disponibile.",
        important: [],
        decisions: [],
        openQuestions: [],
        actions: [],
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ recap }),
    };
  } catch (error) {
    console.error("summarizeBot error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore interno summarizeBot",
        details: error.message,
      }),
    };
  }
};