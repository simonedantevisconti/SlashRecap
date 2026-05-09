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
