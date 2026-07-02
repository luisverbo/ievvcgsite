import type { ConfigEvento } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function Header({ config }: { config: ConfigEvento }) {
  return (
    <header>
      <div className="header-inner">
        {config.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.logo_url}
            alt="Festa das Nações"
            style={{ height: 34, width: "auto", display: "block" }}
          />
        ) : (
          <div className="logo">
            Festa das <span>Nações</span>
          </div>
        )}
        <a className="cta-mini" href="#ingresso" data-fbq="ClicouIngressoTopo">
          Ingresso · {formatPrice(config.preco_ingresso)}
        </a>
      </div>
    </header>
  );
}
