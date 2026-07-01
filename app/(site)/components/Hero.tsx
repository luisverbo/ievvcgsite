import StringLights from "./StringLights";

export default function Hero() {
  return (
    <section className="hero">
      <StringLights />
      <div className="wrap hero-inner">
        <div className="badge">
          🌎 11ª edição · <b>Igreja Verbo da Vida CG</b>
        </div>
        <h1>
          FESTA DAS
          <br />
          NAÇÕES
          <span className="line2">6 continentes · 16 países · 2 dias de festa</span>
        </h1>
        <p className="hero-sub">
          Uma viagem gastronômica e musical ao redor do mundo — comida típica, shows
          gospel ao vivo, área kids e bazar.
        </p>

        <div className="hero-meta">
          <div>
            <b>17 & 18</b>
            <span>julho</span>
          </div>
          <div>
            <b>18h—00h</b>
            <span>dois dias</span>
          </div>
          <div>
            <b>R$ 12,50</b>
            <span>ingresso</span>
          </div>
        </div>

        <div className="hero-video">
          <div className="poster">
            <div className="play" aria-hidden="true" />
            <span className="poster-label">▶ vídeo de abertura — 0:42</span>
          </div>
        </div>

        <div className="cta-row">
          <a className="btn btn-primary" href="#ingresso">
            Garantir ingresso
          </a>
          <a className="btn btn-ghost" href="#lineup">
            Ver line-up
          </a>
        </div>
      </div>
    </section>
  );
}
