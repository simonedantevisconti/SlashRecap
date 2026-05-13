import axios from "axios";
import { adminAuth, adminDb } from "./firebaseAdmin.js";

const KIMI_API_URL = "https://api.moonshot.ai/v1/chat/completions";

const PLAN_LIMITS = {
  free: {
    label: "Free",
    dailyLimit: 3,
    monthlyLimit: 30,
  },
  starter: {
    label: "Starter",
    dailyLimit: 40,
    monthlyLimit: 1200,
  },
  pro: {
    label: "Pro",
    dailyLimit: 100,
    monthlyLimit: 3000,
  },
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getMessageCount(chatText) {
  return chatText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function getBearerToken(event) {
  const authHeader =
    event.headers.authorization || event.headers.Authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim();
}

function normalizeSummary(summary) {
  return {
    title: summary.title || "Recap WhatsApp",
    short: summary.short || "Nessun riassunto disponibile.",
    important: Array.isArray(summary.important)
      ? summary.important
      : ["Nessun punto importante rilevato"],
    decisions: Array.isArray(summary.decisions)
      ? summary.decisions
      : ["Nessuna decisione chiara rilevata"],
    openQuestions: Array.isArray(summary.openQuestions)
      ? summary.openQuestions
      : ["Nessuna domanda aperta rilevata"],
    actions: Array.isArray(summary.actions)
      ? summary.actions
      : ["Nessuna azione necessaria rilevata"],
  };
}

async function ensureUserProfile(decodedToken) {
  const userRef = adminDb.collection("users").doc(decodedToken.uid);
  const snapshot = await userRef.get();

  const todayKey = getTodayKey();
  const monthKey = getMonthKey();

  if (!snapshot.exists) {
    const payload = {
      email: decodedToken.email || "",
      displayName: decodedToken.name || "",
      photoURL: decodedToken.picture || "",
      plan: "free",
      recapDailyCount: 0,
      recapMonthlyCount: 0,
      usageDay: todayKey,
      usageMonth: monthKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRef.set(payload);

    return payload;
  }

  const profile = snapshot.data();

  const updates = {};

  if (profile.usageDay !== todayKey) {
    updates.usageDay = todayKey;
    updates.recapDailyCount = 0;
    profile.usageDay = todayKey;
    profile.recapDailyCount = 0;
  }

  if (profile.usageMonth !== monthKey) {
    updates.usageMonth = monthKey;
    updates.recapMonthlyCount = 0;
    profile.usageMonth = monthKey;
    profile.recapMonthlyCount = 0;
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await userRef.update(updates);
  }

  return profile;
}

async function checkAndIncrementUsage(uid) {
  const userRef = adminDb.collection("users").doc(uid);
  const todayKey = getTodayKey();
  const monthKey = getMonthKey();

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);

    if (!snapshot.exists) {
      throw new Error("Profilo utente non trovato.");
    }

    const profile = snapshot.data();

    const plan = profile.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    const shouldResetDay = profile.usageDay !== todayKey;
    const shouldResetMonth = profile.usageMonth !== monthKey;

    const dailyCount = shouldResetDay ? 0 : profile.recapDailyCount || 0;
    const monthlyCount = shouldResetMonth ? 0 : profile.recapMonthlyCount || 0;

    if (dailyCount >= limits.dailyLimit) {
      return {
        allowed: false,
        error: `Hai raggiunto il limite giornaliero del piano ${limits.label}: ${limits.dailyLimit} recap.`,
      };
    }

    if (monthlyCount >= limits.monthlyLimit) {
      return {
        allowed: false,
        error: `Hai raggiunto il limite mensile del piano ${limits.label}: ${limits.monthlyLimit} recap.`,
      };
    }

    transaction.update(userRef, {
      usageDay: todayKey,
      usageMonth: monthKey,
      recapDailyCount: dailyCount + 1,
      recapMonthlyCount: monthlyCount + 1,
      updatedAt: new Date(),
    });

    return {
      allowed: true,
      plan,
      limits,
      recapDailyCount: dailyCount + 1,
      recapMonthlyCount: monthlyCount + 1,
    };
  });
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Metodo non consentito" }),
    };
  }

  try {
    const token = getBearerToken(event);

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Devi accedere per generare un recap.",
        }),
      };
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    await ensureUserProfile(decodedToken);

    const { chatText } = JSON.parse(event.body || "{}");

    if (!chatText || !chatText.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Nessuna chat ricevuta",
        }),
      };
    }

    const cleanText = chatText.trim();

    if (cleanText.length > 30000) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "La chat è troppo lunga per questa prima versione. Prova con meno messaggi.",
        }),
      };
    }

    const usageResult = await checkAndIncrementUsage(decodedToken.uid);

    if (!usageResult.allowed) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: usageResult.error,
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

${cleanText}
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
      summary = normalizeSummary(JSON.parse(content));
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "La risposta AI non era in formato JSON valido",
          raw: content,
        }),
      };
    }

    const recapRef = adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .collection("recaps")
      .doc();

    await recapRef.set({
      ...summary,
      originalTextPreview: cleanText.slice(0, 500),
      messageCount: getMessageCount(cleanText),
      createdAt: new Date(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        summary,
        usage: {
          plan: usageResult.plan,
          recapDailyCount: usageResult.recapDailyCount,
          recapMonthlyCount: usageResult.recapMonthlyCount,
          dailyLimit: usageResult.limits.dailyLimit,
          monthlyLimit: usageResult.limits.monthlyLimit,
        },
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
