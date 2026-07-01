import Reveal from "./Reveal";
import Countdown from "./Countdown";
import type { ConfigEvento } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function Ingresso({ config }: { config: ConfigEvento }) {
  return (
    <Reveal id="ingresso">
      <div className="wrap">
        <div className="board">
          <div className="eyebrow" style={{ justifyContent: "center" }}>
            Garanta o seu
          </div>
          <Countdown target={config.data_evento} />
          <div className="price">
            {formatPrice(config.preco_ingresso)} <small>/ por dia</small>
          </div>
          <div className="cta-row">
            <a className="btn btn-primary" href={config.link_compra ?? "#"}>
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
