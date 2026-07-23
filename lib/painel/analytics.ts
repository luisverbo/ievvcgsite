import "server-only";

import { createClient } from "@/lib/supabase/server";

// Agregações das métricas de um site (visitas, cliques, origens, horários,
// mapa de calor de rolagem). Aceita filtro por página (path).
// Volume MVP: busca os eventos do período e agrega em memória.

const TZ = "America/Sao_Paulo";

export type LinhaContagem = { rotulo: string; total: number };

export type ZonaCalor = {
  zona: number; // 10..100 (% da altura da página)
  alcance: number; // % dos visitantes que chegaram até esta zona
  saida: number; // % dos visitantes que abandonaram nesta zona
  tempo: number; // segundos somados com esta zona na tela
};

export type MetricasSite = {
  visitas: number;
  cliques: number;
  leads: number;
  taxaClique: number; // % de visitas que clicaram em algum botão
  tempoMedio: number | null; // segundos médios na página (null sem dados)
  scrollMedio: number | null; // % médio da página que os visitantes viram
  porOrigem: LinhaContagem[];
  cliquesPorBotao: LinhaContagem[];
  porPagina: LinhaContagem[];
  porDia: { dia: string; visitas: number }[];
  porHora: { hora: number; visitas: number }[];
  zonasCalor: ZonaCalor[]; // vazio se ainda não há eventos de saída
};

type Evento = {
  tipo: "pageview" | "click" | "saida";
  rotulo: string | null;
  path: string | null;
  origem: string | null;
  created_at: string;
  dados: { max_scroll?: number; tempo_s?: number; zonas?: Record<string, number> } | null;
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

export async function getMetricasSite(
  siteId: string,
  dias: number,
  filtroPath?: string,
): Promise<MetricasSite> {
  const supabase = await createClient();
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();

  let query = supabase
    .from("analytics_eventos")
    .select("tipo, rotulo, path, origem, created_at, dados")
    .eq("site_id", siteId)
    .gte("created_at", desde)
    .order("created_at", { ascending: true })
    .limit(20000);
  if (filtroPath) query = query.eq("path", filtroPath);

  const leadsQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .gte("created_at", desde);
  // Leads não guardam path; com filtro de página mostramos leads do site todo
  // apenas na visão geral (sem filtro) para não enganar.
  const [{ data: eventosRaw }, { count: leads }] = await Promise.all([
    query,
    filtroPath ? Promise.resolve({ count: null }) : leadsQuery,
  ]);

  const eventos = (eventosRaw as Evento[] | null) ?? [];

  let visitas = 0;
  let cliques = 0;
  const origens = new Map<string, number>();
  const botoes = new Map<string, number>();
  const paginas = new Map<string, number>();
  const porDiaMapa = new Map<string, number>();
  const porHoraMapa = new Map<number, number>();

  // saídas (mapa de calor)
  let saidas = 0;
  let somaTempo = 0;
  let somaScroll = 0;
  const alcancePorZona = new Map<number, number>(); // zona -> nº visitantes que chegaram
  const saidaPorZona = new Map<number, number>(); // zona -> nº que abandonaram ali
  const tempoPorZona = new Map<number, number>(); // zona -> segundos somados

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
      porHoraMapa.set(horaLocal(e.created_at), (porHoraMapa.get(horaLocal(e.created_at)) ?? 0) + 1);
    } else if (e.tipo === "click") {
      cliques++;
      const rotulo = e.rotulo || "Botão";
      botoes.set(rotulo, (botoes.get(rotulo) ?? 0) + 1);
    } else if (e.tipo === "saida") {
      const d = e.dados ?? {};
      const maxScroll = Math.min(100, Math.max(0, Number(d.max_scroll) || 0));
      if (maxScroll === 0) continue;
      saidas++;
      somaTempo += Number(d.tempo_s) || 0;
      somaScroll += maxScroll;
      for (let z = 10; z <= 100; z += 10) {
        if (maxScroll >= z) alcancePorZona.set(z, (alcancePorZona.get(z) ?? 0) + 1);
      }
      saidaPorZona.set(maxScroll, (saidaPorZona.get(maxScroll) ?? 0) + 1);
      for (const [zStr, seg] of Object.entries(d.zonas ?? {})) {
        const z = Number(zStr);
        if (z >= 10 && z <= 100) tempoPorZona.set(z, (tempoPorZona.get(z) ?? 0) + (Number(seg) || 0));
      }
    }
  }

  const zonasCalor: ZonaCalor[] =
    saidas === 0
      ? []
      : Array.from({ length: 10 }, (_, i) => {
          const zona = (i + 1) * 10;
          return {
            zona,
            alcance: Math.round(((alcancePorZona.get(zona) ?? 0) / saidas) * 100),
            saida: Math.round(((saidaPorZona.get(zona) ?? 0) / saidas) * 100),
            tempo: tempoPorZona.get(zona) ?? 0,
          };
        });

  return {
    visitas,
    cliques,
    leads: leads ?? 0,
    taxaClique: visitas > 0 ? Math.round((cliques / visitas) * 100) : 0,
    tempoMedio: saidas > 0 ? Math.round(somaTempo / saidas) : null,
    scrollMedio: saidas > 0 ? Math.round(somaScroll / saidas) : null,
    porOrigem: top(origens),
    cliquesPorBotao: top(botoes),
    porPagina: top(paginas, 10),
    porDia: [...porDiaMapa.entries()].map(([dia, v]) => ({ dia, visitas: v })),
    porHora: Array.from({ length: 24 }, (_, h) => ({ hora: h, visitas: porHoraMapa.get(h) ?? 0 })),
    zonasCalor,
  };
}
