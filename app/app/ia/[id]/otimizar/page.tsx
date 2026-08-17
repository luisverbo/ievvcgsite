import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { podeUsar } from "@/lib/painel/permissoes";
import { funcaoLigada } from "@/lib/painel/flags";
import { resumirMetricas, MIN_VISITAS_ANALISE, type Sugestao } from "@/lib/ia/otimizador";
import Robo from "@/components/painel/Robo";
import Analisar from "./Analisar";
import type { SiteIA } from "../../actions";

export const maxDuration = 300;

/*
 * O Otimizador da página: as métricas reais em cima, as sugestões da IA
 * embaixo — cada uma com o botão Aplicar, que abre o chat do construtor com
 * o pedido pronto. A IA propõe; quem manda aplicar é o dono.
 */
export default async function OtimizarPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await podeUsar("construtor"))) notFound();
  if (!(await funcaoLigada("otimizador"))) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // A RLS deste select é a prova de que a página pertence a quem está olhando.
  const supabase = await createClient();
  const { data: sRaw } = await supabase.from("sites_ia").select("*").eq("id", id).maybeSingle();
  if (!sRaw) notFound();
  const site = sRaw as SiteIA & { otimizacoes?: Sugestao[] | null; otimizadas_em?: string | null };

  const m = await resumirMetricas(site.org_id, id);
  const sugestoes = Array.isArray(site.otimizacoes) ? site.otimizacoes : [];
  const poucasVisitas = m.visitas < MIN_VISITAS_ANALISE;

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div className="anim-entrada">
        <Link href={`/app/ia/${site.id}`} className="text-sm text-paper-dim hover:text-paper">
          ← {site.titulo}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Otimizador 📈</h1>
        <p className="mt-1 max-w-3xl text-sm text-paper-dim">
          Os números reais da página nos últimos 30 dias — e o que a IA sugere mudar a partir
          deles. Nada é aplicado sozinho: cada sugestão abre o chat com o pedido pronto, e quem
          decide é você.
        </p>
      </div>

      {/* ------------------------------ números ------------------------------ */}
      <div className="anim-entrada d1 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { rotulo: "Visitas (30d)", valor: String(m.visitas), cor: "text-paper" },
          { rotulo: "Cliques em botões", valor: String(m.cliques), cor: "text-brand-2" },
          {
            rotulo: "Taxa de clique",
            valor: m.taxaPct === null ? "—" : `${m.taxaPct}%`,
            cor: "text-ok",
          },
          {
            rotulo: "Tempo médio",
            valor:
              m.tempoMedioS === null
                ? "—"
                : m.tempoMedioS < 60
                  ? `${m.tempoMedioS}s`
                  : `${Math.floor(m.tempoMedioS / 60)}min${String(m.tempoMedioS % 60).padStart(2, "0")}`,
            cor: "text-paper",
          },
        ].map((s) => (
          <div key={s.rotulo} className="rounded-xl border border-white/10 bg-ink-2 p-4">
            <div className={`font-display text-2xl font-extrabold tabular-nums ${s.cor}`}>
              {s.valor}
            </div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {s.rotulo}
            </div>
          </div>
        ))}
      </div>

      {/* --------------------------- rolagem --------------------------- */}
      {m.saidas >= 5 && (
        <div className="anim-entrada d2 rounded-xl border border-white/10 bg-ink-2 p-5">
          <h2 className="text-lg font-bold">Até onde as visitas rolam</h2>
          <p className="mt-1 text-xs text-paper-dim">
            Cada faixa é um décimo da página. Quanto mais apagada, menos gente chega ali
            {m.zonaAbandono ? (
              <>
                {" "}
                — a maior desistência é perto de{" "}
                <b className="text-warn">{m.zonaAbandono}% da página</b>.
              </>
            ) : (
              " — e a maioria chega ao fim. 👏"
            )}
          </p>
          <div className="mt-3 flex gap-1">
            {m.alcance.map((a) => (
              <div
                key={a.zona}
                title={`${a.pct}% das visitas chegam a ${a.zona}% da página`}
                className={`h-9 flex-1 rounded ${a.zona === (m.zonaAbandono ?? -1) + 10 ? "ring-1 ring-warn/70" : ""}`}
                style={{ background: `rgba(142, 123, 255, ${Math.max(0.06, a.pct / 100)})` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-paper-dim">
            <span>topo</span>
            <span>fim da página</span>
          </div>
        </div>
      )}

      {/* --------------------------- origens ---------------------------- */}
      {m.origens.length > 0 && (
        <div className="anim-entrada d2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-paper-dim">
            De onde vêm:
          </span>
          {m.origens.map((o) => (
            <span key={o.nome} className="rounded-full border border-white/10 bg-ink-2 px-3 py-1">
              {o.nome} <b className="text-brand-2">{o.visitas}</b>
            </span>
          ))}
        </div>
      )}

      {/* -------------------------- a análise ---------------------------- */}
      <div className="anim-entrada d3 card-aurora rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Robo estado={sugestoes.length > 0 ? "trabalhando" : "novo"} tamanho={56} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold">O que a IA sugere</h2>
            <p className="mt-0.5 text-sm text-paper-dim">
              {poucasVisitas
                ? `Ainda não dá: com ${m.visitas} visita${m.visitas === 1 ? "" : "s"} em 30 dias, sugestão seria chute. A análise libera a partir de ${MIN_VISITAS_ANALISE} — divulgue o link e volte aqui.`
                : sugestoes.length > 0
                  ? `Análise de ${site.otimizadas_em ? new Date(site.otimizadas_em).toLocaleDateString("pt-BR") : "—"}. Rode de novo depois de aplicar mudanças ou juntar mais visitas.`
                  : "A IA lê a página inteira, cruza com os números acima e devolve até 3 mudanças concretas — cada uma citando o número que a motivou."}
            </p>
          </div>
          {!poucasVisitas && <Analisar siteId={site.id} temSugestoes={sugestoes.length > 0} />}
        </div>

        {sugestoes.length > 0 && (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {sugestoes.map((s, i) => (
              <div
                key={i}
                className="flex flex-col rounded-xl border border-white/10 bg-black/25 p-4"
              >
                <h3 className="font-bold text-paper">{s.titulo}</h3>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-paper-dim">{s.motivo}</p>
                <p className="mt-3 rounded-lg bg-white/[0.04] p-2.5 text-[11px] italic leading-relaxed text-paper-dim">
                  “{s.pedido.length > 180 ? `${s.pedido.slice(0, 180)}…` : s.pedido}”
                </p>
                <Link
                  href={`/app/ia/${site.id}?pedido=${encodeURIComponent(s.pedido)}`}
                  className="mt-3 rounded-lg bg-ok/20 px-4 py-2 text-center text-xs font-bold text-ok transition hover:bg-ok/30"
                >
                  Aplicar → abre o chat com o pedido pronto
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-paper-dim">
        ℹ️ O botão <b className="text-paper">Aplicar não muda nada sozinho</b>: ele preenche o chat
        do construtor com o pedido e você envia (a edição custa o mesmo que qualquer pedido no
        chat). Toda versão anterior fica guardada — dá para voltar atrás sempre.
      </p>
    </div>
  );
}
