export type ParsedVideo =
  | { kind: "youtube"; id: string; shorts: boolean }
  | { kind: "vimeo"; id: string }
  | { kind: "instagram"; embedUrl: string }
  | { kind: "file"; url: string }
  | { kind: "unknown"; url: string };

// Opções de reprodução configuráveis por bloco de vídeo.
export type VideoOpcoes = {
  autoplay?: boolean;
  controles?: boolean; // mostrar botões de play/pause/barra
  mudo?: boolean; // autoplay em navegadores modernos exige mudo
  loop?: boolean;
  nativo?: boolean; // "modo cinema": esconde marca/controles do YouTube
};

const YT_ID = "([A-Za-z0-9_-]{11})";
const YT_PATTERNS: { re: RegExp; shorts: boolean }[] = [
  { re: new RegExp(`youtube\\.com/shorts/${YT_ID}`), shorts: true },
  { re: new RegExp(`youtube\\.com/watch\\?.*v=${YT_ID}`), shorts: false },
  { re: new RegExp(`youtu\\.be/${YT_ID}`), shorts: false },
  { re: new RegExp(`youtube\\.com/embed/${YT_ID}`), shorts: false },
  { re: new RegExp(`youtube\\.com/live/${YT_ID}`), shorts: false },
];

const VIMEO_RE = /vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d{6,})/;
const INSTAGRAM_RE = /instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/;
const FILE_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

export function parseVideoUrl(url: string): ParsedVideo {
  for (const { re, shorts } of YT_PATTERNS) {
    const match = url.match(re);
    if (match) return { kind: "youtube", id: match[1], shorts };
  }

  const vimeo = url.match(VIMEO_RE);
  if (vimeo) return { kind: "vimeo", id: vimeo[1] };

  const insta = url.match(INSTAGRAM_RE);
  if (insta) {
    const tipo = insta[1] === "reels" ? "reel" : insta[1];
    return { kind: "instagram", embedUrl: `https://www.instagram.com/${tipo}/${insta[2]}/embed/` };
  }

  if (FILE_RE.test(url)) return { kind: "file", url };

  // Uploads do Supabase Storage não têm extensão garantida na URL
  if (url.includes("/storage/v1/object/public/")) return { kind: "file", url };

  return { kind: "unknown", url };
}

// maxresdefault é a capa em alta (1280x720). Nem todo vídeo tem, então o
// player faz fallback para hqdefault via onError.
export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

export function youtubeThumbFallback(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

// `jsapi` só é ligado quando precisamos controlar o player por postMessage
// (botão de ativar som). Nesse caso o YouTube exige também o parâmetro
// `origin` — sem ele o embed responde "vídeo não disponível".
export function youtubeEmbedUrl(
  id: string,
  opcoes?: VideoOpcoes & { jsapi?: boolean; origin?: string },
) {
  const p = new URLSearchParams({ playsinline: "1", rel: "0" });
  if (opcoes?.jsapi) {
    p.set("enablejsapi", "1");
    if (opcoes.origin) p.set("origin", opcoes.origin);
  }
  p.set("autoplay", opcoes?.autoplay ? "1" : "0");
  // Autoplay só arranca mudo; se o usuário quer som, o overlay reativa depois.
  const iniciarMudo = opcoes?.mudo || Boolean(opcoes?.autoplay);
  if (iniciarMudo) p.set("mute", "1");
  // Modo nativo ("cinema"): sem controles, sem marca, sem sugestões, sem teclado.
  const semControles = opcoes?.nativo || opcoes?.controles === false;
  p.set("controls", semControles ? "0" : "1");
  if (opcoes?.nativo) {
    p.set("modestbranding", "1");
    p.set("iv_load_policy", "3"); // sem anotações
    p.set("disablekb", "1");
    p.set("fs", "0"); // sem botão de tela cheia
  }
  if (opcoes?.loop) {
    p.set("loop", "1");
    p.set("playlist", id); // o YouTube exige playlist=id para o loop funcionar
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
}

export function vimeoEmbedUrl(id: string, opcoes?: VideoOpcoes) {
  const p = new URLSearchParams();
  // Modo nativo no Vimeo = background: limpo, sem controles nem marca.
  if (opcoes?.nativo) {
    p.set("background", "1");
    p.set("autoplay", "1");
    p.set("loop", opcoes?.loop ? "1" : "0");
    return `https://player.vimeo.com/video/${id}?${p.toString()}`;
  }
  if (opcoes?.autoplay) {
    p.set("autoplay", "1");
    p.set("muted", "1"); // autoplay exige mudo
  } else if (opcoes?.mudo) {
    p.set("muted", "1");
  }
  if (opcoes?.loop) p.set("loop", "1");
  if (opcoes?.controles === false) p.set("controls", "0");
  return `https://player.vimeo.com/video/${id}?${p.toString()}`;
}

// Shorts e reels do Instagram são exibidos em formato vertical (9:16)
export function isVerticalVideo(url: string) {
  const parsed = parseVideoUrl(url);
  return (parsed.kind === "youtube" && parsed.shorts) || parsed.kind === "instagram";
}
