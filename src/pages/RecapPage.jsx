import RecapTool from "../components/RecapTool";
import "../styles/recap-tool.css";

const RecapPage = () => {
  return (
    <section className="recap-page">
      <div className="recap-page-hero">
        <p className="eyebrow">SlashRecap tool</p>

        <h1>
          Incolla la chat. <span>Ottieni il recap.</span>
        </h1>

        <p>
          Copia una conversazione WhatsApp, incollala nel box e genera un
          riepilogo leggibile in pochi secondi.
        </p>
      </div>

      <RecapTool />
    </section>
  );
};

export default RecapPage;
