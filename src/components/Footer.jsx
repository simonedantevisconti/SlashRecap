import "../styles/footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">
      <p className="footer-main">
        SlashRecap © {new Date().getFullYear()} — Recupera qualsiasi chat in
        pochi secondi.
      </p>

      <a
        href="https://syndycore.netlify.app/"
        target="_blank"
        rel="noreferrer"
        className="footer-powered"
      >
        <span>Powered by</span>
        <img src="/img-plain.png" alt="Syndycore logo" />
        <strong>Syndycore</strong>
      </a>
    </footer>
  );
};

export default Footer;
