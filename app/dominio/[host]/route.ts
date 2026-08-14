import { createAdminClient } from "@/lib/supabase/admin";
import { responderPagina, type SiteServivel } from "@/lib/ia/servir";
import { hospedagemAtiva } from "@/lib/dominios/acesso";
import { paginaForaDoAr } from "@/lib/dominios/foraDoAr";

/*
 * Serve a página de IA no domínio PRÓPRIO do cliente.
 *
 * Ninguém digita /dominio/... — o proxy reescreve para cá toda visita cujo
 * host não é nosso. Aqui o domínio vira página: consulta o vínculo, confere se
 * a hospedagem está paga, injeta métricas e pixel (a mesma montagem do
 * endereço interno) e responde.
 */

export async function GET(_req: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host: bruto } = await ctx.params;
  const host = decodeURIComponent(bruto).toLowerCase();
  if (!/^[a-z0-9.-]{4,253}$/.test(host)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const admin = createAdminClient();

  // Busca exata; sem resultado, tenta sem o "www." — o cliente cadastra um e
  // o visitante digita o outro, e os dois têm que funcionar.
  let { data } = await admin
    .from("dominios")
    .select("site_ia_id")
    .eq("dominio", host)
    .maybeSingle();
  if (!data && host.startsWith("www.")) {
    ({ data } = await admin
      .from("dominios")
      .select("site_ia_id")
      .eq("dominio", host.slice(4))
      .maybeSingle());
  }
  const vinculo = data as { site_ia_id: string } | null;
  if (!vinculo) return new Response("Não encontrado", { status: 404 });

  const { data: siteRaw } = await admin
    .from("sites_ia")
    .select("id, org_id, html, publicado, facebook_pixel_id, codigo_head")
    .eq("id", vinculo.site_ia_id)
    .maybeSingle();
  const site = siteRaw as SiteServivel | null;
  if (!site?.publicado || !site.html) {
    return new Response("Não encontrado", { status: 404 });
  }

  /*
   * A hospedagem está paga?
   *
   * Esta é a única trava com dente do produto: sem ela, o cliente para de
   * pagar e o site dele continua no ar para sempre — nós hospedando de graça,
   * e ele sem nenhum motivo para voltar.
   */
  if (!(await hospedagemAtiva(site.org_id))) {
    return paginaForaDoAr();
  }

  return responderPagina(site);
}
