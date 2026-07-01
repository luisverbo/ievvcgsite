import Reveal from "./Reveal";
import VideoPlayer from "./VideoPlayer";
import type { Artista } from "@/lib/types";
import { artistaGradient } from "@/lib/fallback-data";
import { isVerticalVideo } from "@/lib/video";
import { txt } from "@/lib/textos";

export default function Lineup({
  artistas,
  textos,
}: {
  artistas: Artista[];
  textos: Record<string, string>;
}) {
  return (
    <Reveal id="lineup">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{txt(textos, "lineup_eyebrow")}</div>
          <h2>{txt(textos, "lineup_titulo")}</h2>
          <p>{txt(textos, "lineup_desc")}</p>
        </div>

        <div className="lineup">
          {artistas.map((artista, i) => {
            const vertical = artista.video_url ? isVerticalVideo(artista.video_url) : false;
            return (
              <article className="artist" key={artista.id}>
                <div className={`artist-media${vertical ? " vertical" : ""}`}>
                  {artista.video_url ? (
                    <>
                      <VideoPlayer
                        url={artista.video_url}
                        poster={artista.foto_url}
                        title={artista.nome}
                      />
                      <div className="flag">{artista.pais}</div>
                      <div className="videolabel">VÍDEO</div>
                    </>
                  ) : artista.foto_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="ph"
                        src={artista.foto_url}
                        alt={artista.nome}
                        style={{ objectFit: "cover", width: "100%", height: "100%" }}
                      />
                      <div className="scrim" />
                      <div className="flag">{artista.pais}</div>
                    </>
                  ) : (
                    <>
                      <div className="ph" style={{ background: artistaGradient(i) }} />
                      <div className="scrim" />
                      <div className="flag">{artista.pais}</div>
                    </>
                  )}
                </div>
                <div className="artist-body">
                  <h3>{artista.nome}</h3>
                  <div className="role">{artista.estilo}</div>
                  <p>{artista.descricao}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}
