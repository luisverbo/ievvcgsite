import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/painel/queries";
import {
  getMetricasSite,
  type BotaoPorOrigem,
  type ConversaoOrigem,
  type LinhaContagem,
} from "@/lib/painel/analytics";
import { cardClass } from "@/components/painel/ui";

const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

const CORES_ORIGEM: Record<string, string> = {
  Instagram: "#ea5c93",
  Facebook: "#3f8cff",
  Google: "#f4a62a",
  WhatsApp: "#37b08a",
  TikTok: "#8e7bff",
  YouTube: "#ef5b43",
  "Twitter/X": "#a6adbd",
  Direto: "#6c5ce7",
  "Sem origem": "#5a6070",
};

const CORES_EXTRA = ["#4cc38a", "#f06a9b", "#7aa2e3", "#e7b64b", "#b57ae0"];

function corOrigem(origem: string, i: number) {
  return CORES_ORIGEM[origem] ?? CORES_EXTRA[i % CORES_EXTRA.length];
}

// Origens com visitas × cliques × taxa de conversão do canal.
function OrigensCard({ linhas }: { linhas: ConversaoOrigem[] }) {
  const maxVisitas = Math.max(1, ...linhas.map((l) => l.visitas));
  return (
    <div className={cardClass}>
      <h2 className="mb-1 text-lg font-bold">De onde vêm as visitas — e quem clica</h2>
      <p className="mb-4 text-xs text-paper-dim">
        Taxa = cliques ÷ visitas do canal. É o canal que traz gente que age, não só visita.
      </p>
      {linhas.length === 0 ? (
        <p className="text-sm text-paper-dim">Sem dados no período ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {linhas.map((l, i) => (
            <div key={l.origem}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 truncate font-semibold">
                  <i
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ background: corOrigem(l.origem, i) }}
                  />
                  {l.origem}
                </span>
                <span className="flex-none text-paper-dim">
                  {l.visitas} visitas · {l.cliques} cliques ·{" "}
                  <b className={l.taxa >= 10 ? "text-ok" : "text-paper"}>{l.taxa}%</b>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(l.visitas / maxVisitas) * 100}%`,
                    background: corOrigem(l.origem, i),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Cada botão com barra empilhada por origem do clique.
function BotoesOrigemCard({ titulo, linhas }: { titulo: string; linhas: BotaoPorOrigem[] }) {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  return (
    <div className={cardClass}>
      <h2 className="mb-1 text-lg font-bold">{titulo}</h2>
      <p className="mb-4 text-xs text-paper-dim">
        Cada cor mostra de onde veio quem clicou naquele botão.
      </p>
      {linhas.length === 0 ? (
        <p className="text-sm text-paper-dim">Sem cliques no período ainda.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {linhas.map((l) => (
            <div key={l.botao}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-semibold">{l.botao}</span>
                <span className="flex-none text-paper-dim">{l.total}</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8">
                {l.porOrigem.map((seg, i) => (
                  <div
                    key={seg.rotulo}
                    title={`${seg.rotulo}: ${seg.total}`}
                    style={{
                      width: `${(seg.total / max) * 100}%`,
                      background: corOrigem(seg.rotulo, i),
                    }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {l.porOrigem.map((seg, i) => (
                  <span key={seg.rotulo} className="flex items-center gap-1.5 text-[11px] text-paper-dim">
                    <i
                      className="h-2 w-2 rounded-full"
                      style={{ background: corOrigem(seg.rotulo, i) }}
                    />
                    {seg.rotulo} · {seg.total}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatarTempo(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function BarraLista({
  titulo,
  linhas,
  corPor,
  linkBase,
}: {
  titulo: string;
  linhas: LinhaContagem[];
  corPor?: boolean;
  linkBase?: string; // se presente, cada linha vira link (filtro por página)
}) {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  const soma = linhas.reduce((acc, l) => acc + l.total, 0);
  return (
    <div className={cardClass}>
      <h2 className="mb-1 text-lg font-bold">{titulo}</h2>
      {linkBase && (
        <p className="mb-3 text-xs text-paper-dim">Clique numa página para ver só as métricas dela.</p>
      )}
      {linhas.length === 0 ? (
        <p className="mt-3 text-sm text-paper-dim">Sem dados no período ainda.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {linhas.map((l) => {
            const conteudo = (
              <>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className={`truncate font-semibold ${linkBase ? "text-brand-2" : ""}`}>
                    {l.rotulo}
                  </span>
                  <span className="flex-none text-paper-dim">
                    {l.total} · {soma > 0 ? Math.round((l.total / soma) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(l.total / max) * 100}%`,
                      background: corPor
                        ? (CORES_ORIGEM[l.rotulo] ?? "var(--color-brand-2)")
                        : "var(--color-brand-2)",
                    }}
                  />
                </div>
              </>
            );
            return linkBase ? (
              <Link key={l.rotulo} href={`${linkBase}${encodeURIComponent(l.rotulo)}`} className="block hover:opacity-80">
                {conteudo}
              </Link>
            ) : (
              <div key={l.rotulo}>{conteudo}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Cor "de calor" da zona: cinza (frio) → dourado → vermelho (quente).
function corCalor(ratio: number) {
  if (ratio <= 0.02) return "rgba(244,246,251,0.08)";
  if (ratio < 0.35) return `color-mix(in srgb, #f4a62a ${Math.round(ratio * 160)}%, rgba(244,246,251,0.10))`;
  return `color-mix(in srgb, #ef5b43 ${Math.round(ratio * 100)}%, #f4a62a)`;
}

export default async function MetricasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string; pg?: string }>;
}) {
  const { id } = await params;
  const { p, pg } = await searchParams;
  const dias = PERIODOS.some((x) => x.dias === Number(p)) ? Number(p) : 30;
  const filtroPagina = pg || undefined;

  const site = await getSite(id);
  if (!site) notFound();

  const m = await getMetricasSite(site.id, dias, filtroPagina);
  const urlBase = `/app/sites/${site.id}/metricas`;
  const qs = (novoP?: number, novoPg?: string | null) => {
    const sp = new URLSearchParams();
    sp.set("p", String(novoP ?? dias));
    const pagina = novoPg === undefined ? filtroPagina : (novoPg ?? undefined);
    if (pagina) sp.set("pg", pagina);
    return `${urlBase}?${sp.toString()}`;
  };

  const stats = [
    { rotulo: "Visitas", valor: m.visitas },
    { rotulo: "Cliques em botões", valor: m.cliques },
    { rotulo: "Taxa de clique", valor: `${m.taxaClique}%` },
    filtroPagina
      ? { rotulo: "Tempo médio na página", valor: m.tempoMedio != null ? formatarTempo(m.tempoMedio) : "—" }
      : { rotulo: "Leads", valor: m.leads },
  ];

  const maxDia = Math.max(1, ...m.porDia.map((d) => d.visitas));
  const maxHora = Math.max(1, ...m.porHora.map((h) => h.visitas));
  const maxTempoZona = Math.max(1, ...m.zonasCalor.map((z) => z.tempo));

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div>
        <Link href={`/app/sites/${site.id}`} className="text-sm text-paper-dim hover:text-paper">
          ← {site.nome}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Métricas</h1>
          <div className="flex gap-1 rounded-lg border border-white/10 bg-ink-2 p-1">
            {PERIODOS.map((per) => (
              <Link
                key={per.dias}
                href={qs(per.dias)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  per.dias === dias ? "bg-brand text-white" : "text-paper-dim hover:text-paper"
                }`}
              >
                {per.rotulo}
              </Link>
            ))}
          </div>
        </div>

        {filtroPagina ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand/20 px-3 py-1 text-sm font-bold text-brand-2">
              📄 {filtroPagina}
            </span>
            <Link href={qs(dias, null)} className="text-sm text-paper-dim underline hover:text-paper">
              ← voltar para o site inteiro
            </Link>
          </div>
        ) : (
          <p className="mt-1 text-sm text-paper-dim">
            Dica: divulgue seus links com{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5">?utm_source=instagram</code> (ou
            facebook, google, tiktok…) para a origem ficar exata.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.rotulo} className="rounded-xl border border-white/10 bg-ink-2 p-4">
            <div className="text-2xl font-extrabold">{s.valor}</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-paper-dim">
              {s.rotulo}
            </div>
          </div>
        ))}
      </div>

      {/* mapa de calor de rolagem — só na visão de uma página */}
      {filtroPagina && (
        <div className={cardClass}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">🔥 Mapa de calor de rolagem</h2>
            {m.scrollMedio != null && (
              <span className="text-sm text-paper-dim">
                Em média, os visitantes veem <b className="text-paper">{m.scrollMedio}%</b> da página
              </span>
            )}
          </div>
          <p className="mb-4 text-xs text-paper-dim">
            Cada faixa é 10% da altura da página. Quanto mais quente a cor, mais tempo os visitantes
            passaram ali. “Chegaram” = % que rolou até a faixa; “saíram aqui” = % que abandonou nela.
          </p>
          {m.zonasCalor.length === 0 ? (
            <p className="text-sm text-paper-dim">
              Ainda não há dados de rolagem. Eles começam a aparecer com as próximas visitas (é
              preciso rodar o SQL <code className="rounded bg-white/10 px-1">2026-07-04_metricas_saida.sql</code>).
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {m.zonasCalor.map((z) => {
                const ratio = z.tempo / maxTempoZona;
                return (
                  <div key={z.zona} className="flex items-center gap-3">
                    <span className="w-16 flex-none text-right text-xs tabular-nums text-paper-dim">
                      {z.zona - 10}–{z.zona}%
                    </span>
                    <div className="relative h-9 flex-1 overflow-hidden rounded-md" style={{ background: corCalor(ratio) }}>
                      <div className="absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-paper">
                        {z.tempo > 0 ? formatarTempo(z.tempo) : ""}
                      </div>
                    </div>
                    <span className="w-40 flex-none text-xs text-paper-dim">
                      {z.alcance}% chegaram
                      {z.saida > 0 && <b className="ml-1 text-danger">· {z.saida}% saíram aqui</b>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* visitas por dia */}
      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">Visitas por dia</h2>
        {m.visitas === 0 ? (
          <p className="text-sm text-paper-dim">
            Nenhuma visita registrada no período. Compartilhe o link para começar! 🚀
          </p>
        ) : (
          <div className="flex h-36 items-end gap-[3px] overflow-x-auto">
            {m.porDia.map((d) => (
              <div key={d.dia} className="group flex min-w-[14px] flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-paper-dim opacity-0 transition group-hover:opacity-100">
                  {d.visitas}
                </span>
                <div
                  className="w-full rounded-t bg-brand-2/80 transition group-hover:bg-brand-2"
                  style={{ height: `${Math.max(2, (d.visitas / maxDia) * 100)}%` }}
                  title={`${d.dia}: ${d.visitas} visitas`}
                />
                {dias === 7 && <span className="text-[10px] text-paper-dim">{d.dia.split(",")[0]}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!filtroPagina && (
          <BarraLista titulo="Métricas por página" linhas={m.porPagina} linkBase={`${urlBase}?p=${dias}&pg=`} />
        )}
        <OrigensCard linhas={m.conversaoPorOrigem} />
        <BotoesOrigemCard
          titulo={filtroPagina ? "Cliques por botão e origem (só desta página)" : "Cliques por botão e origem"}
          linhas={m.botoesPorOrigem}
        />

        {/* horários */}
        <div className={cardClass}>
          <h2 className="mb-4 text-lg font-bold">Horários de acesso</h2>
          {m.visitas === 0 ? (
            <p className="text-sm text-paper-dim">Sem dados no período ainda.</p>
          ) : (
            <div className="flex h-28 items-end gap-[2px]">
              {m.porHora.map((h) => (
                <div key={h.hora} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-warn/70"
                    style={{ height: `${Math.max(2, (h.visitas / maxHora) * 100)}%` }}
                    title={`${h.hora}h: ${h.visitas} visitas`}
                  />
                  {h.hora % 6 === 0 && (
                    <span className="text-[10px] text-paper-dim">{h.hora}h</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
