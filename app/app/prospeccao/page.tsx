import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar, exigirProspeccao } from "@/lib/painel/permissoes";
import Abas from "./Abas";
import Busca from "./Busca";
import Importar from "./Importar";
import Fila from "./Fila";
import Vigia from "./Vigia";
import Robo from "@/components/painel/Robo";
import { type TarefaRow } from "@/lib/prospeccao/tipos";
import { acharNicho } from "@/lib/prospeccao/nichos";
import { chaveDaBusca, normalizarFiltros, resumoFiltros } from "@/lib/prospeccao/filtros";
import { cardClass } from "@/components/painel/ui";

export const maxDuration = 300;

/*
 * A aba BUSCAR — a sala de máquinas.
 *
 * Aqui mora o que faz a lista crescer: o formulário de busca, a planilha
 * para importar, a fila do agente e o estado dele. A lista em si foi para a
 * aba Leads: quem entra para buscar não precisa de sessenta cards embaixo,
 * e quem entra para chamar um lead não precisa rolar por baixo do
 * formulário. Duas tarefas, duas telas.
 */

function agenteOnline(ultimo: string | null | undefined) {
  return !!ultimo && Date.now() - new Date(ultimo).getTime() < 15 * 60_000;
}

function temCelular(telefone: string | null) {
  return !!telefone && /9\d{8}$/.test(telefone.replace(/\D/g, ""));
}

export default async function ProspeccaoPage() {
  await exigirProspeccao();
  const org = await getMinhaOrg();
  if (!org) notFound();
  const podeSites = await podeUsar("construtor");
  const supabase = await createClient();

  const [{ data: tarefasRaw }, { data: agentesRaw }, { data: todosRaw }, { data: buscasRaw }] =
    await Promise.all([
      supabase
        .from("prospeccao_tarefas")
        .select("*")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("agentes").select("ultimo_contato").eq("org_id", org.id),
      supabase.from("prospeccao").select("status, pontuacao, telefone").eq("org_id", org.id),
      supabase.from("prospeccao").select("nicho_busca, local_busca").eq("org_id", org.id).limit(2000),
    ]);

  const tarefas = (tarefasRaw as TarefaRow[] | null) ?? [];
  const agenteAtivo = ((agentesRaw as { ultimo_contato: string | null }[] | null) ?? []).some((a) =>
    agenteOnline(a.ultimo_contato),
  );
  const temAgente = (agentesRaw?.length ?? 0) > 0;
  const todos = (todosRaw as { status: string; pontuacao: number; telefone: string | null }[] | null) ?? [];
  const prontosParaAbordar = todos.filter((p) => p.status === "novo" && temCelular(p.telefone)).length;

  /*
   * O histórico que o formulário usa para avisar "você já buscou isto": por
   * nicho|local, quantas empresas existem e o que a última busca pediu de
   * filtro. Sem a coluna `filtros` (migração 2026-08-24) o aviso sai só com
   * a contagem.
   */
  const contagem = new Map<string, { nicho: string; local: string; rotulo: string; total: number }>();
  for (const p of (buscasRaw as { nicho_busca: string | null; local_busca: string | null }[] | null) ?? []) {
    const nicho = p.nicho_busca ?? "";
    const local = p.local_busca ?? "";
    const k = `${nicho}|${local}`;
    const atual = contagem.get(k);
    if (atual) atual.total++;
    else {
      const rotuloNicho = acharNicho(nicho)?.rotulo ?? nicho ?? "Sem nicho";
      contagem.set(k, { nicho, local, rotulo: local ? `${rotuloNicho} · ${local}` : rotuloNicho, total: 1 });
    }
  }
  const ultimaPorChave = new Map<string, { em: string; filtros: unknown }>();
  {
    const { data: feitas } = await supabase
      .from("prospeccao_tarefas")
      .select("nicho, local, filtros, created_at")
      .eq("org_id", org.id)
      .eq("status", "concluida")
      .order("created_at", { ascending: false })
      .limit(300);
    for (const t of (feitas as { nicho: string | null; local: string | null; filtros?: unknown; created_at: string }[] | null) ?? []) {
      const k = chaveDaBusca(t.nicho ?? "", t.local ?? "");
      if (!ultimaPorChave.has(k)) ultimaPorChave.set(k, { em: t.created_at, filtros: t.filtros ?? null });
    }
  }
  const historico = [...contagem.values()].map((p) => {
    const ultima = ultimaPorChave.get(chaveDaBusca(p.nicho, p.local));
    return {
      chave: chaveDaBusca(p.nicho, p.local),
      rotulo: p.rotulo,
      total: p.total,
      ultimaEm: ultima?.em ?? null,
      filtros: ultima ? resumoFiltros(normalizarFiltros(ultima.filtros)) : [],
    };
  });

  const stats = [
    { rotulo: "Empresas", valor: todos.length },
    podeSites
      ? { rotulo: "Prioridade alta", valor: todos.filter((p) => p.pontuacao >= 75).length }
      : { rotulo: "Com WhatsApp", valor: todos.filter((p) => temCelular(p.telefone)).length },
    { rotulo: "Contactadas", valor: todos.filter((p) => p.status !== "novo").length },
    { rotulo: "Fechadas", valor: todos.filter((p) => p.status === "fechou").length },
  ];

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] opacity-50"
        style={{
          background:
            "radial-gradient(55% 75% at 15% 0%, rgba(108,92,231,0.15), transparent 70%), radial-gradient(45% 65% at 90% 5%, rgba(47,191,143,0.08), transparent 70%)",
        }}
      />
      <Vigia modo={agenteAtivo ? "vigiando" : "esperando"} />

      <div className="painel-wrap flex flex-col gap-5">
        <div className="anim-entrada">
          <h1 className="font-display text-3xl font-extrabold">Prospecção 🎯</h1>
          <p className="mt-1 text-sm text-paper-dim">
            {podeSites
              ? "Encontre empresas por nicho e região com uma nota de potencial — quem não tem site pontua alto."
              : "Encontre as empresas do ramo e da região que você escolher, com telefone, WhatsApp e avaliações do Google."}
          </p>
        </div>

        <Abas leads={todos.length} />

        {todos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.rotulo}
                className={`anim-entrada d${i + 1} rounded-xl border border-white/10 bg-ink-2 p-4`}
              >
                <div className="font-display text-2xl font-extrabold tabular-nums">{s.valor}</div>
                <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
                  {s.rotulo}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --------------- o agente: trabalhando, dormindo ou por nascer --------------- */}
        {agenteAtivo ? (
          <Link
            href="/app/prospeccao/agente"
            className="anim-entrada d2 group flex flex-wrap items-center gap-4 rounded-2xl border border-ok/30 bg-ok/5 px-5 py-3 transition hover:border-ok/60"
          >
            <Robo estado="trabalhando" tamanho={44} />
            <span className="min-w-0 flex-1 text-sm">
              <b className="text-ok">● Agente trabalhando</b>
              <span className="ml-2 text-paper-dim">conectado ao seu computador — as buscas saem na hora</span>{" "}
              <span className="pp-pontinhos text-ok">
                <span />
                <span />
                <span />
              </span>
            </span>
            <span className="text-xs font-bold text-paper-dim transition group-hover:text-paper">Ver detalhes →</span>
          </Link>
        ) : temAgente ? (
          <div className="anim-entrada d2 flex flex-wrap items-center gap-4 rounded-2xl border border-warn/40 bg-warn/10 p-4">
            <Robo estado="dormindo" tamanho={56} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-extrabold text-warn">Seu agente está dormindo</p>
              <p className="mt-0.5 text-sm text-paper">
                Abra a pasta <b className="font-mono">paginapro-agente</b> e clique duas vezes em{" "}
                <b className="font-mono">LIGAR-AGENTE</b>. Esta tela percebe sozinha quando ele acordar.
              </p>
            </div>
            <Link
              href="/app/prospeccao/agente"
              className="flex-none rounded-xl bg-warn px-4 py-2 text-sm font-bold text-ink transition hover:-translate-y-0.5"
            >
              Como acordar →
            </Link>
          </div>
        ) : (
          <div className="anim-entrada d2 card-aurora flex flex-wrap items-center gap-4 rounded-2xl p-4">
            <Robo estado="novo" tamanho={56} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-extrabold text-paper">Seu agente ainda não nasceu</p>
              <p className="mt-0.5 text-sm text-paper">
                A busca no Google e o envio no WhatsApp rodam num programa no seu computador. Quatro
                passos, uma vez só — depois ele liga sozinho.
              </p>
            </div>
            <Link
              href="/app/comecar"
              className="flex-none rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-2"
            >
              Ver o passo a passo →
            </Link>
          </div>
        )}

        {/* ------------------------------ a busca ------------------------------ */}
        <div className={`anim-entrada d3 ${cardClass}`}>
          <h2 className="mb-4 text-lg font-bold">🔎 Buscar empresas</h2>
          <Busca agenteAtivo={agenteAtivo} temAgente={temAgente} historico={historico} />
          <div className="mt-4">
            <Importar />
          </div>
        </div>

        <Fila tarefas={tarefas} />

        {/* ----------------------- para onde ir com a lista ----------------------- */}
        {todos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/app/prospeccao/leads"
              className="anim-entrada d4 group flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-2 p-4 transition hover:-translate-y-0.5 hover:border-brand-2/50"
            >
              <span className="text-3xl">📋</span>
              <span className="min-w-0 flex-1">
                <b className="block font-display text-base font-extrabold text-paper">
                  Ver os {todos.length} leads
                </b>
                <span className="mt-0.5 block text-xs text-paper-dim">
                  Filtre por estágio, etiqueta ou nome. Exporte em planilha.
                </span>
              </span>
              <span className="text-xs font-bold text-paper-dim transition group-hover:text-paper">→</span>
            </Link>
            <Link
              href="/app/prospeccao/abordagem"
              className="anim-entrada d4 group card-aurora flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5"
            >
              <Robo estado={prontosParaAbordar > 0 ? "novo" : "dormindo"} tamanho={40} />
              <span className="min-w-0 flex-1">
                <b className="block font-display text-base font-extrabold text-paper">Abordar no WhatsApp 💬</b>
                <span className="mt-0.5 block text-xs text-paper-dim">
                  {prontosParaAbordar > 0
                    ? `${prontosParaAbordar} ${prontosParaAbordar === 1 ? "empresa" : "empresas"} com celular esperando a primeira mensagem.`
                    : "Todas as empresas com celular já foram abordadas. Busque mais para encher a fila."}
                </span>
              </span>
              <span className="flex-none rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition group-hover:bg-brand-2">
                Abrir →
              </span>
            </Link>
          </div>
        )}

        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-paper-dim">
          ℹ️ <b className="text-paper">Por que a busca roda no seu agente:</b> o Google trata pedido
          vindo de servidor de um jeito e uma pessoa navegando de casa de outro. Saindo do seu
          computador, o resultado vem completo — e é por isso que a busca leva alguns minutos.
        </p>
      </div>
    </div>
  );
}
