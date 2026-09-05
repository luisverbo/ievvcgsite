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

  // Subdomínio de cliente → reescreve para a rota interna /s/[site]
  if (
    ROOT &&
    !ehProspector && // o nosso domínio não é site de cliente
    host !== ROOT &&
    host !== `www.${ROOT}` &&
    host !== `app.${ROOT}` &&
    host.endsWith(`.${ROOT}`) &&
    !pathname.startsWith("/s/") &&
    !pathname.startsWith("/_next")
  ) {
    const slug = host.slice(0, -(ROOT.length + 1));
    const url = request.nextUrl.clone();
    url.pathname = `/s/${slug}${pathname === "/" ? "" : pathname}`;
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
    nossosHosts.has(host) || (ROOT ? host.endsWith(`.${ROOT}`) : false) || host.endsWith(".vercel.app");

  if (host && !ehNosso && !pathname.startsWith("/_next") && !pathname.startsWith("/dominio/")) {
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
