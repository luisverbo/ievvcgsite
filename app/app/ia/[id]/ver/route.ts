import { createClient } from "@/lib/supabase/server";
import { podeUsar } from "@/lib/painel/permissoes";

// Prévia do rascunho em tela cheia, no navegador mesmo — sem precisar
// publicar. Exige sessão de admin (a rota vive sob /app, então o proxy já
// renova a sessão).

// Mensagem legível em vez de um 404 seco — assim dá para entender o que houve.
function aviso(texto: string, status: number) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Prévia</title><body style="font:16px/1.6 system-ui;background:#0d1017;color:#e8eaf0;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px"><div><p>${texto}</p></div></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await podeUsar("construtor"))) {
    return aviso("Você precisa estar logado como dono do sistema para ver a prévia.", 403);
  }
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return aviso("Endereço de prévia inválido.", 400);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites_ia")
    .select("html")
    .eq("id", id)
    .maybeSingle();
  if (error) return aviso(`Não consegui carregar a página: ${error.message}`, 500);

  const html = (data as { html: string } | null)?.html;
  if (!html) return aviso("Esta página ainda não tem conteúdo. Peça a primeira versão à IA.", 404);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // O rascunho não deve ser indexado nem embutido fora do painel.
      "X-Robots-Tag": "noindex",
    },
  });
}
