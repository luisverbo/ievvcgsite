import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/*
 * A volta dos links que o Supabase manda por e-mail.
 *
 * Hoje serve à recuperação de senha; serve igual à confirmação de cadastro e
 * à troca de e-mail, se um dia forem ligadas — por isso a rota é genérica.
 *
 * Aceita as DUAS formas que o Supabase pode usar, porque a forma depende de
 * como o modelo de e-mail está escrito no painel dele, e um link que não
 * abre é um cliente trancado do lado de fora:
 *
 *   ?code=…                    fluxo PKCE (o padrão do @supabase/ssr). Exige
 *                              o mesmo navegador que PEDIU o link — o segredo
 *                              que fecha a troca ficou num cookie de lá.
 *   ?token_hash=…&type=recovery  funciona em qualquer aparelho. É o que sai
 *                              quando o modelo usa {{ .TokenHash }}.
 *
 * Falhou? Nunca deixamos numa tela de erro morta: volta para /recuperar com
 * o motivo e o formulário pronto para pedir outro link.
 */

const TIPOS: EmailOtpType[] = ["recovery", "signup", "invite", "magiclink", "email", "email_change"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipoBruto = url.searchParams.get("type");
  const tipo = TIPOS.find((t) => t === tipoBruto);

  // Para onde ir DEPOIS de a sessão existir. Lista fechada de propósito: este
  // parâmetro vem de uma URL que passeou por um e-mail.
  const proximo = url.searchParams.get("proximo") === "nova-senha" ? "/nova-senha" : "/app";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(proximo, request.url));
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (!error) return NextResponse.redirect(new URL(proximo, request.url));
  }

  return NextResponse.redirect(new URL("/recuperar?erro=link", request.url));
}
