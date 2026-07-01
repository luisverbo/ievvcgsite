import type { ConfigEvento } from "@/lib/types";
import { txt } from "@/lib/textos";

export default function Footer({ config }: { config: ConfigEvento }) {
  const contatos = [
    config.telefone && `Secretaria ${config.telefone}`,
    config.email,
  ].filter(Boolean);
  const desc = txt(config.textos, "footer_desc");

  return (
    <footer>
      <div className="wrap">
        {config.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.logo_url}
            alt="Festa das Nações"
            style={{ height: 44, width: "auto", justifySelf: "start" }}
          />
        ) : (
          <div className="logo">
            Festa das <span style={{ color: "var(--color-gold)" }}>Nações</span>
          </div>
        )}
        <p>
          {desc} — {config.endereco}.
        </p>
        <div className="social-row">
          {config.instagram_url && <a href={config.instagram_url}>Instagram</a>}
          {config.facebook_url && <a href={config.facebook_url}>Facebook</a>}
          {config.site_url && <a href={config.site_url}>Site oficial</a>}
        </div>
        <div className="fine">{contatos.join(" · ")}</div>
      </div>
    </footer>
  );
}
