import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "../actions";
import Busca from "./Busca";
import { excluirProspecto, gerarSiteParaProspecto, mudarStatus } from "./actions";
import {
  faixa,
  ROTULO_SITUACAO,
  ROTULO_STATUS,
  type ProspectoRow,
  type StatusProspecto,
} from "@/lib/prospeccao/tipos";
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
  searchParams: Promise<{ f?: string }>;
}) {
  if (!(await ehAdmin())) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();
  const { f } = await searchParams;
  const filtro = FILTROS.some((x) => x.chave === f) ? f! : "todos";

  const supabase = await createClient();
  let q = supabase
    .from("prospeccao")
    .select("*")
    .eq("org_id", org.id)
    .order("pontuacao", { ascending: false })
    .limit(300);
  if (filtro !== "todos") q = q.eq("status", filtro);
  const { data } = await q;
  const lista = (data as ProspectoRow[] | null) ?? [];

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
        <Busca />
      </div>

      {todos.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-ink-2 p-1">
          {FILTROS.map((x) => (
            <Link
              key={x.chave}
              href={`/app/admin/prospeccao?f=${x.chave}`}
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
        ℹ️ A busca usa o <b className="text-paper">OpenStreetMap</b>, que é gratuito e livre de
        bloqueios, mas tem menos cadastros que o Google — em cidade grande vai bem, em cidade
        pequena pode vir pouca coisa. O eixo de <b className="text-paper">vitalidade</b> hoje mede o
        quanto o cadastro está preenchido; quando ligarmos o agente do Google, ele passa a usar
        avaliações e recência, que é um sinal bem mais forte.
      </p>
    </div>
  );
}
