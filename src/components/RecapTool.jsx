import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { generateRecap, transcribeAudio } from "../services/recapService";
import { useAuth } from "../context/AuthContext";
import { saveRecapToHistory } from "../services/historyService";
import { canGenerateRecap, incrementRecapUsage } from "../services/userService";
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
  const { user, refreshProfile } = useAuth();

  const txtInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const [chatText, setChatText] = useState("");
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedAudioName, setUploadedAudioName] = useState("");

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
      setSaveStatus("");
      setError(
        "Incolla una chat, carica un file .txt o trascrivi un audio prima di generare il recap.",
      );
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSaveStatus("");
      setCopied(false);

      if (user) {
        const limitCheck = await canGenerateRecap(user.uid);

        if (!limitCheck.allowed) {
          setError(limitCheck.reason);
          setIsLoading(false);
          return;
        }
      }

      const aiSummary = await generateRecap(cleanText);

      setSummary(aiSummary);

      if (user) {
        await saveRecapToHistory(user.uid, {
          ...aiSummary,
          originalTextPreview: cleanText.slice(0, 500),
          messageCount,
        });

        await incrementRecapUsage(user.uid);
        await refreshProfile(user.uid);

        setSaveStatus("Recap salvato nello storico. Utilizzo aggiornato.");
      } else {
        setSaveStatus("Accedi per salvare questo recap nello storico.");
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "Errore durante la generazione del recap.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTxtUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isTxtFile =
      file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isTxtFile) {
      setError(
        "Formato non valido. Carica un file .txt esportato da WhatsApp.",
      );
      setSaveStatus("");
      setUploadedFileName("");
      return;
    }

    const maxSizeInMb = 2;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setError(
        `Il file è troppo grande. Per ora carica un file massimo di ${maxSizeInMb} MB.`,
      );
      setSaveStatus("");
      setUploadedFileName("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || "").trim();

      if (!text) {
        setError("Il file sembra vuoto. Prova con un altro file .txt.");
        setSaveStatus("");
        setUploadedFileName("");
        return;
      }

      setChatText(text);
      setSummary(null);
      setCopied(false);
      setError("");
      setSaveStatus("");
      setUploadedFileName(file.name);
      setUploadedAudioName("");
    };

    reader.onerror = () => {
      setError("Non sono riuscito a leggere il file. Riprova.");
      setSaveStatus("");
      setUploadedFileName("");
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedExtensions = [
      ".mp3",
      ".mp4",
      ".mpeg",
      ".mpga",
      ".m4a",
      ".wav",
      ".webm",
      ".ogg",
      ".opus",
    ];

    const lowerFilename = file.name.toLowerCase();

    const isSupportedAudio = allowedExtensions.some((extension) =>
      lowerFilename.endsWith(extension),
    );

    if (!isSupportedAudio) {
      setError(
        "Formato audio non supportato. Usa mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg o opus.",
      );
      setSaveStatus("");
      setUploadedAudioName("");

      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }

      return;
    }

    const maxSizeInMb = 4;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setError(
        `Audio troppo grande. Per questa MVP usa un file massimo di ${maxSizeInMb} MB.`,
      );
      setSaveStatus("");
      setUploadedAudioName("");

      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }

      return;
    }

    try {
      setIsTranscribing(true);
      setError("");
      setSaveStatus("");
      setSummary(null);
      setCopied(false);
      setUploadedAudioName(file.name);

      const data = await transcribeAudio(file);

      setChatText(data.text);
      setUploadedFileName("");
    } catch (error) {
      console.error(error);
      setError(error.message || "Errore durante la trascrizione audio.");
      setSaveStatus("");
      setUploadedAudioName("");
    } finally {
      setIsTranscribing(false);
    }
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

        <div className="upload-stack">
          <div className="upload-panel">
            <div>
              <h3>Carica chat WhatsApp</h3>
              <p>
                Esporta la conversazione da WhatsApp in formato{" "}
                <strong>.txt</strong> e caricala qui.
              </p>
            </div>

            <label className="upload-button">
              Carica file .txt
              <input
                ref={txtInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={handleTxtUpload}
              />
            </label>
          </div>

          <div className="upload-panel audio-panel">
            <div>
              <h3>Trascrivi audio</h3>
              <p>
                Carica un vocale o un audio breve. Verrà trasformato in testo
                nella textarea.
              </p>
            </div>

            <label className="upload-button audio-button">
              {isTranscribing ? "Trascrivo..." : "Carica audio"}
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.opus,audio/*"
                onChange={handleAudioUpload}
                disabled={isTranscribing}
              />
            </label>
          </div>
        </div>

        {uploadedFileName && (
          <p className="uploaded-file">
            File caricato: <strong>{uploadedFileName}</strong>
          </p>
        )}

        {uploadedAudioName && (
          <p className="uploaded-file">
            Audio caricato: <strong>{uploadedAudioName}</strong>
          </p>
        )}

        <textarea
          value={chatText}
          onChange={(event) => {
            setChatText(event.target.value);
            setSummary(null);
            setError("");
            setSaveStatus("");
          }}
          placeholder={`Oppure incolla qui la chat WhatsApp o il testo trascritto...\n\nEsempio:\nMario: ragazzi domani alle 18?\nSara: io ci sono\nLuca: arrivo più tardi`}
        />

        <div className="tool-actions">
          <button
            type="button"
            className="primary-button"
            onClick={generateAiRecap}
            disabled={isLoading || isTranscribing}
          >
            {isLoading ? "Sto generando..." : "Genera /recap"}
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={loadExample}
            disabled={isTranscribing}
          >
            Esempio
          </button>

          <button
            type="button"
            className="ghost-button danger"
            onClick={resetChat}
            disabled={isTranscribing}
          >
            Cancella
          </button>
        </div>

        {error && <p className="tool-error">{error}</p>}

        {saveStatus && (
          <p className="save-status">
            {saveStatus} {!user && <Link to="/login">Accedi</Link>}
          </p>
        )}
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
              Incolla una chat, carica un file .txt o trascrivi un audio, poi
              clicca su <strong>Genera /recap</strong>.
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
