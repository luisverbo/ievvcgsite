import Reveal from "./Reveal";
import Countdown from "./Countdown";
import type { ConfigEvento } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { txt } from "@/lib/textos";

export default function Ingresso({ config }: { config: ConfigEvento }) {
  const t = config.textos;

  return (
    <Reveal id="ingresso">
      <div className="wrap">
        <div className="board">
          <div className="eyebrow" style={{ justifyContent: "center" }}>
            {txt(t, "ingresso_eyebrow")}
          </div>
          <Countdown target={config.data_evento} />
          <div className="price">
            {formatPrice(config.preco_ingresso)} <small>{txt(t, "ingresso_preco_sufixo")}</small>
          </div>
          <div className="cta-row">
            <a
              className="btn btn-primary"
              href={config.link_compra ?? "#"}
              data-fbq="ClicouComprarIngresso"
              {...(config.link_compra ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {txt(t, "ingresso_cta")}
            </a>
          </div>
          <p style={{ color: "var(--color-cream-dim)", fontSize: "12.5px", marginTop: 14 }}>
            {txt(t, "ingresso_aviso")}
          </p>
        </div>
      </div>
    </Reveal>
  );
}
