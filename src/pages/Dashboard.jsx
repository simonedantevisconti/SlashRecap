import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPlanLimits } from "../services/userService";
import "../styles/dashboard.css";

const Dashboard = () => {
  const { user, profile, authLoading } = useAuth();

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

  const plan = profile?.plan || "free";
  const limits = getPlanLimits(plan);

  const dailyCount = profile?.recapDailyCount || 0;
  const monthlyCount = profile?.recapMonthlyCount || 0;

  const dailyPercentage = Math.min(
    Math.round((dailyCount / limits.dailyLimit) * 100),
    100,
  );

  const monthlyPercentage = Math.min(
    Math.round((monthlyCount / limits.monthlyLimit) * 100),
    100,
  );

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <p className="eyebrow">Dashboard</p>

        <h1>Ciao, {user.displayName || user.email}</h1>

        <p>
          Qui puoi controllare il tuo piano, i recap disponibili e lo storico
          delle chat già riassunte.
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

      <div className="usage-panel">
        <div className="usage-heading">
          <div>
            <p className="eyebrow">Piano attuale</p>
            <h2>{limits.label}</h2>
          </div>

          <span className="plan-badge">{plan}</span>
        </div>

        <div className="usage-grid">
          <div className="usage-card">
            <div className="usage-card-top">
              <span>Recap oggi</span>
              <strong>
                {dailyCount}/{limits.dailyLimit}
              </strong>
            </div>

            <div className="usage-bar">
              <div style={{ width: `${dailyPercentage}%` }} />
            </div>

            <p>{limits.dailyLimit - dailyCount} recap disponibili oggi.</p>
          </div>

          <div className="usage-card">
            <div className="usage-card-top">
              <span>Recap mensili</span>
              <strong>
                {monthlyCount}/{limits.monthlyLimit}
              </strong>
            </div>

            <div className="usage-bar">
              <div style={{ width: `${monthlyPercentage}%` }} />
            </div>

            <p>
              {limits.monthlyLimit - monthlyCount} recap disponibili questo
              mese.
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span>Storico</span>
          <h2>Recap salvati</h2>
          <p>
            Ogni recap generato da utente registrato viene salvato nella tua
            area personale.
          </p>
        </article>

        <article className="dashboard-card">
          <span>Prossimo step</span>
          <h2>Pricing</h2>
          <p>
            Nel prossimo blocco possiamo creare pagina piani, upgrade visuale e
            struttura pronta per Stripe.
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
