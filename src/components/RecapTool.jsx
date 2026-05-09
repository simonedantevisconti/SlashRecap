import { useMemo, useState } from "react";
import "../styles/recap-tool.css";

const sampleChat = `Mario: Ragazzi domani alle 18 ci vediamo?
Luca: Io ci sono, ma arrivo verso le 18:30
Sara: Va bene anche per me
Marco: Portiamo qualcosa?
Mario: Prendiamo pizza da me, magari qualcuno porta da bere
Sara: Io porto birre
Luca: Io dolce
Marco: Perfetto, allora confermato`;

const RecapTool = () => {
  const [chatText, setChatText] = useState("");
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);

  const messageCount = useMemo(() => {
    if (!chatText.trim()) return 0;

    return chatText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  }, [chatText]);

  const generateLocalRecap = () => {
    const cleanText = chatText.trim();

    if (!cleanText) {
      setSummary({
        title: "Nessuna chat rilevata",
        short:
          "Incolla una conversazione WhatsApp per generare il tuo primo recap.",
        important: [],
        decisions: [],
        openQuestions: [],
        actions: [],
      });

      return;
    }

    const lines = cleanText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const people = [
      ...new Set(
        lines
          .map((line) => line.split(":")[0]?.trim())
          .filter((name) => name && name.length < 30),
      ),
    ];

    const questionLines = lines.filter((line) => line.includes("?"));

    setSummary({
      title: "/recap generato",
      short: `Ho analizzato ${lines.length} messaggi. Questa è una prima demo locale: nello step successivo collegheremo una vera AI per creare riassunti molto più intelligenti.`,
      important: [
        `Messaggi analizzati: ${lines.length}`,
        people.length > 0
          ? `Persone rilevate: ${people.join(", ")}`
          : "Persone rilevate: non chiare",
        "La conversazione è stata trasformata in un recap più leggibile.",
      ],
      decisions: [
        "Questa demo non interpreta ancora decisioni reali con AI.",
        "Il prossimo step sarà collegare una Function per generare un riassunto intelligente.",
      ],
      openQuestions:
        questionLines.length > 0
          ? questionLines.slice(0, 4)
          : ["Nessuna domanda rilevata automaticamente."],
      actions: [
        "Controlla se nel recap mancano informazioni importanti.",
        "Quando collegheremo l'AI, qui compariranno attività, risposte consigliate e cose da non perdere.",
      ],
    });
  };

  const loadExample = () => {
    setChatText(sampleChat);
    setSummary(null);
    setCopied(false);
  };

  const resetChat = () => {
    setChatText("");
    setSummary(null);
    setCopied(false);
  };

  const copySummary = async () => {
    if (!summary) return;

    const text = `
${summary.title}

RIASSUNTO
${summary.short}

PUNTI IMPORTANTI
${summary.important.map((item) => `- ${item}`).join("\n")}

DECISIONI
${summary.decisions.map((item) => `- ${item}`).join("\n")}

DOMANDE APERTE
${summary.openQuestions.map((item) => `- ${item}`).join("\n")}

AZIONI CONSIGLIATE
${summary.actions.map((item) => `- ${item}`).join("\n")}
`;

    await navigator.clipboard.writeText(text.trim());
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

  return (
    <div className="recap-grid" id="recap-tool">
      <div className="recap-card input-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Step 01</p>
            <h2>Incolla la tua chat</h2>
          </div>

          <span className="counter">
            {messageCount} {messageCount === 1 ? "messaggio" : "messaggi"}
          </span>
        </div>

        <textarea
          value={chatText}
          onChange={(event) => setChatText(event.target.value)}
          placeholder={`Incolla qui la chat WhatsApp...\n\nEsempio:\nMario: ragazzi domani alle 18?\nSara: io ci sono\nLuca: arrivo più tardi`}
        />

        <div className="tool-actions">
          <button
            type="button"
            className="primary-button"
            onClick={generateLocalRecap}
          >
            Genera /recap
          </button>

          <button type="button" className="ghost-button" onClick={loadExample}>
            Esempio
          </button>

          <button
            type="button"
            className="ghost-button danger"
            onClick={resetChat}
          >
            Cancella
          </button>
        </div>
      </div>

      <div className="recap-card output-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Step 02</p>
            <h2>Il tuo recap</h2>
          </div>

          {summary && (
            <button type="button" className="copy-button" onClick={copySummary}>
              {copied ? "Copiato" : "Copia"}
            </button>
          )}
        </div>

        {!summary ? (
          <div className="empty-state">
            <img src="/resume-logo-plain.png" alt="" />
            <h3>Nessun recap generato</h3>
            <p>
              Incolla una chat e clicca su <strong>Genera /recap</strong>.
            </p>
          </div>
        ) : (
          <div className="summary-result">
            <h3>{summary.title}</h3>

            <div className="summary-block">
              <span>Riassunto</span>
              <p>{summary.short}</p>
            </div>

            <div className="summary-block">
              <span>Punti importanti</span>
              <ul>
                {summary.important.map((item, index) => (
                  <li key={`important-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="summary-block">
              <span>Decisioni</span>
              <ul>
                {summary.decisions.map((item, index) => (
                  <li key={`decision-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="summary-block">
              <span>Domande aperte</span>
              <ul>
                {summary.openQuestions.map((item, index) => (
                  <li key={`question-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="summary-block">
              <span>Azioni consigliate</span>
              <ul>
                {summary.actions.map((item, index) => (
                  <li key={`action-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecapTool;
