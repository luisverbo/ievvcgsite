import StringLights from "./StringLights";
import VideoPlayer from "./VideoPlayer";
import type { ConfigEvento } from "@/lib/types";
import { formatHeroDates, formatPrice } from "@/lib/format";
import { isVerticalVideo } from "@/lib/video";
import { txt } from "@/lib/textos";
import { multiline } from "@/lib/multiline";

export default function Hero({ config }: { config: ConfigEvento }) {
  const { day1, day2, month } = formatHeroDates(config.data_evento);
  const videoVertical = config.video_hero_url ? isVerticalVideo(config.video_hero_url) : false;
  const t = config.textos;

  return (
    <section className="hero">
      <StringLights />
      <div className="wrap hero-inner">
        <div className="badge">{txt(t, "hero_badge")}</div>
        <h1>
          {multiline(config.titulo_hero)}
          <span className="line2">{txt(t, "hero_metricas")}</span>
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
            <b>{txt(t, "hero_horario")}</b>
            <span>{txt(t, "hero_horario_label")}</span>
          </div>
          <div>
            <b>{formatPrice(config.preco_ingresso)}</b>
            <span>ingresso</span>
          </div>
        </div>

        <div className={`hero-video${videoVertical ? " vertical" : ""}`}>
          {config.video_hero_url ? (
            <VideoPlayer url={config.video_hero_url} title="Vídeo de abertura" />
          ) : (
            <div className="poster">
              <div className="play" aria-hidden="true" />
              <span className="poster-label">▶ vídeo de abertura</span>
            </div>
          )}
        </div>

        <div className="cta-row">
          <a className="btn btn-primary" href="#ingresso" data-fbq="ClicouGarantirIngresso">
            {txt(t, "hero_cta_garantir")}
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
