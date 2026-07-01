import StringLights from "./StringLights";
import type { ConfigEvento } from "@/lib/types";
import { formatHeroDates, formatPrice } from "@/lib/format";

export default function Hero({ config }: { config: ConfigEvento }) {
  const { day1, day2, month } = formatHeroDates(config.data_evento);

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
        <p className="hero-sub">{config.subtitulo_hero}</p>

        <div className="hero-meta">
          <div>
            <b>
              {day1} & {day2}
            </b>
            <span>{month}</span>
          </div>
          <div>
            <b>18h—00h</b>
            <span>dois dias</span>
          </div>
          <div>
            <b>{formatPrice(config.preco_ingresso)}</b>
            <span>ingresso</span>
          </div>
        </div>

        <div className="hero-video">
          {config.video_hero_url ? (
            <video src={config.video_hero_url} controls className="poster" />
          ) : (
            <div className="poster">
              <div className="play" aria-hidden="true" />
              <span className="poster-label">▶ vídeo de abertura — 0:42</span>
            </div>
          )}
        </div>

        <div className="cta-row">
          <a className="btn btn-primary" href="#ingresso">
            Garantir ingresso
          </a>
          {config.botao_lineup_visivel && (
            <a className="btn btn-ghost" href="#lineup">
              {config.botao_lineup_texto}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
