"use client";

import { useState } from "react";
import { parseVideoUrl, youtubeEmbedUrl, youtubeThumb } from "@/lib/video";

// Player unificado: arquivos (Supabase Storage) viram <video>, links do
// YouTube viram thumbnail + play que carrega o iframe só ao clicar (leve
// para mobile), Instagram vira embed direto.
export default function VideoPlayer({
  url,
  poster,
  title,
}: {
  url: string;
  poster?: string | null;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const video = parseVideoUrl(url);

  if (video.kind === "file") {
    return (
      <video
        className="video-el"
        src={video.url}
        controls
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
      />
    );
  }

  if (video.kind === "youtube") {
    if (!playing) {
      const thumb = poster ?? youtubeThumb(video.id);
      return (
        <button
          type="button"
          className="video-thumb"
          style={{ backgroundImage: `url(${thumb})` }}
          onClick={() => setPlaying(true)}
          aria-label={`Assistir vídeo: ${title}`}
        >
          <span className="play" aria-hidden="true" />
        </button>
      );
    }
    return (
      <iframe
        className="video-el"
        src={youtubeEmbedUrl(video.id)}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
