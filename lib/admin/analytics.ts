import "server-only";

import { createClient } from "@/lib/supabase/server";

const TZ = "America/Sao_Paulo";

export type EventoRow = {
  tipo: "pageview" | "click";
  rotulo: string | null;
  created_at: string;
};

export type Metricas = {
  totalVisitas: number;
  totalCliques: number;
  visitasHoje: number;
  porDia: { label: string; valor: number }[];
  porHora: { label: string; valor: number }[];
  porBotao: { label: string; valor: number }[];
  semDados: boolean;
};

// Rótulos amigáveis para os botões medidos via data-fbq.
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
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: TZ,
    }).format(date),
  );
}

export async function getMetricas(): Promise<Metricas> {
  const supabase = await createClient();

  // Últimos 30 dias (volume baixo num site de evento; agregamos em JS).
  const desde = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase
    .from("analytics_eventos")
    .select("tipo, rotulo, created_at")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(50000);

  const rows = (data as EventoRow[] | null) ?? [];

  const diaMap = new Map<string, number>();
  const horaMap = new Map<number, number>();
  const botaoMap = new Map<string, number>();
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
      const h = hourSP(date);
      horaMap.set(h, (horaMap.get(h) ?? 0) + 1);
      if (key === hojeKey) visitasHoje++;
    } else {
      totalCliques++;
      const rot = row.rotulo ?? "Outro";
      botaoMap.set(rot, (botaoMap.get(rot) ?? 0) + 1);
    }
  }

  // Últimos 14 dias, do mais antigo ao mais recente.
  const porDia: { label: string; valor: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    porDia.push({ label: dayLabelSP(d), valor: diaMap.get(dayKeySP(d)) ?? 0 });
  }

  const porHora = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, "0")}h`,
    valor: horaMap.get(h) ?? 0,
  }));

  const porBotao = Array.from(botaoMap.entries())
    .map(([rot, valor]) => ({ label: BOTAO_LABELS[rot] ?? rot, valor }))
    .sort((a, b) => b.valor - a.valor);

  return {
    totalVisitas,
    totalCliques,
    visitasHoje,
    porDia,
    porHora,
    porBotao,
    semDados: rows.length === 0,
  };
}
