import { createAdminClient } from "@/lib/supabase/admin";
import { responderPagina, type SiteServivel } from "@/lib/ia/servir";

// Serve a página gerada pela IA no endereço interno (/ia/slug). A montagem do
// HTML (métricas, pixel, tags) vive em lib/ia/servir.ts, compartilhada com o
// domínio próprio do cliente.

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("sites_ia")
    .select("id, org_id, html, publicado, facebook_pixel_id, codigo_head")
    .eq("slug", slug)
    .maybeSingle();

  const site = data as SiteServivel | null;
  if (!site?.publicado || !site.html) {
    return new Response("Não encontrado", { status: 404 });
  }

  return responderPagina(site);
}
