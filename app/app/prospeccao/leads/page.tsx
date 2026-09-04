import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { funcaoLigada } from "@/lib/painel/flags";
import { type ProspectoRow } from "@/lib/prospeccao/tipos";
import { acharNicho } from "@/lib/prospeccao/nichos";
import { IG_FILA_MAX, IG_LIMITE_DIA } from "@/lib/prospeccao/instagram";
import { cardClass } from "@/components/painel/ui";
import Abas from "../Abas";
import BuscaNome from "../BuscaNome";
import Exportar from "../Exportar";
import SeletorPesquisa from "../SeletorPesquisa";
import CardLead, { type ContextoCard } from "./CardLead";

export const maxDuration = 300;

/*
 * A aba LEADS — a lista, e só a lista.
 *
 * Saiu da tela de busca por um motivo simples: quem entra para chamar um
 * lead não quer rolar por baixo de um formulário, e quem entra para buscar
 * não quer sessenta cards embaixo. Aqui a barra de ferramentas (pesquisa,
 * estágio, nome, etiquetas, exportar) fica fixa no topo e os cards embaixo,
 * em ordem de urgência: lembrete de hoje primeiro, depois quem está olhando
 * o site agora, depois a nota.
 */

const FILTROS: { chave: string; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "novo", rotulo: "Novos" },
  { chave: "contactado", rotulo: "Contactados" },
  { chave: "respondeu", rotulo: "Responderam" },
  { chave: "fechou", rotulo: "Fechados" },
];

// Só o WhatsApp de celular vale link direto; fixo não tem.
function temCelular(telefone: string | null) {
  return !!telefone && /9\d{8}$/.test(telefone.replace(/\D/g, ""));
}

/*
 * A página é renderizada uma vez por pedido no servidor — o "agora" é lido
 * uma única vez aqui e passado a todos os cards, em vez de cada um olhar o
 * relógio no meio do render.
 */
function relogio() {
  return Date.now();
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; b?: string; q?: string; tag?: string }>;
}) {
  if (!(await podeUsar("prospeccao"))) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();
  const { f, b, q: qBruto, tag } = await searchParams;
  const filtro = FILTROS.some((x) => x.chave === f) ? f! : "todos";
  const busca = b ?? "todas";
  const procura = (qBruto ?? "").trim().slice(0, 80).replace(/[%_]/g, "\\$&");
  const tagAtiva = (tag ?? "").trim().slice(0, 30);

  const podeSites = await podeUsar("construtor");
  const supabase = await createClient();

  /* ------------------------------ a lista ------------------------------ */
  let q = supabase.from("prospeccao").select("*").eq("org_id", org.id).limit(300);
  q = podeSites
    ? q.order("pontuacao", { ascending: false })
    : q.order("avaliacoes", { ascending: false, nullsFirst: false });
  if (filtro !== "todos") q = q.eq("status", filtro);
  if (busca !== "todas") {
    const [nicho, local] = busca.split("|");
    q = q.eq("nicho_busca", nicho).eq("local_busca", local);
  }
  if (procura) q = q.ilike("nome", `%${procura}%`);
  if (tagAtiva) q = q.eq("etiqueta", tagAtiva);
  const { data } = await q;
  let lista = (data as ProspectoRow[] | null) ?? [];

  /*
   * Lembrete vencido fura a fila: "me lembra dia 28" só funciona se, no dia
   * 28, o lead estiver na PRIMEIRA dobra. O "hoje" é o de Brasília.
   */
  const agora = relogio();
  const hojeBr = new Date(agora - 3 * 3_600_000).toISOString().slice(0, 10);
  const vencido = (p: ProspectoRow) => !!p.lembrete_em && p.lembrete_em <= hojeBr;

  /* ------------------ o que cada card precisa saber a mais ------------------ */
  const [{ data: cfgRR }, { data: tagsRaw }, espelhoLigado, { data: respRaw }, { data: abRaw }] =
    await Promise.all([
      supabase.from("prospeccao_config").select("respostas_rapidas").eq("org_id", org.id).maybeSingle(),
      supabase.from("prospeccao").select("etiqueta").eq("org_id", org.id).not("etiqueta", "is", null),
      funcaoLigada("espelho"),
      lista.length > 0
        ? supabase
            .from("prospeccao_mensagens")
            .select("prospecto_id, resposta_texto, resposta_classe, resposta_em, tipo")
            .eq("org_id", org.id)
            .not("resposta_em", "is", null)
            .in("prospecto_id", lista.map((p) => p.id))
            .order("resposta_em", { ascending: false })
        : Promise.resolve({ data: null }),
      lista.length > 0
        ? supabase
            .from("prospeccao_aberturas")
            .select("prospecto_id, created_at")
            .eq("org_id", org.id)
            .in("prospecto_id", lista.map((p) => p.id))
            .order("created_at", { ascending: false })
            .limit(1000)
        : Promise.resolve({ data: null }),
    ]);

  const brutoRR = (cfgRR as { respostas_rapidas: { t: string; x: string }[] | null } | null)?.respostas_rapidas;
  const respostasRapidas = Array.isArray(brutoRR) ? brutoRR.filter((r) => r?.t && r?.x) : [];

  const conta = new Map<string, number>();
  for (const t of (tagsRaw as { etiqueta: string | null }[] | null) ?? []) {
    if (t.etiqueta) conta.set(t.etiqueta, (conta.get(t.etiqueta) ?? 0) + 1);
  }
  const tagsEmUso = [...conta.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b2) => b2.total - a.total)
    .slice(0, 12);

  // A resposta mais recente de cada lead. `tipo` diz a QUE ela respondeu: à
  // resposta do gancho o card reage de outro jeito (a apresentação vai sozinha).
  const respostaPorProspecto = new Map<
    string,
    { texto: string; classe: string | null; em: string; tipo: string | null }
  >();
  for (const r of (respRaw as {
    prospecto_id: string;
    resposta_texto: string;
    resposta_classe: string | null;
    resposta_em: string;
    tipo: string | null;
  }[] | null) ?? []) {
    if (!respostaPorProspecto.has(r.prospecto_id)) {
      respostaPorProspecto.set(r.prospecto_id, {
        texto: r.resposta_texto,
        classe: r.resposta_classe,
        em: r.resposta_em,
        tipo: r.tipo,
      });
    }
  }

  const aberturasPorProspecto = new Map<string, { total: number; ultima: string }>();
  for (const a of (abRaw as { prospecto_id: string; created_at: string }[] | null) ?? []) {
    const atual = aberturasPorProspecto.get(a.prospecto_id);
    if (atual) atual.total++;
    else aberturasPorProspecto.set(a.prospecto_id, { total: 1, ultima: a.created_at });
  }

  // Ordem de urgência: lembrete de hoje → quente agora → o resto pela nota.
  const calor = (id: string) => {
    const ab = aberturasPorProspecto.get(id);
    if (!ab) return 0;
    const t = new Date(ab.ultima).getTime();
    return agora - t < 24 * 3_600_000 ? t : 0;
  };
  lista = [
    ...lista.filter(vencido),
    ...lista.filter((p) => !vencido(p)).sort((a, b2) => calor(b2.id) - calor(a.id)),
  ];

  /* ------------------- as pesquisas feitas, para o seletor ------------------- */
  const { data: buscasRaw } = await supabase
    .from("prospeccao")
    .select("nicho_busca, local_busca")
    .eq("org_id", org.id)
    .limit(2000);
  const contagem = new Map<string, { chave: string; rotulo: string; total: number }>();
  for (const p of (buscasRaw as { nicho_busca: string | null; local_busca: string | null }[] | null) ?? []) {
    const chave = `${p.nicho_busca ?? ""}|${p.local_busca ?? ""}`;
    const atual = contagem.get(chave);
    if (atual) atual.total++;
    else {
      const nicho = acharNicho(p.nicho_busca ?? "")?.rotulo ?? p.nicho_busca ?? "Sem nicho";
      contagem.set(chave, { chave, rotulo: p.local_busca ? `${nicho} · ${p.local_busca}` : nicho, total: 1 });
    }
  }
  const pesquisas = [...contagem.values()].sort((a, b2) => b2.total - a.total);
  const totalGeral = [...contagem.values()].reduce((acc, p) => acc + p.total, 0);

  /* -------------------- Instagram (só o modo Agência usa) -------------------- */
  let igOcupado = false;
  let igNoLimite = false;
  if (podeSites) {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const [{ count: igNaFila }, { count: igHoje }] = await Promise.all([
      supabase
        .from("prospeccao_tarefas")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("tipo", "instagram")
        .in("status", ["pendente", "rodando"]),
      supabase
        .from("prospeccao_tarefas")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("tipo", "instagram")
        .gte("created_at", inicioDia.toISOString()),
    ]);
    igOcupado = (igNaFila ?? 0) >= IG_FILA_MAX;
    igNoLimite = (igHoje ?? 0) >= IG_LIMITE_DIA;
  }

  const ctx: ContextoCard = { podeSites, espelhoLigado, igOcupado, igNoLimite, hojeBr, agora, respostasRapidas };
  const comFiltro = filtro !== "todos" || busca !== "todas" || Boolean(procura) || Boolean(tagAtiva);
  const comCelular = lista.filter((p) => temCelular(p.telefone)).length;

  const linkFiltro = (chave: string) =>
    `/app/prospeccao/leads?f=${chave}${busca !== "todas" ? `&b=${encodeURIComponent(busca)}` : ""}${
      procura ? `&q=${encodeURIComponent(qBruto ?? "")}` : ""
    }${tagAtiva ? `&tag=${encodeURIComponent(tagAtiva)}` : ""}`;

  return (
    <div className="painel-wrap flex flex-col gap-5">
      <div className="anim-entrada flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Leads 📋</h1>
          <p className="mt-1 text-sm text-paper-dim">
            {totalGeral > 0 ? (
              <>
                <b className="text-paper">{lista.length}</b>
                {comFiltro ? ` de ${totalGeral}` : ""} {lista.length === 1 ? "empresa" : "empresas"}
                {comCelular > 0 && (
                  <>
                    {" "}
                    · <b className="text-paper">{comCelular}</b> com WhatsApp
                  </>
                )}
              </>
            ) : (
              "Sua lista de empresas aparece aqui depois da primeira busca."
            )}
          </p>
        </div>
      </div>

      <Abas leads={totalGeral} />

      {totalGeral > 0 && (
        /*
         * A barra de ferramentas: tudo que recorta a lista, num lugar só, e
         * "grudada" no topo ao rolar — com 60 cards embaixo, mudar de filtro
         * não pode exigir voltar lá em cima.
         */
        <div className="sticky top-16 z-20 -mx-1 flex flex-col gap-2 rounded-xl border border-white/10 bg-ink/90 p-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            {pesquisas.length > 1 && (
              <SeletorPesquisa
                pesquisas={pesquisas}
                busca={busca}
                filtro={filtro}
                total={totalGeral}
                q={procura ? (qBruto ?? "") : undefined}
              />
            )}
            <div className="flex flex-wrap gap-0.5 rounded-lg border border-white/10 bg-ink-2 p-0.5">
              {FILTROS.map((x) => (
                <Link
                  key={x.chave}
                  href={linkFiltro(x.chave)}
                  className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                    filtro === x.chave ? "bg-brand text-white" : "text-paper-dim hover:bg-white/10 hover:text-paper"
                  }`}
                >
                  {x.rotulo}
                </Link>
              ))}
            </div>
            <BuscaNome />
            <div className="ml-auto flex items-center gap-2">
              <Exportar
                filtros={{ f: filtro, b: busca, q: procura || undefined, tag: tagAtiva || undefined }}
                quantidade={lista.length}
                comFiltro={comFiltro}
              />
            </div>
          </div>
          {tagsEmUso.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-paper-dim">Etiquetas</span>
              {tagsEmUso.map((t) => (
                <Link
                  key={t.nome}
                  href={tagAtiva === t.nome ? "/app/prospeccao/leads" : `/app/prospeccao/leads?tag=${encodeURIComponent(t.nome)}`}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold transition ${
                    tagAtiva === t.nome
                      ? "border-warn/60 bg-warn/15 text-warn"
                      : "border-white/15 text-paper-dim hover:border-warn/50 hover:text-warn"
                  }`}
                >
                  {t.nome} · {t.total}
                  {tagAtiva === t.nome ? " ✕" : ""}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {lista.length === 0 ? (
        <div className={`${cardClass} text-center`}>
          {totalGeral === 0 ? (
            <>
              <p className="text-4xl">🔎</p>
              <p className="mt-2 font-display text-lg font-extrabold">Nenhuma empresa ainda</p>
              <p className="mt-1 text-sm text-paper-dim">
                Faça a primeira busca e a lista aparece aqui, organizada.
              </p>
              <Link
                href="/app/prospeccao"
                className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2"
              >
                Buscar empresas →
              </Link>
            </>
          ) : (
            <p className="text-sm text-paper-dim">
              {procura ? `Nenhuma empresa com “${qBruto}” neste filtro.` : "Nenhuma empresa neste filtro."}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {lista.map((p, idx) => (
            <CardLead
              key={p.id}
              p={p}
              ctx={ctx}
              resposta={respostaPorProspecto.get(p.id)}
              abertura={aberturasPorProspecto.get(p.id)}
              atraso={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}
