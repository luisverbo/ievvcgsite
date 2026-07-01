import Reveal from "./Reveal";
import type { Artista } from "@/lib/types";
import { artistaGradient } from "@/lib/fallback-data";

export default function Lineup({ artistas }: { artistas: Artista[] }) {
  return (
    <Reveal id="lineup">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Atrações musicais</div>
          <h2>Line-up 2026</h2>
          <p>
            Os artistas confirmados para os dois dias de festa. Toque no play para
            assistir ao vídeo de cada um.
          </p>
        </div>

        <div className="lineup">
          {artistas.map((artista, i) => (
            <article className="artist" key={artista.id}>
              <div className="artist-media">
                {artista.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="ph"
                    src={artista.foto_url}
                    alt={artista.nome}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : (
                  <div className="ph" style={{ background: artistaGradient(i) }} />
                )}
                <div className="scrim" />
                <div className="flag">{artista.pais}</div>
                <div className="videolabel">VÍDEO</div>
                <div className="play-sm" role="img" aria-label="Assistir vídeo" />
              </div>
              <div className="artist-body">
                <h3>{artista.nome}</h3>
                <div className="role">{artista.estilo}</div>
                <p>{artista.descricao}</p>
                <a
                  className="artist-watch"
                  href={artista.video_url ?? "#"}
                  target={artista.video_url ? "_blank" : undefined}
                  rel={artista.video_url ? "noreferrer" : undefined}
                >
                  ▶ Assistir vídeo
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
