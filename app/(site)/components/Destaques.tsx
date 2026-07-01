import Reveal from "./Reveal";

export default function Destaques() {
  return (
    <Reveal>
      <div className="wrap">
        <div className="feat-grid">
          <div className="feat feat-kids">
            <span className="ic">🎠</span>
            <h3>Área Kids</h3>
            <p>
              Pescaria, ônibus da alegria e muitos brinquedos pra criançada gastar
              energia com segurança.
            </p>
          </div>
          <div className="feat feat-bazar">
            <span className="ic">🛍️</span>
            <h3>Bazar & Sorteios</h3>
            <p>
              Roupas em bom estado no precinho e prêmios incríveis sorteados durante
              toda a festa.
            </p>
          </div>
          <div className="feat feat-pass">
            <span className="ic">🛂</span>
            <h3>O Passaporte</h3>
            <p>
              Colecione 8 selos provando as comidas, preencha e concorra a prêmios na
              Casa de Câmbio.
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
