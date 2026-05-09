import { Link } from "react-router-dom";
import "../styles/how-it-works.css";

const HowItWorks = () => {
  return (
    <section className="how-page">
      <div className="how-hero">
        <p className="eyebrow">Come funziona</p>

        <h1>
          Da chat infinita a <span>recap chiaro.</span>
        </h1>

        <p>
          SlashRecap nasce per aiutarti a recuperare conversazioni WhatsApp
          lunghe senza dover leggere centinaia di messaggi arretrati.
        </p>

        <Link to="/recap" className="primary-button">
          Prova /recap
        </Link>
      </div>

      <div className="how-steps">
        <article className="how-step">
          <span>01</span>
          <div>
            <h2>Copia o esporta la chat</h2>
            <p>
              Prendi i messaggi da WhatsApp copiandoli manualmente oppure, in
              futuro, caricando un file esportato dalla conversazione.
            </p>
          </div>
        </article>

        <article className="how-step">
          <span>02</span>
          <div>
            <h2>Incolla il testo in SlashRecap</h2>
            <p>
              Inserisci la conversazione nel box dedicato. Il sistema legge il
              testo e prepara i dati per trasformarli in un riepilogo ordinato.
            </p>
          </div>
        </article>

        <article className="how-step">
          <span>03</span>
          <div>
            <h2>Genera il recap</h2>
            <p>
              Cliccando su <strong>Genera /recap</strong>, SlashRecap crea una
              sintesi con punti importanti, domande aperte, decisioni e azioni
              consigliate.
            </p>
          </div>
        </article>

        <article className="how-step">
          <span>04</span>
          <div>
            <h2>Recupera solo ciò che conta</h2>
            <p>
              Invece di leggere tutta la chat, puoi capire rapidamente cosa è
              successo, chi ha detto cosa e se devi rispondere a qualcosa.
            </p>
          </div>
        </article>
      </div>

      <div className="how-info-grid">
        <article>
          <h3>Perché manuale?</h3>
          <p>
            La prima versione è manuale perché è più semplice, stabile e sicura.
            Non serve collegare WhatsApp, non serve usare API non ufficiali e
            puoi testare subito il valore dell’idea.
          </p>
        </article>

        <article>
          <h3>Cosa arriverà dopo?</h3>
          <p>
            Dopo questa fase potremo collegare una vera AI tramite backend,
            aggiungere upload file, storico recap, login utente e salvataggio
            dei riepiloghi.
          </p>
        </article>
      </div>
    </section>
  );
};

export default HowItWorks;
