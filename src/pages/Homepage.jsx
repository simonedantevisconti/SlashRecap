import { Link } from "react-router-dom";
import "../styles/homepage.css";

const Homepage = () => {
  return (
    <section className="homepage">
      <div className="hero-section">
        <div className="hero-badge">
          <span>/recap</span>
          Riassunto manuale per chat WhatsApp
        </div>

        <h1>
          Recupera qualsiasi chat <span>in pochi secondi.</span>
        </h1>

        <p className="hero-subtitle">
          SlashRecap trasforma conversazioni WhatsApp lunghe e confuse in recap
          chiari, ordinati e facili da leggere.
        </p>

        <div className="hero-actions">
          <Link to="/recap" className="primary-button">
            Prova /recap
          </Link>

          <Link to="/come-funziona" className="ghost-button">
            Come funziona
          </Link>
        </div>
      </div>

      <section className="preview-section">
        <div className="preview-card">
          <p className="eyebrow">Il problema</p>
          <h2>Hai 187 messaggi non letti?</h2>
          <p>
            Invece di scorrere tutta la conversazione, incolli la chat e ottieni
            subito un recap ordinato con le cose importanti.
          </p>
        </div>

        <div className="preview-card green-card">
          <p className="eyebrow">La soluzione</p>
          <h2>/recap</h2>
          <p>
            Un comando semplice per trasformare caos, notifiche e messaggi
            arretrati in una sintesi leggibile.
          </p>
        </div>
      </section>
    </section>
  );
};

export default Homepage;
