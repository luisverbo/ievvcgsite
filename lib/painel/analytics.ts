import "server-only";

import { createClient } from "@/lib/supabase/server";

// Agregações das métricas de um site (visitas, cliques, origens, horários).
// Volume MVP: busca os eventos do período e agrega em memória.

const TZ = "America/Sao_Paulo";

export type LinhaContagem = { rotulo: string; total: number };

export type MetricasSite = {
  visitas: number;
  cliques: number;
  leads: number;
  taxaClique: number; // % de visitas que clicaram em algum botão
  porOrigem: LinhaContagem[];
  cliquesPorBotao: LinhaContagem[];
  porPagina: LinhaContagem[];
  porDia: { dia: string; visitas: number }[]; // "seg 01/07"
  porHora: { hora: number; visitas: number }[];
};

type Evento = {
  tipo: "pageview" | "click";
  rotulo: string | null;
  path: string | null;
  origem: string | null;
  created_at: string;
};

function chaveDia(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

function horaLocal(iso: string) {
  return Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", hour12: false }).format(
      new Date(iso),
    ),
  );
}

function top(mapa: Map<string, number>, limite = 8): LinhaContagem[] {
  return [...mapa.entries()]
    .map(([rotulo, total]) => ({ rotulo, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

export async function getMetricasSite(siteId: string, dias: number): Promise<MetricasSite> {
  const supabase = await createClient();
  const desdeMs = Date.now() - dias * 86_400_000;
  const desde = new Date(desdeMs).toISOString();

  const [{ data: eventosRaw }, { count: leads }] = await Promise.all([
    supabase
      .from("analytics_eventos")
      .select("tipo, rotulo, path, origem, created_at")
      .eq("site_id", siteId)
      .gte("created_at", desde)
      .order("created_at", { ascending: true })
      .limit(20000),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .gte("created_at", desde),
  ]);

  const eventos = (eventosRaw as Evento[] | null) ?? [];

  let visitas = 0;
  let cliques = 0;
  const origens = new Map<string, number>();
  const botoes = new Map<string, number>();
  const paginas = new Map<string, number>();
  const porDiaMapa = new Map<string, number>();
  const porHoraMapa = new Map<number, number>();

  // Pré-cria os dias do período (na ordem), para o gráfico não ter buracos.
  for (let i = dias - 1; i >= 0; i--) {
    porDiaMapa.set(chaveDia(new Date(Date.now() - i * 86_400_000).toISOString()), 0);
  }

  for (const e of eventos) {
    if (e.tipo === "pageview") {
      visitas++;
      const origem = e.origem || "Direto";
      origens.set(origem, (origens.get(origem) ?? 0) + 1);
      const pagina = e.path || "/";
      paginas.set(pagina, (paginas.get(pagina) ?? 0) + 1);
      const dia = chaveDia(e.created_at);
      if (porDiaMapa.has(dia)) porDiaMapa.set(dia, (porDiaMapa.get(dia) ?? 0) + 1);
      const hora = horaLocal(e.created_at);
      porHoraMapa.set(hora, (porHoraMapa.get(hora) ?? 0) + 1);
    } else {
      cliques++;
      const rotulo = e.rotulo || "Botão";
      botoes.set(rotulo, (botoes.get(rotulo) ?? 0) + 1);
    }
  }

  return {
    visitas,
    cliques,
    leads: leads ?? 0,
    taxaClique: visitas > 0 ? Math.round((cliques / visitas) * 100) : 0,
    porOrigem: top(origens),
    cliquesPorBotao: top(botoes),
    porPagina: top(paginas, 6),
    porDia: [...porDiaMapa.entries()].map(([dia, v]) => ({ dia, visitas: v })),
    porHora: Array.from({ length: 24 }, (_, h) => ({ hora: h, visitas: porHoraMapa.get(h) ?? 0 })),
  };
}
