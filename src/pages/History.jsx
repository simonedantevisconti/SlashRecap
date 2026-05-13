import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { deleteUserRecap, getUserRecaps } from "../services/historyService";
import "../styles/history.css";

const History = () => {
  const { user, authLoading } = useAuth();

  const [recaps, setRecaps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRecaps = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError("");

      const data = await getUserRecaps(user.uid);

      setRecaps(data);
    } catch (error) {
      console.error(error);
      setError("Non sono riuscito a caricare lo storico.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRecaps();
    }
  }, [user]);

  const handleDelete = async (recapId) => {
    if (!window.confirm("Vuoi eliminare questo recap?")) return;

    try {
      await deleteUserRecap(user.uid, recapId);
      setRecaps((current) => current.filter((recap) => recap.id !== recapId));
    } catch (error) {
      console.error(error);
      setError("Non sono riuscito a eliminare il recap.");
    }
  };

  if (authLoading) {
    return (
      <section className="history-page">
        <p className="history-loading">Caricamento...</p>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="history-page">
      <div className="history-heading">
        <div>
          <p className="eyebrow">Storico</p>
          <h1>I tuoi recap</h1>
          <p>Qui trovi tutti i recap salvati dal tuo account.</p>
        </div>

        <Link to="/recap" className="history-new">
          Nuovo /recap
        </Link>
      </div>

      {error && <p className="history-error">{error}</p>}

      {isLoading ? (
        <p className="history-loading">Carico i recap...</p>
      ) : recaps.length === 0 ? (
        <div className="history-empty">
          <img src="/resume-logo-plain.png" alt="" />
          <h2>Nessun recap salvato</h2>
          <p>Genera il tuo primo recap e lo vedrai comparire qui.</p>
          <Link to="/recap">Vai al tool</Link>
        </div>
      ) : (
        <div className="history-list">
          {recaps.map((recap) => (
            <article key={recap.id} className="history-card">
              <div className="history-card-top">
                <div>
                  <h2>{recap.title}</h2>
                  <p>
                    {recap.createdAt?.seconds
                      ? new Date(recap.createdAt.seconds * 1000).toLocaleString(
                          "it-IT",
                        )
                      : "Data non disponibile"}
                  </p>
                </div>

                <button type="button" onClick={() => handleDelete(recap.id)}>
                  Elimina
                </button>
              </div>

              <p className="history-short">{recap.short}</p>

              {recap.important?.length > 0 && (
                <div className="history-block">
                  <span>Punti importanti</span>
                  <ul>
                    {recap.important.slice(0, 3).map((item, index) => (
                      <li key={`important-${recap.id}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {recap.actions?.length > 0 && (
                <div className="history-block">
                  <span>Azioni</span>
                  <ul>
                    {recap.actions.slice(0, 3).map((item, index) => (
                      <li key={`action-${recap.id}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default History;
