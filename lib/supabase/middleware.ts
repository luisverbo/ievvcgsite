import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PAINEL_PREFIX = "/app";
// Rotas que exigem sessão (a prévia do editor mostra rascunhos).
const PROTEGIDAS = [PAINEL_PREFIX, "/pp-preview"];

// Renova a sessão e protege o painel (/app). Rotas de login/cadastro ficam
// fora de /app, então não precisam de exceção aqui.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (PROTEGIDAS.some((p) => pathname.startsWith(p)) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("de", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/cadastro") && user) {
    const url = request.nextUrl.clone();
    url.pathname = PAINEL_PREFIX;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
