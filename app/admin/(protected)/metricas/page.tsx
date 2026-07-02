import { getMetricas } from "@/lib/admin/analytics";
import Bars from "./Bars";
import { cardClass } from "../ui";

export const dynamic = "force-dynamic";

function StatTile({ label, valor }: { label: string; valor: number }) {
  return (
    <div className={cardClass}>
      <div className="font-display text-3xl font-extrabold text-gold tabular-nums">{valor}</div>
      <div className="mt-1 text-sm text-cream-dim">{label}</div>
    </div>
  );
}

export default async function MetricasPage() {
  const m = await getMetricas();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-extrabold">Métricas</h1>
        <p className="text-sm text-cream-dim">Dados dos últimos 30 dias · horário de Brasília.</p>
      </div>

      {m.semDados ? (
        <div className={cardClass}>
          <p className="text-cream-dim">
            Ainda não há dados. Assim que as pessoas começarem a acessar o site, as visitas e
            cliques aparecem aqui. (Se você acabou de publicar, rode o SQL de métricas no Supabase.)
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Visitas (30 dias)" valor={m.totalVisitas} />
            <StatTile label="Cliques em botões" valor={m.totalCliques} />
            <StatTile label="Visitas hoje" valor={m.visitasHoje} />
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
