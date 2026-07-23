import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite } from "@/lib/painel/queries";
import { getMetricasSite, type LinhaContagem } from "@/lib/painel/analytics";
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
};

function BarraLista({ titulo, linhas, corPor }: { titulo: string; linhas: LinhaContagem[]; corPor?: boolean }) {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  const soma = linhas.reduce((acc, l) => acc + l.total, 0);
  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-bold">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-paper-dim">Sem dados no período ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {linhas.map((l) => (
            <div key={l.rotulo}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-semibold">{l.rotulo}</span>
                <span className="flex-none text-paper-dim">
                  {l.total} · {soma > 0 ? Math.round((l.total / soma) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(l.total / max) * 100}%`,
                    background: corPor ? (CORES_ORIGEM[l.rotulo] ?? "var(--color-brand-2)") : "var(--color-brand-2)",
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

export default async function MetricasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const dias = PERIODOS.some((x) => x.dias === Number(p)) ? Number(p) : 30;

  const site = await getSite(id);
  if (!site) notFound();

  const m = await getMetricasSite(site.id, dias);

  const stats = [
    { rotulo: "Visitas", valor: m.visitas },
    { rotulo: "Cliques em botões", valor: m.cliques },
    { rotulo: "Leads", valor: m.leads },
    { rotulo: "Taxa de clique", valor: `${m.taxaClique}%` },
  ];

  const maxDia = Math.max(1, ...m.porDia.map((d) => d.visitas));
  const maxHora = Math.max(1, ...m.porHora.map((h) => h.visitas));

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
                href={`/app/sites/${site.id}/metricas?p=${per.dias}`}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  per.dias === dias ? "bg-brand text-white" : "text-paper-dim hover:text-paper"
                }`}
              >
                {per.rotulo}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-paper-dim">
          Dica: divulgue seus links com <code className="rounded bg-white/10 px-1.5 py-0.5">?utm_source=instagram</code>{" "}
          (ou facebook, google, tiktok…) para a origem ficar exata.
        </p>
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

      {/* visitas por dia */}
      <div className={cardClass}>
        <h2 className="mb-4 text-lg font-bold">Visitas por dia</h2>
        {m.visitas === 0 ? (
          <p className="text-sm text-paper-dim">
            Nenhuma visita registrada no período. Compartilhe o link do seu site para começar! 🚀
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
        <BarraLista titulo="De onde vêm as visitas" linhas={m.porOrigem} corPor />
        <BarraLista titulo="Cliques por botão" linhas={m.cliquesPorBotao} />
        <BarraLista titulo="Páginas mais visitadas" linhas={m.porPagina} />

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
