import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

const Dashboard = () => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <section className="dashboard-page">
        <p className="dashboard-loading">Caricamento dashboard...</p>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <p className="eyebrow">Dashboard</p>

        <h1>Ciao, {user.displayName || user.email}</h1>

        <p>
          Da qui puoi creare nuovi recap, consultare lo storico e preparare le
          prossime funzioni premium della piattaforma.
        </p>

        <div className="dashboard-actions">
          <Link to="/recap" className="dashboard-primary">
            Genera nuovo /recap
          </Link>

          <Link to="/history" className="dashboard-secondary">
            Vedi storico
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span>Fase attuale</span>
          <h2>Login + storico</h2>
          <p>
            I recap generati da utenti registrati vengono salvati in Firestore.
          </p>
        </article>

        <article className="dashboard-card">
          <span>Prossimo step</span>
          <h2>Piani e limiti</h2>
          <p>
            Dopo questa fase potrai aggiungere free plan, limiti giornalieri e
            dashboard usage.
          </p>
        </article>

        <article className="dashboard-card">
          <span>Account</span>
          <h2>{user.email}</h2>
          <p>Utente autenticato con Firebase Auth.</p>
        </article>
      </div>
    </section>
  );
};

export default Dashboard;
