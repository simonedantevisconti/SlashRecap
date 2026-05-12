import { useMemo, useRef, useState } from "react";
import { generateRecap } from "../services/recapService";
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
  const fileInputRef = useRef(null);

  const [chatText, setChatText] = useState("");
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [uploadedFileName, setUploadedFileName] = useState("");

  const messageCount = useMemo(() => {
    if (!chatText.trim()) return 0;

    return chatText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  }, [chatText]);

  const generateAiRecap = async () => {
    const cleanText = chatText.trim();

    if (!cleanText) {
      setSummary(null);
      setError("Incolla una chat o carica un file .txt prima di generare il recap.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setCopied(false);

      const aiSummary = await generateRecap(cleanText);

      setSummary(aiSummary);
    } catch (error) {
      console.error(error);
      setError(error.message || "Errore durante la generazione del recap.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    setChatText(sampleChat);
    setSummary(null);
    setCopied(false);
    setError("");
    setUploadedFileName("");
  };

  const resetChat = () => {
    setChatText("");
    setSummary(null);
    setCopied(false);
    setError("");
    setUploadedFileName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTxtUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isTxtFile =
      file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isTxtFile) {
      setError("Formato non valido. Carica un file .txt esportato da WhatsApp.");
      setUploadedFileName("");
      return;
    }

    const maxSizeInMb = 2;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setError(`Il file è troppo grande. Per ora carica un file massimo di ${maxSizeInMb} MB.`);
      setUploadedFileName("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || "").trim();

      if (!text) {
        setError("Il file sembra vuoto. Prova con un altro file .txt.");
        setUploadedFileName("");
        return;
      }

      setChatText(text);
      setSummary(null);
      setCopied(false);
      setError("");
      setUploadedFileName(file.name);
    };

    reader.onerror = () => {
      setError("Non sono riuscito a leggere il file. Riprova.");
      setUploadedFileName("");
    };

    reader.readAsText(file, "UTF-8");
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
            <h2>Incolla o carica la tua chat</h2>
          </div>

          <span className="counter">
            {messageCount} {messageCount === 1 ? "messaggio" : "messaggi"}
          </span>
        </div>

        <div className="upload-panel">
          <div>
            <h3>Carica chat WhatsApp</h3>
            <p>
              Esporta la conversazione da WhatsApp in formato <strong>.txt</strong> e caricala qui.
            </p>
          </div>

          <label className="upload-button">
            Carica file .txt
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleTxtUpload}
            />
          </label>
        </div>

        {uploadedFileName && (
          <p className="uploaded-file">
            File caricato: <strong>{uploadedFileName}</strong>
          </p>
        )}

        <textarea
          value={chatText}
          onChange={(event) => {
            setChatText(event.target.value);
            setSummary(null);
            setError("");
          }}
          placeholder={`Oppure incolla qui la chat WhatsApp...\n\nEsempio:\nMario: ragazzi domani alle 18?\nSara: io ci sono\nLuca: arrivo più tardi`}
        />

        <div className="tool-actions">
          <button
            type="button"
            className="primary-button"
            onClick={generateAiRecap}
            disabled={isLoading}
          >
            {isLoading ? "Sto generando..." : "Genera /recap"}
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

        {error && <p className="tool-error">{error}</p>}
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
              Incolla una chat, carica un file .txt e clicca su{" "}
              <strong>Genera /recap</strong>.
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