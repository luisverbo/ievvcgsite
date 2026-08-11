import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "../actions";
import Busca from "./Busca";
import Fila from "./Fila";
import {
  capturarInstagram,
  excluirProspecto,
  gerarSiteParaProspecto,
  mudarStatus,
} from "./actions";
import {
  faixa,
  ROTULO_SITUACAO,
  ROTULO_STATUS,
  type ProspectoRow,
  type StatusProspecto,
  type TarefaRow,
} from "@/lib/prospeccao/tipos";
import { acharNicho } from "@/lib/prospeccao/nichos";
import { usuarioInstagramDe, IG_FILA_MAX, IG_LIMITE_DIA } from "@/lib/prospeccao/instagram";
import { cardClass } from "@/components/painel/ui";
import { IconTrash } from "@/components/painel/icons";

export const maxDuration = 300;

const FILTROS: { chave: string; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "novo", rotulo: "Novos" },
  { chave: "contactado", rotulo: "Contactados" },
  { chave: "respondeu", rotulo: "Responderam" },
  { chave: "fechou", rotulo: "Fechados" },
];

// Fora do componente: o corpo do render precisa ser puro (regra do React).
function houveAgenteRecente(tarefas: TarefaRow[]) {
  const umaHoraAtras = new Date(Date.now() - 3_600_000).toISOString();
  return tarefas.some(
    (t) => t.agente && t.created_at > umaHoraAtras && t.status !== "pendente",
  );
}

// Só o WhatsApp de celular vale link direto; fixo não tem.
function linkWhatsapp(telefone: string | null) {
  if (!telefone) return null;
  const d = telefone.replace(/\D/g, "");
  if (!/9\d{8}$/.test(d)) return null;
  const completo = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${completo}`;
}

export default async function ProspeccaoPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; b?: string }>;
}) {
  if (!(await ehAdmin())) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();
  const { f, b } = await searchParams;
  const filtro = FILTROS.some((x) => x.chave === f) ? f! : "todos";
  // b = a busca que originou as empresas (nicho|local), para separar dentista
  // de advogado em vez de misturar tudo numa lista só.
  const busca = b ?? "todas";

  const supabase = await createClient();
  let q = supabase
    .from("prospeccao")
    .select("*")
    .eq("org_id", org.id)
    .order("pontuacao", { ascending: false })
    .limit(300);
  if (filtro !== "todos") q = q.eq("status", filtro);
  if (busca !== "todas") {
    const [nicho, local] = busca.split("|");
    q = q.eq("nicho_busca", nicho).eq("local_busca", local);
  }
  const { data } = await q;
  const lista = (data as ProspectoRow[] | null) ?? [];

  // Todas as pesquisas já feitas, para montar os atalhos.
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
      contagem.set(chave, {
        chave,
        rotulo: p.local_busca ? `${nicho} · ${p.local_busca}` : nicho,
        total: 1,
      });
    }
  }
  const pesquisas = [...contagem.values()].sort((a, b2) => b2.total - a.total);

  const { data: tarefasRaw } = await supabase
    .from("prospeccao_tarefas")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const tarefas = (tarefasRaw as TarefaRow[] | null) ?? [];

  // "Agente ativo" = alguém pegou tarefa na última hora. Serve só para avisar
  // que a busca do Google vai ficar parada se o agente não estiver ligado.
  const agenteAtivo = houveAgenteRecente(tarefas);

  /*
   * Quanto de Instagram já foi pedido — uma na fila por vez e um teto no dia.
   * O Instagram bloqueia por rajada, não por total: dez de uma vez derruba o
   * acesso, dez espalhados no dia passa. Ver o motivo no lugar do botão é
   * melhor que clicar e a captura falhar.
   */
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
  const igOcupado = (igNaFila ?? 0) >= IG_FILA_MAX;
  const igNoLimite = (igHoje ?? 0) >= IG_LIMITE_DIA;

  const { data: todosRaw } = await supabase
    .from("prospeccao")
    .select("status, pontuacao")
    .eq("org_id", org.id);
  const todos = (todosRaw as { status: string; pontuacao: number }[] | null) ?? [];

  const stats = [
    { rotulo: "Empresas", valor: todos.length },
    { rotulo: "Prioridade alta", valor: todos.filter((p) => p.pontuacao >= 75).length },
    { rotulo: "Contactadas", valor: todos.filter((p) => p.status !== "novo").length },
    { rotulo: "Fechadas", valor: todos.filter((p) => p.status === "fechou").length },
  ];

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app/admin" className="text-sm text-paper-dim hover:text-paper">
          ← Admin
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Prospecção 🎯</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Encontra empresas por nicho e região e dá uma <b className="text-paper">nota de
          potencial</b> — quanto maior, mais fácil de vender um site. Quem não tem site pontua
          alto; quem já tem site moderno fica no fim da fila.
        </p>
      </div>

      {todos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.rotulo} className="rounded-xl border border-white/10 bg-ink-2 p-4">
              <div className="text-2xl font-extrabold tabular-nums">{s.valor}</div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
                {s.rotulo}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">🔎 Buscar empresas</h2>
        <Busca agenteAtivo={agenteAtivo} />
      </div>

      <Fila tarefas={tarefas} />

      {todos.length > 0 && (
        <Link
          href="/app/admin/prospeccao/abordagem"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-2/40 bg-brand/10 px-5 py-4 transition hover:border-brand-2"
        >
          <span>
            <b className="text-paper">💬 Abordar no WhatsApp</b>
            <span className="ml-2 text-sm text-paper-dim">
              manda a primeira mensagem — manual ou automático
            </span>
          </span>
          <span className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">Abrir →</span>
        </Link>
      )}

      {pesquisas.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">
            Por pesquisa
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/app/admin/prospeccao?f=${filtro}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                busca === "todas"
                  ? "bg-brand text-white"
                  : "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
              }`}
            >
              Todas ({todos.length})
            </Link>
            {pesquisas.map((p) => (
              <Link
                key={p.chave}
                href={`/app/admin/prospeccao?f=${filtro}&b=${encodeURIComponent(p.chave)}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  busca === p.chave
                    ? "bg-brand text-white"
                    : "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
                }`}
              >
                {p.rotulo} ({p.total})
              </Link>
            ))}
          </div>
        </div>
      )}

      {todos.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-ink-2 p-1">
          {FILTROS.map((x) => (
            <Link
              key={x.chave}
              href={`/app/admin/prospeccao?f=${x.chave}${busca !== "todas" ? `&b=${encodeURIComponent(busca)}` : ""}`}
              className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                filtro === x.chave
                  ? "bg-brand text-white"
                  : "text-paper-dim hover:bg-white/10 hover:text-paper"
              }`}
            >
              {x.rotulo}
            </Link>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <p className={`${cardClass} text-sm text-paper-dim`}>
          {todos.length === 0
            ? "Nenhuma empresa ainda. Faça a primeira busca aí em cima."
            : "Nenhuma empresa neste filtro."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((p) => {
            const fx = faixa(p.pontuacao);
            const zap = linkWhatsapp(p.telefone);
            // Bloqueio e erro são temporários: cabe tentar de novo. Perfil
            // privado ou inexistente não muda, então ali o botão some de vez.
            const igTentavel =
              !!usuarioInstagramDe(p) &&
              (!p.ig_capturado_em || p.ig_status === "bloqueado" || p.ig_status === "erro");
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-2 p-4 transition hover:border-white/20 sm:flex-row"
              >
                {/* nota */}
                <div className="flex flex-none flex-row items-center gap-3 sm:w-28 sm:flex-col sm:items-start">
                  <div className={`text-4xl font-extrabold tabular-nums text-${fx.cor}`}>
                    {p.pontuacao}
                  </div>
                  <div className="text-xs font-bold text-paper-dim">
                    {fx.emoji} {fx.rotulo}
                  </div>
                </div>

                {/* dados */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{p.nome}</h3>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-paper-dim">
                      {ROTULO_SITUACAO[p.situacao]}
                    </span>
                    {p.status !== "novo" && (
                      <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[11px] font-bold text-brand-2">
                        {ROTULO_STATUS[p.status]}
                      </span>
                    )}
                  </div>

                  {p.endereco && <p className="mt-0.5 text-xs text-paper-dim">📍 {p.endereco}</p>}

                  {p.avaliacoes !== null && (
                    <p className="mt-0.5 text-xs text-paper-dim">
                      ⭐ {p.nota_media ? `${p.nota_media} · ` : ""}
                      {p.avaliacoes} {p.avaliacoes === 1 ? "avaliação" : "avaliações"} no Google
                    </p>
                  )}

                  {p.ig_status === "ok" && (
                    <div className="mt-2 rounded-lg border border-brand-2/30 bg-brand/10 p-2">
                      <p className="text-xs font-bold text-brand-2">
                        📸 Instagram capturado
                        {p.ig_seguidores ? ` · ${p.ig_seguidores.toLocaleString("pt-BR")} seguidores` : ""}
                        {p.ig_fotos.length ? ` · ${p.ig_fotos.length} fotos` : ""}
                      </p>
                      {p.ig_bio && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-paper-dim">{p.ig_bio}</p>
                      )}
                      {p.ig_fotos.length > 0 && (
                        <div className="mt-1.5 flex gap-1 overflow-x-auto">
                          {p.ig_fotos.slice(0, 6).map((f, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={f.url}
                              alt=""
                              className="h-12 w-12 flex-none rounded object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {p.ig_status && p.ig_status !== "ok" && (
                    <p className="mt-2 text-xs text-danger">📸 {p.ig_erro ?? p.ig_status}</p>
                  )}

                  <ul className="mt-2 flex flex-col gap-0.5">
                    {p.motivos.slice(0, 3).map((m, i) => (
                      <li key={i} className="text-xs text-paper-dim">
                        • {m}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {p.telefone && <span className="text-paper">📞 {p.telefone}</span>}
                    {p.instagram && (
                      <a
                        href={p.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-2 hover:underline"
                      >
                        Instagram ↗
                      </a>
                    )}
                    {p.fonte_url && (
                      <a
                        href={p.fonte_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-paper-dim hover:underline"
                      >
                        Ver no Maps ↗
                      </a>
                    )}
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        className="max-w-48 truncate text-paper-dim hover:underline"
                      >
                        {p.website.replace(/^https?:\/\//, "")} ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* ações */}
                <div className="flex flex-none flex-wrap items-start gap-2">
                  {zap && (
                    <a
                      href={zap}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-ok/40 px-3 py-2 text-xs font-bold text-ok transition hover:bg-ok/10"
                    >
                      WhatsApp
                    </a>
                  )}
                  {igTentavel &&
                    (igOcupado || igNoLimite ? (
                      <span
                        title={
                          igOcupado
                            ? "O agente lê um perfil por vez, com alguns minutos de intervalo — é o que evita o bloqueio do Instagram."
                            : `Teto de ${IG_LIMITE_DIA} perfis por dia, para não queimar o acesso. Amanhã libera.`
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-paper-dim/60"
                      >
                        {igOcupado ? "📸 aguarde a vez" : "📸 limite do dia"}
                      </span>
                    ) : (
                      <form action={capturarInstagram.bind(null, p.id)}>
                        <button
                          type="submit"
                          title="O agente lê a bio e baixa as fotos, para usar no site"
                          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-brand-2 hover:text-brand-2"
                        >
                          📸 {p.ig_capturado_em ? "Tentar de novo" : "Buscar Instagram"}
                        </button>
                      </form>
                    ))}
                  {p.site_ia_id ? (
                    <Link
                      href={`/app/admin/ia/${p.site_ia_id}`}
                      className="rounded-lg border border-brand-2/50 px-3 py-2 text-xs font-bold text-brand-2 transition hover:bg-brand/10"
                    >
                      Ver site
                    </Link>
                  ) : (
                    <form action={gerarSiteParaProspecto.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-2"
                      >
                        ✨ Gerar site
                      </button>
                    </form>
                  )}
                  <form
                    action={mudarStatus.bind(
                      null,
                      p.id,
                      (p.status === "novo" ? "contactado" : "novo") as StatusProspecto,
                    )}
                  >
                    <button
                      type="submit"
                      title={p.status === "novo" ? "Marcar como contactado" : "Voltar para novo"}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-white/30 hover:text-paper"
                    >
                      {p.status === "novo" ? "Contactei" : "↺"}
                    </button>
                  </form>
                  {p.status === "contactado" && (
                    <form action={mudarStatus.bind(null, p.id, "fechou" as StatusProspecto)}>
                      <button
                        type="submit"
                        title="Marcar como fechado"
                        className="rounded-lg border border-ok/40 px-3 py-2 text-xs font-bold text-ok transition hover:bg-ok/10"
                      >
                        Fechou 🎉
                      </button>
                    </form>
                  )}
                  <form action={excluirProspecto.bind(null, p.id)}>
                    <button
                      type="submit"
                      title="Remover da lista"
                      className="rounded-lg border border-white/15 px-2.5 py-2 text-paper-dim transition hover:border-danger hover:text-danger"
                    >
                      <IconTrash size={14} />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-paper-dim">
        ℹ️ A busca daqui usa o <b className="text-paper">OpenStreetMap</b> — gratuito e sem
        bloqueio, porém com menos cadastros. Para resultados do{" "}
        <b className="text-paper">Google Maps</b>, com avaliações e nota, rode o agente local no seu
        computador: <code className="text-paper">cd agente && npm run prospectar -- --nicho=dentista
        --local=&quot;Barra da Tijuca, RJ&quot;</code>. As empresas caem nesta mesma lista.
      </p>
    </div>
  );
}
