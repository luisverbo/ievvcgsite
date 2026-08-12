import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/painel/queries";
import { createClient } from "@/lib/supabase/server";
import {
  getMetricasSite,
  type BotaoPorOrigem,
  type ConversaoOrigem,
  type LinhaContagem,
} from "@/lib/painel/analytics";
import { cardClass } from "@/components/painel/ui";

const PRESETS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "ontem", rotulo: "Ontem" },
  { chave: "7", rotulo: "7 dias" },
  { chave: "30", rotulo: "30 dias" },
  { chave: "90", rotulo: "90 dias" },
] as const;

const TZ = "America/Sao_Paulo";

// YYYY-MM-DD no fuso do Brasil.
function ymdLocal(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Meia-noite local (Brasil = UTC-3, sem horário de verão) de uma data YYYY-MM-DD.
function meiaNoiteLocal(ymd: string) {
  return new Date(`${ymd}T00:00:00-03:00`);
}

// Resolve o intervalo a partir dos parâmetros da URL.
function resolverIntervalo(
  p: string | undefined,
  de: string | undefined,
  ate: string | undefined,
): { desde: Date; ate: Date; rotulo: string; modo: string } {
  const validData = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  if (validData(de) && validData(ate)) {
    const dDesde = meiaNoiteLocal(de!);
    const dAte = new Date(meiaNoiteLocal(ate!).getTime() + 86_400_000); // fim do dia
    if (dDesde <= dAte) {
      return {
        desde: dDesde,
        ate: dAte,
        rotulo: de === ate ? formatarDia(de!) : `${formatarDia(de!)} – ${formatarDia(ate!)}`,
        modo: "custom",
      };
    }
  }

  const hojeYmd = ymdLocal(new Date());
  const inicioHoje = meiaNoiteLocal(hojeYmd);
  const agora = new Date();

  if (p === "hoje") {
    return { desde: inicioHoje, ate: agora, rotulo: "Hoje", modo: "hoje" };
  }
  if (p === "ontem") {
    const ini = new Date(inicioHoje.getTime() - 86_400_000);
    return { desde: ini, ate: inicioHoje, rotulo: "Ontem", modo: "ontem" };
  }
  const n = p === "7" || p === "90" ? Number(p) : 30;
  // N dias corridos terminando agora, alinhados à meia-noite local.
  const desde = new Date(inicioHoje.getTime() - (n - 1) * 86_400_000);
  return { desde, ate: agora, rotulo: `${n} dias`, modo: String(n) };
}

function formatarDia(ymd: string) {
  const [y, mo, d] = ymd.split("-");
  return `${d}/${mo}/${y}`;
}

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
  searchParams: Promise<{ p?: string; pg?: string; de?: string; ate?: string }>;
}) {
  const { id } = await params;
  const { p, pg, de, ate } = await searchParams;
  const filtroPagina = pg || undefined;
  const intervalo = resolverIntervalo(p, de, ate);
  const numDias = Math.max(1, Math.round((intervalo.ate.getTime() - intervalo.desde.getTime()) / 86_400_000));

  // Sites normais e páginas do construtor com IA compartilham esta tela: os
  // eventos vão para a mesma tabela, mudando só de qual registro vem o nome.
  let site = await getSite(id);
  let voltarPara = site ? `/app/sites/${site.id}` : "";
  if (!site) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sites_ia")
      .select("id, titulo")
      .eq("id", id)
      .maybeSingle();
    const ia = data as { id: string; titulo: string } | null;
    if (!ia) notFound();
    site = { id: ia.id, nome: ia.titulo } as NonNullable<typeof site>;
    voltarPara = `/app/ia/${ia.id}`;
  }

  const m = await getMetricasSite(site.id, { desde: intervalo.desde, ate: intervalo.ate }, filtroPagina);
  const urlBase = `/app/sites/${site.id}/metricas`;

  // Link de um preset, preservando o filtro de página atual.
  const linkPreset = (chave: string) => {
    const sp = new URLSearchParams();
    sp.set("p", chave);
    if (filtroPagina) sp.set("pg", filtroPagina);
    return `${urlBase}?${sp.toString()}`;
  };
  const linkSemFiltro = () => {
    const sp = new URLSearchParams();
    if (intervalo.modo === "custom") {
      sp.set("de", de!);
      sp.set("ate", ate!);
    } else {
      sp.set("p", intervalo.modo);
    }
    return `${urlBase}?${sp.toString()}`;
  };

  // Parâmetros do período atual (sem o pg), para preservar ao filtrar página.
  const paramsPeriodo =
    intervalo.modo === "custom" ? `de=${de}&ate=${ate}` : `p=${intervalo.modo}`;

  const hojeYmd = ymdLocal(new Date());

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
        <Link href={voltarPara} className="text-sm text-paper-dim hover:text-paper">
          ← {site.nome}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Métricas</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-ink-2 p-1">
              {PRESETS.map((per) => (
                <Link
                  key={per.chave}
                  href={linkPreset(per.chave)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                    per.chave === intervalo.modo ? "bg-brand text-white" : "text-paper-dim hover:text-paper"
                  }`}
                >
                  {per.rotulo}
                </Link>
              ))}
            </div>
            {/* intervalo personalizado */}
            <form method="get" className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-ink-2 p-1">
              {filtroPagina && <input type="hidden" name="pg" value={filtroPagina} />}
              <input
                type="date"
                name="de"
                max={hojeYmd}
                defaultValue={intervalo.modo === "custom" ? de : undefined}
                className="rounded-md bg-ink px-2 py-1.5 text-sm text-paper outline-none focus-visible:border-brand-2"
              />
              <span className="text-xs text-paper-dim">até</span>
              <input
                type="date"
                name="ate"
                max={hojeYmd}
                defaultValue={intervalo.modo === "custom" ? ate : undefined}
                className="rounded-md bg-ink px-2 py-1.5 text-sm text-paper outline-none focus-visible:border-brand-2"
              />
              <button
                type="submit"
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                  intervalo.modo === "custom" ? "bg-brand text-white" : "text-brand-2 hover:bg-brand/10"
                }`}
              >
                Aplicar
              </button>
            </form>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/8 px-3 py-1 text-sm font-semibold text-paper">
            📅 {intervalo.rotulo}
          </span>
          {filtroPagina ? (
            <>
              <span className="rounded-full bg-brand/20 px-3 py-1 text-sm font-bold text-brand-2">
                📄 {filtroPagina}
              </span>
              <Link href={linkSemFiltro()} className="text-sm text-paper-dim underline hover:text-paper">
                ← voltar para o site inteiro
              </Link>
            </>
          ) : (
            <span className="text-sm text-paper-dim">
              Dica: use links com{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5">?utm_source=instagram</code> para a
              origem ficar exata.
            </span>
          )}
        </div>
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
                {numDias <= 14 && <span className="text-[10px] text-paper-dim">{d.dia.split(",")[0]}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!filtroPagina && (
          <BarraLista titulo="Métricas por página" linhas={m.porPagina} linkBase={`${urlBase}?${paramsPeriodo}&pg=`} />
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
