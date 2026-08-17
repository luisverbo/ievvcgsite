import NextLink from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { podeUsar } from "@/lib/painel/permissoes";
import { funcaoLigada } from "@/lib/painel/flags";
import { montarRelatorio, mesesComDados, mesValido, mesFechadoAtual } from "@/lib/ia/relatorio";
import Robo from "@/components/painel/Robo";
import Link from "./Link";
import type { SiteIA } from "../../actions";

/*
 * A tela do dono: ele confere o relatório do mês e pega o link para mandar.
 * O que ele vê aqui é exatamente o que o cliente final vê — a prévia é a
 * própria página pública, num quadro.
 */
export default async function RelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  if (!(await podeUsar("construtor"))) notFound();
  if (!(await funcaoLigada("relatorio_mensal"))) notFound();
  const { id } = await params;
  const { m } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // A RLS deste select é a prova de que a página é de quem está olhando.
  const supabase = await createClient();
  const { data: sRaw } = await supabase.from("sites_ia").select("*").eq("id", id).maybeSingle();
  if (!sRaw) notFound();
  const site = sRaw as SiteIA & { relatorio_codigo?: string | null };

  const meses = await mesesComDados(site.org_id, id);
  const mes = mesValido(m) ?? meses[0] ?? mesFechadoAtual();
  const r = await montarRelatorio(site.org_id, id, mes);

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div className="anim-entrada">
        <NextLink href={`/app/ia/${site.id}`} className="text-sm text-paper-dim hover:text-paper">
          ← {site.titulo}
        </NextLink>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Relatório mensal 📄</h1>
        <p className="mt-1 max-w-3xl text-sm text-paper-dim">
          Quem paga a mensalidade não abre painel — vê a fatura chegar. Este é o link que você
          manda todo mês para mostrar o que o site fez por ele: visitas, quantos clicaram para
          falar, de onde vieram. <b className="text-paper">Não gasta crédito nenhum.</b>
        </p>
      </div>

      <div className="anim-entrada d1 card-aurora rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Robo estado={site.relatorio_codigo ? "trabalhando" : "novo"} tamanho={52} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold">O link do seu cliente</h2>
            <p className="mt-0.5 text-sm text-paper-dim">
              {site.relatorio_codigo
                ? "O mesmo link vale para sempre — todo mês ele mostra o mês mais recente sozinho. Mande uma vez, ou reenvie quando quiser lembrar do valor do serviço."
                : "Crie o endereço público deste relatório. Enquanto você não criar, não existe nada no ar."}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link siteId={site.id} codigo={site.relatorio_codigo ?? null} />
        </div>
      </div>

      {/* ------------------------- números do mês ------------------------- */}
      {r && (
        <div className="anim-entrada d2 rounded-2xl border border-white/10 bg-ink-2 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold">
              {r.mesRotulo}{" "}
              {r.variacaoPct !== null && (
                <span
                  className={`ml-1 text-sm font-extrabold ${r.variacaoPct >= 0 ? "text-ok" : "text-warn"}`}
                >
                  {r.variacaoPct >= 0 ? "▲" : "▼"} {Math.abs(r.variacaoPct)}%
                </span>
              )}
            </h2>
            {meses.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {meses.slice(0, 6).map((mm) => (
                  <NextLink
                    key={mm}
                    href={`/app/ia/${site.id}/relatorio?m=${mm}`}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      mm === r.mes
                        ? "bg-brand text-white"
                        : "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
                    }`}
                  >
                    {mm.split("-").reverse().join("/")}
                  </NextLink>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { rot: "Visitas", val: String(r.atual.visitas), cor: "text-paper" },
              { rot: "Clicaram para falar", val: String(r.atual.contatos), cor: "text-brand-2" },
              {
                rot: "Viraram contato",
                val: r.atual.taxaPct === null ? "—" : `${r.atual.taxaPct}%`,
                cor: "text-ok",
              },
            ].map((x) => (
              <div key={x.rot} className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className={`font-display text-2xl font-extrabold tabular-nums ${x.cor}`}>
                  {x.val}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">
                  {x.rot}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-paper-dim">
              O que ele vai ler
            </span>
            {r.frases.map((f, i) => (
              <p key={i} className={i === 0 ? "font-bold text-paper" : "text-paper-dim"}>
                {f}
              </p>
            ))}
          </div>
        </div>
      )}

      {site.relatorio_codigo && (
        <div className="anim-entrada d3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-paper-dim">
            Prévia — exatamente o que seu cliente vê
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              src={`/relatorio/${site.relatorio_codigo}?m=${mes}`}
              title="Prévia do relatório"
              className="h-[640px] w-full bg-ink"
            />
          </div>
        </div>
      )}

      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-paper-dim">
        ℹ️ O relatório é <b className="text-paper">público para quem tem o link</b> (sem login — seu
        cliente não vai criar conta para ver visitas) e não aparece no Google. Ele mostra só os
        números do site: nada de dados de outros clientes seus.
      </p>
    </div>
  );
}
