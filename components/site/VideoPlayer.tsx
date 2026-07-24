"use client";

import { useState } from "react";
import {
  parseVideoUrl,
  youtubeEmbedUrl,
  youtubeThumb,
  youtubeThumbFallback,
  vimeoEmbedUrl,
  type VideoOpcoes,
} from "@/lib/video";

// Player unificado: arquivos (Supabase Storage) viram <video>, YouTube/Vimeo
// viram thumbnail + play que carrega o iframe só ao clicar (leve p/ mobile),
// Instagram vira embed direto. Com autoplay, o iframe já carrega tocando.
export default function VideoPlayer({
  url,
  poster,
  title,
  opcoes,
}: {
  url: string;
  poster?: string | null;
  title: string;
  opcoes?: VideoOpcoes;
}) {
  // Autoplay: o iframe começa já ativo (sem esperar clique).
  const [playing, setPlaying] = useState(Boolean(opcoes?.autoplay));
  const video = parseVideoUrl(url);

  if (video.kind === "file") {
    return (
      <video
        className="video-el"
        src={video.url}
        controls={opcoes?.controles !== false}
        autoPlay={opcoes?.autoplay}
        muted={opcoes?.mudo ?? opcoes?.autoplay} // autoplay em <video> exige mudo
        loop={opcoes?.loop}
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
      />
    );
  }

  if (video.kind === "youtube") {
    if (!playing) {
      return (
        <button
          type="button"
          className="video-thumb"
          onClick={() => setPlaying(true)}
          aria-label={`Assistir vídeo: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="video-thumb-img"
            src={poster ?? youtubeThumb(video.id)}
            alt=""
            onError={(e) => {
              const img = e.currentTarget;
              const fb = youtubeThumbFallback(video.id);
              if (img.src !== fb) img.src = fb;
            }}
          />
          <span className="play" aria-hidden="true" />
        </button>
      );
    }
    return (
      <iframe
        className="video-el"
        src={youtubeEmbedUrl(video.id, { ...opcoes, autoplay: true })}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (video.kind === "vimeo") {
    if (!playing) {
      return (
        <button
          type="button"
          className="video-thumb"
          onClick={() => setPlaying(true)}
          aria-label={`Assistir vídeo: ${title}`}
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="video-thumb-img" src={poster} alt="" />
          )}
          <span className="play" aria-hidden="true" />
        </button>
      );
    }
    return (
      <iframe
        className="video-el"
        src={vimeoEmbedUrl(video.id, { ...opcoes, autoplay: true })}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (video.kind === "instagram") {
    return (
      <iframe className="video-el" src={video.embedUrl} title={title} allowFullScreen scrolling="no" />
    );
  }

  return (
    <a className="video-thumb" href={url} target="_blank" rel="noreferrer">
      <span className="play" aria-hidden="true" />
    </a>
  );
}
