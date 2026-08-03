import { createAdminClient } from "@/lib/supabase/admin";

// Serve a página gerada pela IA. É um documento HTML inteiro escrito pela
// Claude, então devolvemos o corpo cru — sem passar pelo layout do app.

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("sites_ia")
    .select("html, publicado")
    .eq("slug", slug)
    .maybeSingle();

  const site = data as { html: string; publicado: boolean } | null;
  if (!site?.publicado || !site.html) {
    return new Response("Não encontrado", { status: 404 });
  }

  return new Response(site.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
