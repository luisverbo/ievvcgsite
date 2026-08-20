/*
 * Transcrição do YouTube, buscada DAQUI — do computador do dono.
 *
 * Por que não no servidor: a Vercel sai por IP de datacenter, e o YouTube
 * responde a esses com tela de consentimento em vez do conteúdo. O sintoma
 * era enganoso — parecia "este vídeo não tem legenda" quando na verdade era
 * "este IP não recebe a página". Mesmo motivo que põe a busca do Maps aqui.
 *
 * Duas tentativas, da mais barata para a mais cara:
 *   1. fetch simples com cabeçalhos de navegador — resolve a maioria;
 *   2. navegador de verdade (Playwright), para quando o YouTube exige
 *      cookie de consentimento ou monta a página por JavaScript.
 *
 * Só legenda pública, que é o mesmo texto que o botão "transcrição" do
 * YouTube mostra a qualquer visitante. Nada de baixar áudio ou vídeo.
 */

import { chromium } from "playwright";

const CABECALHOS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  // O YouTube guarda o "já vi o aviso" num cookie; sem ele, a Europa e boa
  // parte dos datacenters recebem a tela de consentimento.
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

function trilhasDoHtml(html: string): { baseUrl: string; languageCode: string }[] {
  const m = /"captionTracks":(\[.*?\])/.exec(html);
  if (!m) return [];
  try {
    return JSON.parse(m[1].replace(/\\u0026/g, "&")) as {
      baseUrl: string;
      languageCode: string;
    }[];
  } catch {
    return [];
  }
}

async function textoDaTrilha(baseUrl: string): Promise<string | null> {
  const res = await fetch(`${baseUrl.replace(/\\u0026/g, "&")}&fmt=json3`, {
    headers: CABECALHOS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const dados = (await res.json()) as { events?: { segs?: { utf8?: string }[] }[] };
  const texto = (dados.events ?? [])
    .flatMap((e) => e.segs ?? [])
    .map((s) => s.utf8 ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return texto.length > 40 ? texto.slice(0, 12_000) : null;
}

function escolher(trilhas: { baseUrl: string; languageCode: string }[]) {
  return (
    trilhas.find((t) => t.languageCode?.startsWith("pt")) ??
    trilhas.find((t) => t.languageCode?.startsWith("en")) ??
    trilhas[0]
  );
}

export async function transcreverVideo(
  videoId: string,
  log: (m: string) => void,
): Promise<string | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // 1ª tentativa: buscar a página direto.
  try {
    const res = await fetch(url, { headers: CABECALHOS, signal: AbortSignal.timeout(20_000) });
    if (res.ok) {
      const trilha = escolher(trilhasDoHtml(await res.text()));
      if (trilha?.baseUrl) {
        const t = await textoDaTrilha(trilha.baseUrl);
        if (t) return t;
      }
    }
  } catch {
    // Sem drama: a segunda tentativa é justamente para isto.
  }

  // 2ª tentativa: navegador de verdade. Mais lento e mais pesado, mas passa
  // por consentimento e por página montada em JavaScript.
  log(`abrindo o navegador para a transcrição de ${videoId}…`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const ctx = await browser.newContext({ locale: "pt-BR", userAgent: CABECALHOS["User-Agent"] });
    await ctx.addCookies([
      { name: "CONSENT", value: "YES+cb", domain: ".youtube.com", path: "/" },
      { name: "SOCS", value: "CAI", domain: ".youtube.com", path: "/" },
    ]);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(2500);

    const trilha = escolher(trilhasDoHtml(await page.content()));
    if (!trilha?.baseUrl) return null;
    return await textoDaTrilha(trilha.baseUrl);
  } catch (e) {
    log(`transcrição falhou: ${(e as Error).message.slice(0, 120)}`);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}
