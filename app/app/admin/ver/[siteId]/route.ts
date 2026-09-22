import { notFound } from "next/navigation";
import { ehAdmin } from "@/lib/painel/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { responderPagina, CSP_PAGINA_CLIENTE, type SiteServivel } from "@/lib/ia/servir";

/*
 * Ver a página de um cliente pelo Admin — inclusive a que ele NÃO publicou.
 *
 * O endereço público (/ia/slug) só serve página publicada, e com razão: um
 * rascunho no ar seria um site vazando antes da hora. Mas na hora de decidir
 * um reembolso é justamente o rascunho que conta a história — "criou e
 * abandonou no meio" e "criou uma página inteira" são conversas diferentes, e
 * sem olhar não dá para saber qual é.
 *
 * Só o dono do sistema passa. O HTML do cliente continua enjaulado pela mesma
 * CSP da página pública: abrir a criação de um cliente não pode virar porta
 * para o script dele rodar solto no nosso domínio.
 */

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ siteId: string }> }) {
  if (!(await ehAdmin())) notFound();

  const { siteId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) {
    return new Response("Endereço inválido", { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("sites_ia")
    .select("id, org_id, html, publicado, facebook_pixel_id, codigo_head")
    .eq("id", siteId)
    .maybeSingle();

  const site = data as SiteServivel | null;
  if (!site?.html) {
    return new Response(
      "Esta página não tem conteúdo nenhum — o cliente criou e não chegou a gerar nada.",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // `publicado: true` à força: aqui quem está olhando é o dono do sistema, e
  // o ponto é ver o que existe, publicado ou não.
  const resposta = responderPagina({ ...site, publicado: true });
  const headers = new Headers(resposta.headers);
  headers.set("Content-Security-Policy", CSP_PAGINA_CLIENTE);
  // Nunca indexar, nunca guardar: é tela de auditoria, não página de verdade.
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "no-store");
  return new Response(resposta.body, { status: resposta.status, headers });
}
