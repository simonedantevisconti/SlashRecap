import { auth } from "../firebase";

export async function generateRecap(chatText) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Devi accedere per generare un recap.");
  }

  const token = await user.getIdToken();

  const response = await fetch("/.netlify/functions/summarizeChat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatText }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Errore durante la generazione del recap");
  }

  return data.summary;
}

export async function transcribeAudio(audioFile) {
  const formData = new FormData();

  formData.append("audio", audioFile);

  const response = await fetch("/.netlify/functions/transcribeAudio", {
    method: "POST",
    body: formData,
  });

  const rawText = await response.text();

  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("Risposta non JSON dalla function audio:", rawText);

    throw new Error(
      `Risposta non valida dalla function audio. Status: ${response.status}. Controlla il terminale di netlify dev.`,
    );
  }

  if (!response.ok) {
    throw new Error(data.error || "Errore durante la trascrizione audio");
  }

  return data;
}
