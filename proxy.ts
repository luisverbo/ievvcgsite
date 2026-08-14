import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Domínio raiz do produto (ex.: "paginapro.com.br"). Quando definido, sites
// publicados respondem em {slug}.paginapro.com.br via rewrite interno.
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  // Subdomínio de cliente → reescreve para a rota interna /s/[site]
  if (
    ROOT &&
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
      "localhost",
      process.env.VERCEL_URL?.toLowerCase(),
      process.env.VERCEL_BRANCH_URL?.toLowerCase(),
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase(),
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
