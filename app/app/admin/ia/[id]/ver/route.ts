import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "../../../actions";

// Prévia do rascunho em tela cheia, no navegador mesmo — sem precisar
// publicar. Exige sessão de admin (a rota vive sob /app, então o proxy já
// renova a sessão).

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await ehAdmin())) return new Response("Não encontrado", { status: 404 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.from("sites_ia").select("html").eq("id", id).maybeSingle();
  const html = (data as { html: string } | null)?.html;
  if (!html) return new Response("A página ainda não foi criada.", { status: 404 });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // O rascunho não deve ser indexado nem embutido fora do painel.
      "X-Robots-Tag": "noindex",
    },
  });
}
