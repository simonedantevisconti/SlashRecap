import axios from "axios";

const KIMI_API_URL = "https://api.moonshot.ai/v1/chat/completions";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Metodo non consentito" }),
    };
  }

  try {
    const { chatText } = JSON.parse(event.body || "{}");

    if (!chatText || !chatText.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Nessuna chat ricevuta",
        }),
      };
    }

    if (chatText.length > 30000) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "La chat è troppo lunga per questa prima versione. Prova con meno messaggi.",
        }),
      };
    }

    const prompt = `
Sei SlashRecap, un assistente che riassume conversazioni WhatsApp.

Il tuo compito è aiutare una persona che ha molti messaggi non letti a capire rapidamente cosa è successo nella chat.

Analizza la conversazione e restituisci SOLO un JSON valido, senza markdown, senza testo prima o dopo.

Formato JSON obbligatorio:

{
  "title": "Titolo breve del recap",
  "short": "Riassunto breve della conversazione",
  "important": ["punto importante 1", "punto importante 2"],
  "decisions": ["decisione presa 1", "decisione presa 2"],
  "openQuestions": ["domanda aperta 1", "domanda aperta 2"],
  "actions": ["azione consigliata 1", "azione consigliata 2"]
}

Regole:
- Non inventare informazioni.
- Se non ci sono decisioni, scrivi ["Nessuna decisione chiara rilevata"].
- Se non ci sono domande aperte, scrivi ["Nessuna domanda aperta rilevata"].
- Se non ci sono azioni consigliate, scrivi ["Nessuna azione necessaria rilevata"].
- Mantieni il tono pratico, sintetico e utile.
- Rispondi in italiano.
- Il JSON deve essere parseabile da JavaScript.

Conversazione WhatsApp:

${chatText}
`;

    const response = await axios.post(
      KIMI_API_URL,
      {
        model: "moonshot-v1-8k",
        messages: [
          {
            role: "system",
            content:
              "Sei SlashRecap, un assistente specializzato nel riassumere chat WhatsApp in italiano.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const content = response.data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Risposta AI vuota",
        }),
      };
    }

    let summary;

    try {
      summary = JSON.parse(content);
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "La risposta AI non era in formato JSON valido",
          raw: content,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        summary,
      }),
    };
  } catch (error) {
    console.error(
      "Errore summarizeChat:",
      error.response?.data || error.message,
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore durante la generazione del recap",
      }),
    };
  }
}
