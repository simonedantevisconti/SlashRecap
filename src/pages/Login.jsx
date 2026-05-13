import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

const Login = () => {
  const navigate = useNavigate();

  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    authLoading,
    isLoggedIn,
  } = useAuth();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!authLoading && isLoggedIn) {
    navigate("/dashboard");
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Inserisci email e password.");
      return;
    }

    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }

      navigate("/dashboard");
    } catch (error) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        setError("Questa email è già registrata. Prova ad accedere.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Credenziali non valide. Controlla email e password.");
      } else {
        setError("Errore di autenticazione. Riprova.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setError("");

      await loginWithGoogle();

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      setError("Accesso con Google non riuscito. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">SlashRecap account</p>

        <h1>{mode === "login" ? "Accedi" : "Crea account"}</h1>

        <p className="auth-intro">
          Salva i tuoi recap, ritrovali quando vuoi e continua a costruire la
          tua dashboard personale.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              placeholder="nome@email.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              placeholder="Minimo 6 caratteri"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="auth-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Attendi..."
              : mode === "login"
                ? "Accedi"
                : "Registrati"}
          </button>
        </form>

        <button
          type="button"
          className="auth-google"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          Continua con Google
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "Non hai un account? Registrati"
            : "Hai già un account? Accedi"}
        </button>

        <Link to="/recap" className="auth-back">
          Torna al tool /recap
        </Link>
      </div>
    </section>
  );
};

export default Login;
