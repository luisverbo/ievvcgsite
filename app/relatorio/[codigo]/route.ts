import { createAdminClient } from "@/lib/supabase/admin";
import { funcaoLigada } from "@/lib/painel/flags";
import {
  montarRelatorio,
  mesFechadoAtual,
  mesValido,
  mesesComDados,
  rotuloDoMes,
} from "@/lib/ia/relatorio";

/*
 * O relatório que o cliente final abre: /relatorio/<codigo>?m=2026-07
 *
 * Página pública sem login — o dentista não vai criar conta para ver quantas
 * visitas teve. O código é longo e aleatório; o que ele expõe (visitas de um
 * site publicado) não é dado sensível de ninguém.
 *
 * Feita em HTML direto, como o Espelho: é uma folha impressa, não um app.
 * Sem gráfico de biblioteca, sem script — abre rápido no 3G do consultório
 * e imprime direito quando o cliente quiser levar para o contador.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await ctx.params;
  if (!/^[a-z0-9]{8,32}$/i.test(codigo) || !(await funcaoLigada("relatorio_mensal"))) {
    return new Response("Não encontrado", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: sRaw } = await admin
    .from("sites_ia")
    .select("id, org_id, slug, publicado")
    .eq("relatorio_codigo", codigo)
    .maybeSingle();
  const site = sRaw as { id: string; org_id: string; slug: string; publicado: boolean } | null;
  if (!site) return new Response("Não encontrado", { status: 404 });

  const url = new URL(req.url);
  const meses = await mesesComDados(site.org_id, site.id);
  const mes = mesValido(url.searchParams.get("m")) ?? meses[0] ?? mesFechadoAtual();

  const r = await montarRelatorio(site.org_id, site.id, mes);
  if (!r) return new Response("Não encontrado", { status: 404 });

  const seta =
    r.variacaoPct === null ? "" : r.variacaoPct > 0 ? "▲" : r.variacaoPct < 0 ? "▼" : "=";
  const corVar = r.variacaoPct === null ? "" : r.variacaoPct >= 0 ? "sobe" : "desce";

  const cartao = (valor: string, rotulo: string, extra = "") => `
    <div class="cartao">
      <div class="numero">${valor}</div>
      <div class="rotulo">${rotulo}</div>
      ${extra ? `<div class="extra">${extra}</div>` : ""}
    </div>`;

  const barras = (itens: { nome: string; valor: number }[]) => {
    const max = Math.max(1, ...itens.map((i) => i.valor));
    return itens
      .map(
        (i) => `
      <div class="linha">
        <span class="nome">${esc(i.nome)}</span>
        <span class="barra"><span style="width:${Math.round((i.valor / max) * 100)}%"></span></span>
        <span class="valor">${i.valor}</span>
      </div>`,
      )
      .join("");
  };

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(r.titulo)} — relatório de ${esc(r.mesRotulo)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0f1218;color:#eef1f7;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55}
  .folha{max-width:820px;margin:0 auto;padding:32px 20px 56px}
  header{border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:20px}
  .sobre{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8e7bff}
  h1{font-size:clamp(24px,5vw,34px);font-weight:800;margin-top:6px}
  .mes{color:#a6adbd;margin-top:2px;font-size:15px}
  .resumo{margin-top:26px;display:flex;flex-direction:column;gap:10px}
  .resumo p{font-size:clamp(16px,2.4vw,19px)}
  .resumo p:first-child{font-weight:700}
  .cartoes{margin-top:26px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
  .cartao{background:#161a23;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px}
  .numero{font-size:32px;font-weight:800;font-variant-numeric:tabular-nums}
  .rotulo{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a6adbd;margin-top:2px}
  .extra{font-size:12px;color:#a6adbd;margin-top:6px}
  .sobe{color:#2fbf8f}.desce{color:#e8843c}
  section{margin-top:30px}
  h2{font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#a6adbd;margin-bottom:12px}
  .linha{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:14px}
  .nome{width:34%;min-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .barra{flex:1;height:9px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
  .barra>span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#6c5ce7,#8e7bff)}
  .valor{width:44px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
  .meses{margin-top:34px;display:flex;flex-wrap:wrap;gap:6px}
  .meses a{font-size:12px;padding:5px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.14);color:#a6adbd;text-decoration:none}
  .meses a.atual{background:#6c5ce7;border-color:#6c5ce7;color:#fff;font-weight:700}
  footer{margin-top:38px;padding-top:18px;border-top:1px solid rgba(255,255,255,.1);color:#a6adbd;font-size:13px;display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between}
  footer a{color:#8e7bff;text-decoration:none;font-weight:700}
  @media print{body{background:#fff;color:#000}.cartao{border-color:#ddd;background:#fff}.meses{display:none}}
</style>
</head>
<body>
<div class="folha">
  <header>
    <div class="sobre">Relatório do seu site</div>
    <h1>${esc(r.titulo)}</h1>
    <div class="mes">${esc(r.mesRotulo)}</div>
  </header>

  <div class="resumo">
    ${r.frases.map((f) => `<p>${esc(f)}</p>`).join("")}
  </div>

  <div class="cartoes">
    ${cartao(
      String(r.atual.visitas),
      "Visitas",
      r.variacaoPct === null
        ? r.anterior.visitas === 0
          ? "primeiro mês com movimento"
          : ""
        : `<span class="${corVar}">${seta} ${Math.abs(r.variacaoPct)}%</span> vs. mês anterior (${r.anterior.visitas})`,
    )}
    ${cartao(
      String(r.atual.contatos),
      "Clicaram para falar",
      r.anterior.contatos > 0 ? `mês anterior: ${r.anterior.contatos}` : "",
    )}
    ${cartao(
      r.atual.taxaPct === null ? "—" : `${r.atual.taxaPct}%`,
      "Viraram contato",
      "de cada 100 visitas",
    )}
  </div>

  ${
    r.atual.origens.length > 0
      ? `<section>
      <h2>De onde vieram as visitas</h2>
      ${barras(r.atual.origens.map((o) => ({ nome: o.nome, valor: o.visitas })))}
    </section>`
      : ""
  }

  ${
    r.atual.botoes.length > 0
      ? `<section>
      <h2>Onde clicaram</h2>
      ${barras(r.atual.botoes.map((b) => ({ nome: b.nome, valor: b.cliques })))}
    </section>`
      : ""
  }

  ${
    meses.length > 1
      ? `<div class="meses">
      ${meses
        .slice(0, 12)
        .map(
          (m) =>
            `<a class="${m === r.mes ? "atual" : ""}" href="?m=${m}">${esc(rotuloDoMes(m))}</a>`,
        )
        .join("")}
    </div>`
      : ""
  }

  <footer>
    <span>${site.publicado ? `Seu site: <a href="/ia/${esc(site.slug)}" target="_blank" rel="noopener">ver online ↗</a>` : "Site fora do ar no momento."}</span>
    ${r.assinatura ? `<span>Feito e mantido por <b>${esc(r.assinatura)}</b></span>` : ""}
  </footer>
</div>
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
