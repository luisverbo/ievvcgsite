import Reveal from "./Reveal";
import Countdown from "./Countdown";

export default function Ingresso() {
  return (
    <Reveal id="ingresso">
      <div className="wrap">
        <div className="board">
          <div className="eyebrow" style={{ justifyContent: "center" }}>
            Garanta o seu
          </div>
          <Countdown target="2026-07-17T18:00:00-03:00" />
          <div className="price">
            R$ 12,50 <small>/ por dia</small>
          </div>
          <div className="cta-row">
            <a className="btn btn-primary" href="#">
              Comprar ingresso online
            </a>
          </div>
          <p style={{ color: "var(--color-cream-dim)", fontSize: "12.5px", marginTop: 14 }}>
            Crianças até 3 anos não pagam · Compre antes e evite filas na bilheteria
          </p>
        </div>
      </div>
    </Reveal>
  );
}
