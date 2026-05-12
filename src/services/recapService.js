export async function generateRecap(chatText) {
  const response = await fetch("/.netlify/functions/summarizeChat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Errore durante la trascrizione audio");
  }

  return data;
}
