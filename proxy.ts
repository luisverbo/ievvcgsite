import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Domínio raiz do produto (ex.: "paginapro.com.br"). Quando definido, sites
// publicados respondem em {slug}.paginapro.com.br via rewrite interno.
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase().trim();

/*
 * O endereço do PAINEL, tirado de NEXT_PUBLIC_APP_URL.
 *
 * Precisa ser uma variável que NÓS controlamos. Já usamos aqui a
 * VERCEL_PROJECT_PRODUCTION_URL e ela nos traiu: a Vercel preenche essa
 * variável com "o domínio de produção do projeto", e domínio de produção
 * passa a ser o CUSTOM DOMAIN assim que o primeiro é conectado. Ou seja, no
 * deploy seguinte o domínio do cliente entrava na lista de "hosts nossos" e o
 * visitante recebia a nossa landing page em vez do site dele.
 */
const HOST_PAINEL = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname.toLowerCase();
  } catch {
    return "";
  }
})();

/*
 * O domínio que abre DIRETO no Prospector (ex.: prospector.luismarketing.com.br).
 *
 * É o mesmo aplicativo — painel, login, checkout, tudo. A única diferença é a
 * porta de entrada: em vez da landing do criador de sites, quem digita o
 * domínio pelado cai na página de venda do Prospector.
 *
 * Um host só para o produto inteiro (e não "landing num domínio, painel em
 * outro") porque o cookie de sessão e o retorno da Stripe são por domínio:
 * separar quebra o login e joga fora a atribuição do anúncio no meio do
 * caminho para o caixa.
 */
const HOST_PROSPECTOR = (process.env.NEXT_PUBLIC_HOST_PROSPECTOR ?? "")
  .toLowerCase()
  .trim()
  .replace(/^https?:\/\//, "") // aceita colado com https:// por engano
  .replace(/\/.*$/, "")
  .split(":")[0];

/*
 * Os domínios próprios que moram DEBAIXO do nosso domínio raiz.
 *
 * O caso real: o dono aponta plugue.luismarketing.com.br para uma página de
 * IA. Para o proxy esse host é indistinguível de um site de blocos publicado
 * em {slug}.luismarketing.com.br — os dois são "alguma coisa + o nosso
 * domínio". Sem saber qual é qual, ele mandava TODOS para /s/{slug}, e a
 * página de IA nunca era alcançada: 404 sem pista nenhuma.
 *
 * Consultar o banco em todo request está fora de questão, então guardamos a
 * lista inteira — que é curta, só os domínios sob o NOSSO raiz — e a
 * recarregamos a cada cinco minutos. Na prática é uma consulta a cada cinco
 * minutos por instância, e o resto é decisão em memória.
 *
 * Falhou a consulta? Fica valendo o que já estava em mãos e tentamos de novo
 * em trinta segundos: um soluço de rede não pode derrubar site nenhum.
 */
const VALIDADE_MS = 5 * 60_000;
const VALIDADE_ERRO_MS = 30_000;
let cacheDominios: { ate: number; hosts: Set<string> } = { ate: 0, hosts: new Set() };
let buscaEmCurso: Promise<void> | null = null;

async function dominiosSobNossoRoot(): Promise<Set<string>> {
  if (!ROOT) return cacheDominios.hosts;
  if (Date.now() < cacheDominios.ate) return cacheDominios.hosts;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return cacheDominios.hosts;

  // Uma busca por vez: numa rajada de visitas, as outras esperam esta.
  buscaEmCurso ??= (async () => {
    try {
      const res = await fetch(
        `${url}/rest/v1/dominios?select=dominio&dominio=like.${encodeURIComponent(`*.${ROOT}`)}`,
        {
          headers: { apikey: chave, Authorization: `Bearer ${chave}` },
          cache: "no-store",
          signal: AbortSignal.timeout(2_500),
        },
      );
      if (!res.ok) throw new Error(String(res.status));
      const linhas = (await res.json()) as { dominio: string }[];
      cacheDominios = {
        ate: Date.now() + VALIDADE_MS,
        hosts: new Set(linhas.map((l) => l.dominio.toLowerCase())),
      };
    } catch {
      cacheDominios = { ...cacheDominios, ate: Date.now() + VALIDADE_ERRO_MS };
    } finally {
      buscaEmCurso = null;
    }
  })();

  await buscaEmCurso;
  return cacheDominios.hosts;
}

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  const ehProspector =
    Boolean(HOST_PROSPECTOR) && (host === HOST_PROSPECTOR || host === `www.${HOST_PROSPECTOR}`);

  /*
   * A porta de entrada do domínio do Prospector.
   *
   * `rewrite` e não `redirect`: o endereço continua sendo o domínio pelado na
   * barra — é ele que vai no anúncio, no cartão de visita e no WhatsApp.
   * O caminho /prospector segue existindo em todos os outros hosts, então
   * nenhum link antigo quebra.
   */
  if (ehProspector && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/prospector";
    return NextResponse.rewrite(url);
  }
  /*
   * Neste host a mesma página teria dois endereços (/ e /prospector), o que
   * racha a medição do pixel em dois. Manda para o canônico.
   */
  if (ehProspector && (pathname === "/prospector" || pathname === "/prospector/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  /*
   * A landing do teste grátis, no domínio do Prospector, atende em /teste —
   * é o link da campanha. Mesma lógica: rewrite para a rota interna, e o
   * caminho interno redireciona para o canônico, para não medir em dobro.
   */
  if (ehProspector && (pathname === "/teste" || pathname === "/teste/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/prospector/teste";
    return NextResponse.rewrite(url);
  }
  if (ehProspector && (pathname === "/prospector/teste" || pathname === "/prospector/teste/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/teste";
    return NextResponse.redirect(url);
  }

  /*
   * Este host é um subdomínio nosso — e, se for, é site de blocos (slug) ou
   * domínio próprio apontado para uma página de IA?
   *
   * A pergunta só é feita nos subdomínios; o domínio raiz, o painel e o
   * Prospector nem passam por aqui, e domínio de fora já segue outro caminho.
   */
  // O que vem antes do nosso domínio raiz ("loja" em loja.nossodominio.com.br).
  const prefixoDoHost = ROOT && host.endsWith(`.${ROOT}`) ? host.slice(0, -(ROOT.length + 1)) : "";
  const ehSubdominioNosso =
    Boolean(prefixoDoHost) &&
    !ehProspector && // o nosso domínio não é site de cliente
    prefixoDoHost !== "www" &&
    prefixoDoHost !== "app";

  const ehDominioProprio =
    ehSubdominioNosso && !pathname.startsWith("/_next")
      ? (await dominiosSobNossoRoot()).has(host)
      : false;

  // Subdomínio de cliente → reescreve para a rota interna /s/[site]
  if (
    ehSubdominioNosso &&
    !ehDominioProprio &&
    !pathname.startsWith("/s/") &&
    !pathname.startsWith("/dominio/") &&
    !pathname.startsWith("/_next")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/s/${prefixoDoHost}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  /*
   * Domínio próprio de cliente: qualquer host que não é nosso.
   *
   * O proxy não consulta banco (roda em todo request); ele só reescreve para
   * /dominio/[host], e é lá que o vínculo domínio → página é resolvido. Host
   * desconhecido termina em 404 na rota — sem custo aqui.
   */
  const nossosHosts = new Set(
    [
      ROOT,
      ROOT && `www.${ROOT}`,
      ROOT && `app.${ROOT}`,
      HOST_PAINEL,
      // Sem esta linha o nosso próprio domínio do Prospector seria tratado
      // como domínio de cliente e cairia em /dominio/… → 404.
      HOST_PROSPECTOR,
      HOST_PROSPECTOR && `www.${HOST_PROSPECTOR}`,
      "localhost",
      "127.0.0.1",
    ].filter(Boolean) as string[],
  );
  const ehNosso =
    !ehDominioProprio &&
    (nossosHosts.has(host) ||
      (ROOT ? host.endsWith(`.${ROOT}`) : false) ||
      host.endsWith(".vercel.app"));

  /*
   * /api fica de fora de propósito.
   *
   * O script de métricas da página manda a saída do visitante para
   * /api/pp-saida no domínio onde ele está — que é o domínio do cliente.
   * Reescrevendo isso para /dominio/..., o POST batia numa rota que só
   * responde GET e o tempo de permanência sumia de todo site com domínio
   * próprio.
   */
  if (
    host &&
    !ehNosso &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/dominio/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/dominio/${host}`;
    return NextResponse.rewrite(url);
  }

  // Painel e auth: sessão + proteção
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/pp-preview") || // prévia do editor (exige sessão)
    pathname === "/login" ||
    pathname === "/cadastro"
  ) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
