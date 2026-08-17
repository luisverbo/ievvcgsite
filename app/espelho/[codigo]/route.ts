import { createAdminClient } from "@/lib/supabase/admin";
import { funcaoLigada } from "@/lib/painel/flags";

/*
 * A página do Espelho: /espelho/<codigo> — "hoje × amanhã".
 *
 * De um lado, o print do site ATUAL do lead (tirado pelo agente); do outro,
 * o site novo, vivo, servido pelo /p do mesmo código. Nenhum argumento de
 * venda supera colocar os dois lado a lado — a página não precisa dizer
 * quase nada, e por isso não diz.
 *
 * O lado "amanhã" é um iframe do /p/<codigo>: se o lead rolar e clicar ali,
 * a visita conta no Termômetro — que é exatamente o que ela é. Robô de
 * prévia do WhatsApp não renderiza iframe, então não suja a medição.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await ctx.params;
  if (!/^[a-z0-9]{6,24}$/i.test(codigo) || !(await funcaoLigada("espelho"))) {
    return new Response("Não encontrado", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: pRaw } = await admin
    .from("prospeccao")
    .select("id, nome, espelho_url, site_ia_id")
    .eq("link_codigo", codigo)
    .maybeSingle();
  const p = pRaw as { id: string; nome: string; espelho_url: string | null; site_ia_id: string | null } | null;
  if (!p?.espelho_url || !p.site_ia_id) return new Response("Não encontrado", { status: 404 });

  // Sem site publicado não há "amanhã" — e meia comparação é pior que nenhuma.
  const { data: sRaw } = await admin
    .from("sites_ia")
    .select("html, publicado")
    .eq("id", p.site_ia_id)
    .maybeSingle();
  const site = sRaw as { html: string | null; publicado: boolean } | null;
  if (!site?.html) return new Response("Não encontrado", { status: 404 });

  const nome = esc(p.nome);
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${nome} — hoje × amanhã</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0f1218; color: #eef1f7;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    min-height: 100dvh; display: flex; flex-direction: column;
  }
  header { text-align: center; padding: 28px 16px 8px; }
  header h1 { font-size: clamp(20px, 4vw, 30px); font-weight: 800; }
  header h1 em { font-style: normal; background: linear-gradient(90deg,#8e7bff,#2fbf8f); -webkit-background-clip: text; background-clip: text; color: transparent; }
  header p { margin-top: 6px; color: #a6adbd; font-size: 14px; }
  .duelo {
    flex: 1; display: grid; gap: 16px; padding: 16px;
    grid-template-columns: 1fr; max-width: 1180px; margin: 0 auto; width: 100%;
  }
  @media (min-width: 860px) { .duelo { grid-template-columns: 1fr 1fr; } }
  .lado { display: flex; flex-direction: column; gap: 10px; }
  .selo { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; }
  .selo.hoje { color: #a6adbd; }
  .selo.amanha { color: #2fbf8f; }
  .quadro {
    border-radius: 16px; overflow: hidden; height: min(66vh, 560px);
    border: 1px solid rgba(255,255,255,.1); background: #161a23;
  }
  .quadro.hoje img { width: 100%; height: 100%; object-fit: cover; object-position: top; filter: saturate(.65); display: block; }
  .quadro.amanha { border-color: rgba(47,191,143,.45); box-shadow: 0 0 42px rgba(47,191,143,.14); }
  .quadro.amanha iframe { width: 100%; height: 100%; border: 0; display: block; background: #fff; }
  .abrir { font-size: 13px; color: #8e7bff; text-decoration: none; font-weight: 700; }
  .abrir:hover { text-decoration: underline; }
  footer { text-align: center; padding: 18px 16px 30px; color: #a6adbd; font-size: 14px; }
  footer b { color: #eef1f7; }
</style>
</head>
<body>
  <header>
    <h1>${nome}: hoje <em>× amanhã</em></h1>
    <p>À esquerda, o site como está. À direita, como ele pode ficar.</p>
  </header>
  <div class="duelo">
    <div class="lado">
      <span class="selo hoje">Hoje</span>
      <div class="quadro hoje"><img src="${esc(p.espelho_url)}" alt="O site atual de ${nome}"></div>
    </div>
    <div class="lado">
      <span class="selo amanha">✦ Amanhã</span>
      <div class="quadro amanha"><iframe src="/p/${esc(codigo)}" title="O novo site de ${nome}" loading="lazy"></iframe></div>
      <a class="abrir" href="/p/${esc(codigo)}" target="_blank" rel="noopener">Abrir o site novo em tela cheia →</a>
    </div>
  </div>
  <footer>Gostou da diferença? <b>Responde lá na conversa do WhatsApp</b> 😉</footer>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
