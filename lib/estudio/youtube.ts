import "server-only";

/*
 * Garimpo no YouTube — API oficial Data v3, dentro da cota gratuita.
 *
 * A conta da cota (10.000 unidades/dia, de graça):
 *   search.list ......... 100 unidades  ← o caro
 *   videos.list ......... 1 unidade a cada 50 vídeos
 *   channels.list ....... 1 unidade a cada 50 canais
 * Uma pesquisa completa custa ~102 unidades → ~90 pesquisas por dia. Para
 * uma pessoa, é oceano.
 *
 * O score de outlier sem custo extra: channels.list devolve viewCount TOTAL
 * e videoCount do canal — média ≈ total/quantidade, por 1 unidade. Não
 * precisamos listar os vídeos do canal um a um.
 */

const BASE = "https://www.googleapis.com/youtube/v3";

export type AchadoYoutube = {
  video_id: string;
  url: string;
  titulo: string;
  canal: string;
  canal_id: string;
  views: number;
  likes: number | null;
  comentarios: number | null;
  publicado_em: string;
  duracao_s: number;
  canal_media_views: number | null;
  score_outlier: number | null;
  views_por_dia: number;
  thumbnail: string | null;
};

export type FiltrosGarimpo = {
  tema: string;
  minViews?: number;
  // Janela de publicação, em dias (ex.: 90 = últimos 3 meses).
  periodoDias?: number;
  // "curto" = shorts (até 60s); "qualquer" não filtra.
  duracao?: "curto" | "qualquer";
  maxResultados?: number;
};

function chave(): string {
  const k = process.env.YOUTUBE_API_KEY?.trim();
  if (!k) {
    throw new Error(
      "Falta YOUTUBE_API_KEY na Vercel. Crie em console.cloud.google.com → APIs → YouTube Data API v3 → credencial de chave de API.",
    );
  }
  return k;
}

async function chamarApi<T>(recurso: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}/${recurso}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", chave());
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    if (res.status === 403 && corpo.includes("quota")) {
      throw new Error("A cota diária gratuita do YouTube acabou — volta à meia-noite (horário do Pacífico).");
    }
    throw new Error(`YouTube respondeu ${res.status}: ${corpo.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// "PT1M32S" → 92
function duracaoEmSegundos(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? "");
  if (!m) return 0;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

type ItemBusca = { id: { videoId: string } };
type ItemVideo = {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails?: { high?: { url: string }; medium?: { url: string } };
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
};
type ItemCanal = { id: string; statistics?: { viewCount?: string; videoCount?: string } };

export async function garimparYoutube(f: FiltrosGarimpo): Promise<AchadoYoutube[]> {
  const publicadoDepois = f.periodoDias
    ? new Date(Date.now() - f.periodoDias * 86_400_000).toISOString()
    : undefined;

  // 1. A busca (as 100 unidades). Ordenar por viewCount já entrega os que
  //    estouraram; o refinamento fino (score) vem depois, de graça.
  const busca = await chamarApi<{ items: ItemBusca[] }>("search", {
    part: "id",
    q: f.tema,
    type: "video",
    order: "viewCount",
    maxResults: String(Math.min(50, Math.max(5, f.maxResultados ?? 30))),
    relevanceLanguage: "pt",
    regionCode: "BR",
    ...(publicadoDepois ? { publishedAfter: publicadoDepois } : {}),
    ...(f.duracao === "curto" ? { videoDuration: "short" } : {}),
  });
  const ids = busca.items.map((i) => i.id.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  // 2. Detalhes dos vídeos (1 unidade).
  const videos = await chamarApi<{ items: ItemVideo[] }>("videos", {
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
  });

  // 3. Estatísticas dos canais (1 unidade) — a matéria-prima do score.
  const canais = [...new Set(videos.items.map((v) => v.snippet.channelId))];
  const canaisResp = await chamarApi<{ items: ItemCanal[] }>("channels", {
    part: "statistics",
    id: canais.join(","),
  });
  const mediaPorCanal = new Map<string, number>();
  for (const c of canaisResp.items) {
    const total = Number(c.statistics?.viewCount ?? 0);
    const qtd = Number(c.statistics?.videoCount ?? 0);
    if (qtd > 0) mediaPorCanal.set(c.id, total / qtd);
  }

  const saida: AchadoYoutube[] = [];
  for (const v of videos.items) {
    const views = Number(v.statistics?.viewCount ?? 0);
    if (f.minViews && views < f.minViews) continue;

    const media = mediaPorCanal.get(v.snippet.channelId) ?? null;
    const dias = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / 86_400_000);

    saida.push({
      video_id: v.id,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      titulo: v.snippet.title,
      canal: v.snippet.channelTitle,
      canal_id: v.snippet.channelId,
      views,
      likes: v.statistics?.likeCount ? Number(v.statistics.likeCount) : null,
      comentarios: v.statistics?.commentCount ? Number(v.statistics.commentCount) : null,
      publicado_em: v.snippet.publishedAt,
      duracao_s: duracaoEmSegundos(v.contentDetails?.duration ?? ""),
      canal_media_views: media,
      score_outlier: media && media > 0 ? Math.round((views / media) * 10) / 10 : null,
      views_por_dia: Math.round(views / dias),
      thumbnail: v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.medium?.url ?? null,
    });
  }

  // O que interessa em cima: quem mais estourou EM RELAÇÃO ao próprio canal.
  return saida.sort((a, b) => (b.score_outlier ?? 0) - (a.score_outlier ?? 0));
}

/*
 * Transcrição — melhor esforço, sem biblioteca.
 *
 * A API oficial só dá legenda de vídeo SEU; para vídeo alheio, o caminho que
 * existe é o mesmo do player: a página watch expõe as trilhas de legenda
 * (inclusive as automáticas) e cada trilha tem uma URL de texto puro. É área
 * cinzenta de ToS e pode quebrar sem aviso — por isso TODA falha aqui devolve
 * null e a dissecação segue só com título + métricas (o plano B combinado).
 */
export async function transcricaoDoYoutube(videoId: string): Promise<string | null> {
  try {
    const pagina = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!pagina.ok) return null;
    const html = await pagina.text();

    const m = /"captionTracks":(\[.*?\])/.exec(html);
    if (!m) return null;
    const trilhas = JSON.parse(m[1]) as { baseUrl: string; languageCode: string }[];
    const trilha =
      trilhas.find((t) => t.languageCode?.startsWith("pt")) ??
      trilhas.find((t) => t.languageCode?.startsWith("en")) ??
      trilhas[0];
    if (!trilha?.baseUrl) return null;

    const legendas = await fetch(`${trilha.baseUrl.replace(/\\u0026/g, "&")}&fmt=json3`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!legendas.ok) return null;
    const dados = (await legendas.json()) as {
      events?: { segs?: { utf8?: string }[] }[];
    };
    const texto = (dados.events ?? [])
      .flatMap((e) => e.segs ?? [])
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return texto.length > 40 ? texto.slice(0, 12_000) : null;
  } catch {
    return null;
  }
}

/*
 * TikTok, o caminho gratuito e oficial que existe: o oEmbed público devolve
 * título e autor de uma URL colada na mão. Transcrição, quando o dono quiser,
 * ele cola no campo — o resto da dissecação funciona igual.
 */
export async function oembedTiktok(
  url: string,
): Promise<{ titulo: string; canal: string; thumbnail: string | null } | null> {
  try {
    const u = new URL(url);
    if (!/(^|\.)tiktok\.com$/.test(u.hostname)) return null;
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
    if (!d.title && !d.author_name) return null;
    return {
      titulo: (d.title ?? "(sem título)").slice(0, 300),
      canal: d.author_name ?? "?",
      thumbnail: d.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}
