import "server-only";

import { createClient } from "@/lib/supabase/server";

const TZ = "America/Sao_Paulo";

export type EventoRow = {
  tipo: "pageview" | "click";
  rotulo: string | null;
  origem: string | null;
  created_at: string;
};

export type Barra = { label: string; valor: number };

export type Metricas = {
  totalVisitas: number;
  totalCliques: number;
  visitasHoje: number;
  porDia: Barra[];
  porHora: Barra[];
  porBotao: Barra[];
  porOrigem: Barra[];
  semDados: boolean;
};

export type Periodo = { desde: Date; ate: Date };

const BOTAO_LABELS: Record<string, string> = {
  ClicouIngressoTopo: "Ingresso (cabeçalho)",
  ClicouGarantirIngresso: "Garantir ingresso (topo)",
  ClicouComprarIngresso: "Comprar ingresso",
  ClicouVerLineup: "Ver line-up",
  ClicouWhatsApp: "WhatsApp",
};

function dayKeySP(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date); // YYYY-MM-DD
}
function dayLabelSP(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ }).format(
    date,
  );
}
function hourSP(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }).format(
      date,
    ),
  );
}

// Início do dia (00:00 em Brasília) do dia em que `date` cai.
export function inicioDoDiaSP(date: Date) {
  return new Date(`${dayKeySP(date)}T00:00:00-03:00`);
}

// Lista de dias (chave + rótulo) entre desde e ate, no fuso de Brasília.
function diasNoIntervalo(desde: Date, ate: Date) {
  const dias: { key: string; label: string }[] = [];
  let cursor = inicioDoDiaSP(desde);
  const fim = dayKeySP(ate);
  for (let i = 0; i < 186; i++) {
    const key = dayKeySP(cursor);
    dias.push({ key, label: dayLabelSP(cursor) });
    if (key >= fim) break;
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return dias;
}

export async function getMetricas({ desde, ate }: Periodo): Promise<Metricas> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("analytics_eventos")
    .select("tipo, rotulo, origem, created_at")
    .gte("created_at", desde.toISOString())
    .lte("created_at", ate.toISOString())
    .order("created_at", { ascending: false })
    .limit(50000);

  const rows = (data as EventoRow[] | null) ?? [];

  const diaMap = new Map<string, number>();
  const horaMap = new Map<number, number>();
  const botaoMap = new Map<string, number>();
  const origemMap = new Map<string, number>();
  const hojeKey = dayKeySP(new Date());
  let totalVisitas = 0;
  let totalCliques = 0;
  let visitasHoje = 0;

  for (const row of rows) {
    const date = new Date(row.created_at);
    if (row.tipo === "pageview") {
      totalVisitas++;
      const key = dayKeySP(date);
      diaMap.set(key, (diaMap.get(key) ?? 0) + 1);
      horaMap.set(hourSP(date), (horaMap.get(hourSP(date)) ?? 0) + 1);
      const org = row.origem ?? "Direto";
      origemMap.set(org, (origemMap.get(org) ?? 0) + 1);
      if (key === hojeKey) visitasHoje++;
    } else {
      totalCliques++;
      const rot = row.rotulo ?? "Outro";
      botaoMap.set(rot, (botaoMap.get(rot) ?? 0) + 1);
    }
  }

  const porDia = diasNoIntervalo(desde, ate).map((d) => ({
    label: d.label,
    valor: diaMap.get(d.key) ?? 0,
  }));

  const porHora = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, "0")}h`,
    valor: horaMap.get(h) ?? 0,
  }));

  const porBotao = Array.from(botaoMap.entries())
    .map(([rot, valor]) => ({ label: BOTAO_LABELS[rot] ?? rot, valor }))
    .sort((a, b) => b.valor - a.valor);

  const porOrigem = Array.from(origemMap.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);

  return {
    totalVisitas,
    totalCliques,
    visitasHoje,
    porDia,
    porHora,
    porBotao,
    porOrigem,
    semDados: rows.length === 0,
  };
}
