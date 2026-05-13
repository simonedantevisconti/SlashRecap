import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/header.css";

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <img
          src="/resume-logo.png"
          alt="Logo SlashRecap"
          className="brand-logo"
        />

        <div className="brand-copy">
          <span className="brand-name">SlashRecap</span>
          <span className="brand-command">/recap</span>
        </div>
      </Link>

      <nav className="header-nav">
        <NavLink to="/come-funziona">Come funziona</NavLink>
        <NavLink to="/recap" className="nav-cta">
          Prova /recap
        </NavLink>

        {user ? (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/history">Storico</NavLink>
            <button type="button" className="header-logout" onClick={logout}>
              Esci
            </button>
          </>
        ) : (
          <NavLink to="/login">Accedi</NavLink>
        )}
      </nav>
    </header>
  );
};

export default Header;
