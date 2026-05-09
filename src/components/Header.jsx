import { Link, NavLink } from "react-router-dom";
import "../styles/header.css";

const Header = () => {
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
      </nav>
    </header>
  );
};

export default Header;
