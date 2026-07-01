export type ParsedVideo =
  | { kind: "youtube"; id: string; shorts: boolean }
  | { kind: "instagram"; embedUrl: string }
  | { kind: "file"; url: string }
  | { kind: "unknown"; url: string };

const YT_ID = "([A-Za-z0-9_-]{11})";
const YT_PATTERNS: { re: RegExp; shorts: boolean }[] = [
  { re: new RegExp(`youtube\\.com/shorts/${YT_ID}`), shorts: true },
  { re: new RegExp(`youtube\\.com/watch\\?.*v=${YT_ID}`), shorts: false },
  { re: new RegExp(`youtu\\.be/${YT_ID}`), shorts: false },
  { re: new RegExp(`youtube\\.com/embed/${YT_ID}`), shorts: false },
  { re: new RegExp(`youtube\\.com/live/${YT_ID}`), shorts: false },
];

const INSTAGRAM_RE = /instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/;
const FILE_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

export function parseVideoUrl(url: string): ParsedVideo {
  for (const { re, shorts } of YT_PATTERNS) {
    const match = url.match(re);
    if (match) return { kind: "youtube", id: match[1], shorts };
  }

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

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
}

// Shorts e reels do Instagram são exibidos em formato vertical (9:16)
export function isVerticalVideo(url: string) {
  const parsed = parseVideoUrl(url);
  return (parsed.kind === "youtube" && parsed.shorts) || parsed.kind === "instagram";
}
