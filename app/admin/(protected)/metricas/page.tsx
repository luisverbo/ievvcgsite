import { getMetricas, inicioDoDiaSP, type Periodo } from "@/lib/admin/analytics";
import Bars from "./Bars";
import PeriodoForm from "./PeriodoForm";
import { cardClass } from "../ui";

export const dynamic = "force-dynamic";

type SP = { periodo?: string; de?: string; ate?: string };

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function resolveRange(sp: SP): { range: Periodo; rotulo: string; periodo: string } {
  // Intervalo personalizado tem prioridade quando as duas datas são válidas.
  if (sp.de && sp.ate && DATA_RE.test(sp.de) && DATA_RE.test(sp.ate)) {
    return {
      range: {
        desde: new Date(`${sp.de}T00:00:00-03:00`),
        ate: new Date(`${sp.ate}T23:59:59-03:00`),
      },
      rotulo: `${sp.de.split("-").reverse().join("/")} até ${sp.ate.split("-").reverse().join("/")}`,
      periodo: "",
    };
  }
  const dias = [7, 14, 30, 90].includes(Number(sp.periodo)) ? Number(sp.periodo) : 30;
  return {
    range: { desde: inicioDoDiaSP(new Date(Date.now() - (dias - 1) * 86400000)), ate: new Date() },
    rotulo: `últimos ${dias} dias`,
    periodo: String(dias),
  };
}

function StatTile({ label, valor }: { label: string; valor: number }) {
  return (
    <div className={cardClass}>
      <div className="font-display text-3xl font-extrabold text-gold tabular-nums">{valor}</div>
      <div className="mt-1 text-sm text-cream-dim">{label}</div>
    </div>
  );
}

export default async function MetricasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { range, rotulo, periodo } = resolveRange(sp);
  const m = await getMetricas(range);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-extrabold">Métricas</h1>
        <p className="text-sm text-cream-dim">
          Só da página pública · {rotulo} · horário de Brasília.
        </p>
      </div>

      <div className={cardClass}>
        <PeriodoForm periodo={periodo} de={sp.de} ate={sp.ate} />
      </div>

      {m.semDados ? (
        <div className={cardClass}>
          <p className="text-cream-dim">
            Nenhum dado neste período. As visitas e cliques aparecem aqui conforme as pessoas
            acessam o site. (Se acabou de publicar, rode os SQLs de métricas no Supabase.)
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Visitas no período" valor={m.totalVisitas} />
            <StatTile label="Cliques em botões" valor={m.totalCliques} />
            <StatTile label="Visitas hoje" valor={m.visitasHoje} />
          </div>

          <div className={cardClass}>
            <h2 className="mb-1 font-display text-lg font-extrabold">Origem das visitas</h2>
            <p className="mb-4 text-sm text-cream-dim">
              De onde as pessoas vieram. Use links com <code>?utm_source=instagram</code> (ou
              facebook) para medir com precisão — redes sociais costumam esconder essa informação.
            </p>
            {m.porOrigem.length > 0 ? (
              <Bars dados={m.porOrigem} cor="var(--color-violet)" />
            ) : (
              <p className="text-sm text-cream-dim">Sem visitas no período.</p>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-4 font-display text-lg font-extrabold">Visitas por dia</h2>
            <Bars dados={m.porDia} cor="var(--color-gold)" />
          </div>

          <div className={cardClass}>
            <h2 className="mb-1 font-display text-lg font-extrabold">Cliques por botão</h2>
            <p className="mb-4 text-sm text-cream-dim">Qual botão as pessoas mais clicaram.</p>
            {m.porBotao.length > 0 ? (
              <Bars dados={m.porBotao} cor="var(--color-coral)" />
            ) : (
              <p className="text-sm text-cream-dim">Nenhum clique registrado ainda.</p>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-1 font-display text-lg font-extrabold">Horários de acesso</h2>
            <p className="mb-4 text-sm text-cream-dim">
              Em que horas do dia as pessoas mais entram no site.
            </p>
            <Bars dados={m.porHora} cor="var(--color-green)" />
          </div>
        </>
      )}
    </div>
  );
}
