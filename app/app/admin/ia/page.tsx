import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { getAnthropicKey } from "@/lib/ia/anthropic";
import { MODELOS_IA } from "@/lib/ia/modelos";
import { ehAdmin } from "../actions";
import NovaPagina from "./NovaPagina";
import { excluirPaginaIA, type SiteIA } from "./actions";
import { cardClass } from "@/components/painel/ui";
import { IconTrash } from "@/components/painel/icons";

// Cor de capa por página, derivada do id — cada card ganha identidade própria.
const CAPAS = [
  ["#6c5ce7", "#a29bfe"],
  ["#e8843c", "#f5b76b"],
  ["#2fbf8f", "#7ee0bd"],
  ["#e15c8a", "#f59bbb"],
  ["#3f8cff", "#8ec1ff"],
  ["#c2657f", "#e8a7b8"],
];

function capaDaPagina(id: string) {
  let soma = 0;
  for (const ch of id) soma += ch.charCodeAt(0);
  return CAPAS[soma % CAPAS.length];
}

// Fora do componente: mantém o corpo do render puro (regra do React).
function desde30Dias() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString();
}

export default async function PaginasIAPage() {
  if (!(await ehAdmin())) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const [chave, supabase] = await Promise.all([getAnthropicKey(), createClient()]);
  const { data } = await supabase
    .from("sites_ia")
    .select("*")
    .eq("org_id", org.id)
    .order("updated_at", { ascending: false });
  const paginas = (data as SiteIA[] | null) ?? [];

  // Nome da empresa de cada página que veio da prospecção.
  const idsProspecto = paginas.map((p) => p.prospecto_id).filter(Boolean) as string[];
  const empresaPorId = new Map<string, string>();
  if (idsProspecto.length) {
    const { data: emps } = await supabase
      .from("prospeccao")
      .select("id, nome")
      .in("id", idsProspecto);
    for (const e of (emps as { id: string; nome: string }[] | null) ?? []) {
      empresaPorId.set(e.id, e.nome);
    }
  }

  // Visitas e cliques dos últimos 30 dias. As páginas de IA gravam os eventos
  // com site_id = id da própria página, então basta agrupar por ele.
  const { data: eventos } = await supabase
    .from("analytics_eventos")
    .select("site_id, tipo")
    .eq("org_id", org.id)
    .gte("created_at", desde30Dias())
    .limit(20000);

  const porPagina = new Map<string, { visitas: number; cliques: number }>();
  for (const e of (eventos as { site_id: string; tipo: string }[] | null) ?? []) {
    const m = porPagina.get(e.site_id) ?? { visitas: 0, cliques: 0 };
    if (e.tipo === "pageview") m.visitas++;
    else if (e.tipo === "click") m.cliques++;
    porPagina.set(e.site_id, m);
  }

  const noAr = paginas.filter((p) => p.publicado).length;
  const totalVisitas = paginas.reduce((s, p) => s + (porPagina.get(p.id)?.visitas ?? 0), 0);
  const totalCliques = paginas.reduce((s, p) => s + (porPagina.get(p.id)?.cliques ?? 0), 0);

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href="/app/admin" className="text-sm text-paper-dim hover:text-paper">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">Construtor de páginas com IA ✨</h1>
        <p className="mt-1 text-sm text-paper-dim">
          Aqui a IA escreve o site inteiro — sem blocos, com liberdade total de layout, efeitos e
          animações. Você conversa com ela até a página ficar do jeito que quer.
        </p>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">Nova página</h2>
        <NovaPagina temChave={Boolean(chave)} />
      </div>

      {paginas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { rotulo: "Páginas", valor: paginas.length },
            { rotulo: "No ar", valor: noAr },
            { rotulo: "Visitas (30d)", valor: totalVisitas },
            { rotulo: "Cliques (30d)", valor: totalCliques },
          ].map((s) => (
            <div key={s.rotulo} className="rounded-xl border border-white/10 bg-ink-2 p-4">
              <div className="text-2xl font-extrabold tabular-nums">{s.valor}</div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
                {s.rotulo}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-dim">
            Minhas páginas ({paginas.length})
          </h2>
          <span className="text-xs text-paper-dim">números dos últimos 30 dias</span>
        </div>
        {paginas.length === 0 ? (
          <p className={`${cardClass} text-sm text-paper-dim`}>
            Nenhuma página ainda. Crie a primeira aí em cima e descreva o que você quer no chat.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginas.map((p) => {
              const m = porPagina.get(p.id) ?? { visitas: 0, cliques: 0 };
              const [c1, c2] = capaDaPagina(p.id);
              // Taxa de clique: o número que realmente diz se a página vende.
              const taxa = m.visitas > 0 ? Math.round((m.cliques / m.visitas) * 100) : null;
              return (
                <div
                  key={p.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-2 transition hover:-translate-y-1 hover:border-brand-2/50 hover:shadow-2xl"
                >
                  <Link href={`/app/admin/ia/${p.id}`} className="block">
                    <div
                      className="relative flex h-28 items-end p-4"
                      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                    >
                      <span
                        className="absolute inset-0 opacity-25"
                        style={{
                          background:
                            "radial-gradient(120% 80% at 90% 0%, rgba(255,255,255,.55), transparent 60%)",
                        }}
                      />
                      <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                        {p.publicado ? "● No ar" : p.html ? "○ Rascunho" : "○ Vazia"}
                      </span>
                      <span className="relative line-clamp-2 font-display text-xl font-extrabold text-white drop-shadow">
                        {p.titulo}
                      </span>
                    </div>
                  </Link>

                  <div className="grid grid-cols-3 divide-x divide-white/8 border-b border-white/8">
                    {[
                      { rot: "visitas", val: m.visitas, cor: "text-paper" },
                      { rot: "cliques", val: m.cliques, cor: "text-brand-2" },
                      { rot: "conversão", val: taxa === null ? "—" : `${taxa}%`, cor: "text-ok" },
                    ].map((x) => (
                      <div key={x.rot} className="px-2 py-3 text-center">
                        <div className={`text-lg font-extrabold tabular-nums ${x.cor}`}>{x.val}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-paper-dim">
                          {x.rot}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-xs text-paper-dim">
                      {p.publicado ? (
                        <a
                          href={`/ia/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ok underline decoration-ok/40 underline-offset-2 hover:decoration-ok"
                        >
                          /ia/{p.slug} ↗
                        </a>
                      ) : (
                        `/ia/${p.slug}`
                      )}
                    </span>
                    <span className="flex flex-none items-center gap-1">
                      {p.html && (
                        <a
                          href={`/app/admin/ia/${p.id}/baixar`}
                          title="Baixar o site pronto (HTML + imagens)"
                          className="rounded-lg px-2 py-1 text-sm text-paper-dim transition hover:bg-white/10 hover:text-paper"
                        >
                          ⬇
                        </a>
                      )}
                      {p.publicado && (
                        <Link
                          href={`/app/sites/${p.id}/metricas`}
                          title="Métricas"
                          className="rounded-lg px-2 py-1 text-sm text-paper-dim transition hover:bg-white/10 hover:text-paper"
                        >
                          📊
                        </Link>
                      )}
                      <Link
                        href={`/app/admin/ia/${p.id}`}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-2"
                      >
                        Abrir
                      </Link>
                      <form action={excluirPaginaIA.bind(null, p.id)}>
                        <button
                          type="submit"
                          title="Excluir página"
                          className="flex items-center justify-center rounded-lg border border-white/15 px-2 py-1.5 text-paper-dim transition hover:border-danger hover:text-danger"
                        >
                          <IconTrash size={14} />
                        </button>
                      </form>
                    </span>
                  </div>

                  <p className="border-t border-white/8 px-4 py-2 text-[11px] text-paper-dim">
                    {p.prospecto_id && empresaPorId.get(p.prospecto_id) && (
                      <>
                        <span className="font-bold text-brand-2">
                          🎯 {empresaPorId.get(p.prospecto_id)}
                        </span>{" "}
                        ·{" "}
                      </>
                    )}
                    {MODELOS_IA[p.modelo]?.rotulo ?? p.modelo} · atualizada em{" "}
                    {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
