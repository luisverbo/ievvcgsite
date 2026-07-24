"use client";

import { useRef, useState } from "react";
import {
  parseVideoUrl,
  youtubeEmbedUrl,
  youtubeThumb,
  youtubeThumbFallback,
  vimeoEmbedUrl,
  type VideoOpcoes,
} from "@/lib/video";

// Player unificado: arquivos (Storage) viram <video>; YouTube/Vimeo viram
// thumbnail + play (leve p/ mobile) ou iframe direto no autoplay/cinema;
// Instagram vira embed. Modo "nativo" esconde a marca do YouTube. Autoplay
// com som: começa mudo e mostra um botão de "ativar som" (trava do navegador).

/* eslint-disable @next/next/no-img-element */

function ytPost(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}
function vimeoPost(iframe: HTMLIFrameElement | null, method: string, value?: unknown) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ method, value }), "*");
}

// Botão flutuante "ativar som" para autoplay que o usuário quer com áudio.
function BotaoSom({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="pp-som" onClick={onClick} aria-label="Ativar o som do vídeo">
      <span className="pp-som-ico" aria-hidden="true">
        🔊
      </span>
      Clique para ativar o som
    </button>
  );
}

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
  const video = parseVideoUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Autoplay direto (sem thumbnail) quando toca sozinho ou é modo cinema.
  const [playing, setPlaying] = useState(Boolean(opcoes?.autoplay || opcoes?.nativo));
  // Quer som mas o autoplay obriga a começar mudo → mostra o botão de som.
  const querSom = Boolean(opcoes?.autoplay && !opcoes?.mudo);
  const [precisaSom, setPrecisaSom] = useState(querSom);

  // Efeito "VTurb": ao ativar o som, o vídeo VOLTA AO INÍCIO com áudio —
  // a pessoa assiste tudo desde o começo, agora ouvindo.
  function ativarSomYoutube() {
    ytPost(iframeRef.current, "seekTo", [0, true]);
    ytPost(iframeRef.current, "unMute");
    ytPost(iframeRef.current, "playVideo");
    setPrecisaSom(false);
  }
  function ativarSomVimeo() {
    vimeoPost(iframeRef.current, "setCurrentTime", 0);
    vimeoPost(iframeRef.current, "setMuted", false);
    vimeoPost(iframeRef.current, "setVolume", 1);
    vimeoPost(iframeRef.current, "play");
    setPrecisaSom(false);
  }
  function ativarSomFile() {
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.muted = false;
      v.play().catch(() => {});
    }
    setPrecisaSom(false);
  }

  /* ---------------------------------------------------------------- arquivo */
  if (video.kind === "file") {
    const autoMudo = opcoes?.mudo ?? Boolean(opcoes?.autoplay);
    return (
      <>
        <video
          ref={videoRef}
          className="video-el"
          src={video.url}
          controls={!opcoes?.nativo && opcoes?.controles !== false}
          autoPlay={opcoes?.autoplay}
          muted={autoMudo}
          loop={opcoes?.loop}
          playsInline
          preload="metadata"
          poster={poster ?? undefined}
        />
        {precisaSom && <BotaoSom onClick={ativarSomFile} />}
      </>
    );
  }

  /* ---------------------------------------------------------------- youtube */
  if (video.kind === "youtube") {
    if (!playing) {
      return (
        <button
          type="button"
          className="video-thumb"
          onClick={() => setPlaying(true)}
          aria-label={`Assistir vídeo: ${title}`}
        >
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
      <>
        <iframe
          ref={iframeRef}
          className="video-el"
          src={youtubeEmbedUrl(video.id, { ...opcoes, autoplay: true })}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        {/* No modo nativo, uma camada transparente bloqueia cliques na marca do YouTube */}
        {opcoes?.nativo && !precisaSom && <span className="pp-video-capa" aria-hidden="true" />}
        {precisaSom && <BotaoSom onClick={ativarSomYoutube} />}
      </>
    );
  }

  /* ------------------------------------------------------------------ vimeo */
  if (video.kind === "vimeo") {
    if (!playing) {
      return (
        <button
          type="button"
          className="video-thumb"
          onClick={() => setPlaying(true)}
          aria-label={`Assistir vídeo: ${title}`}
        >
          {poster && <img className="video-thumb-img" src={poster} alt="" />}
          <span className="play" aria-hidden="true" />
        </button>
      );
    }
    return (
      <>
        <iframe
          ref={iframeRef}
          className="video-el"
          src={vimeoEmbedUrl(video.id, { ...opcoes, autoplay: true })}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
        {precisaSom && !opcoes?.nativo && <BotaoSom onClick={ativarSomVimeo} />}
      </>
    );
  }

  /* -------------------------------------------------------------- instagram */
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
