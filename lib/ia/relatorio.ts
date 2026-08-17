import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * O relatório mensal do cliente final.
 *
 * Quem paga a mensalidade não abre painel: ele vê a fatura chegar. Este
 * relatório é o que transforma o boleto em algo visível — e por isso ele é
 * escrito na língua de dono de negócio, não de analista:
 *
 *   "143 pessoas visitaram seu site em julho — 22% mais que em junho.
 *    19 delas chamaram no WhatsApp."
 *
 * Duas decisões que definem o resto do arquivo:
 *
 * 1. NÃO custa crédito. Texto de IA por cliente por mês viraria despesa
 *    recorrente e o dono acabaria não mandando relatório nenhum. As frases
 *    saem dos próprios números, aqui, de graça — e todo mês.
 * 2. Só mostra o que é verdade. Mês sem visita nenhuma diz isso com todas as
 *    letras e sugere o caminho, em vez de inventar gráfico bonito de zero.
 */

export type DadosMes = {
  visitas: number;
  contatos: number;
  taxaPct: number | null;
  origens: { nome: string; visitas: number }[];
  botoes: { nome: string; cliques: number }[];
  melhorDia: { dia: string; visitas: number } | null;
};

export type Relatorio = {
  titulo: string;
  mes: string; // "2026-07"
  mesRotulo: string; // "julho de 2026"
  atual: DadosMes;
  anterior: { visitas: number; contatos: number };
  variacaoPct: number | null;
  frases: string[];
  assinatura: string;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function rotuloDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1] ?? ""} de ${ano}`;
}

// O mês anterior a "2026-01" é "2025-12" — conta feita com Date para não
// errar a virada do ano.
export function mesAnterior(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, (m ?? 1) - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

// O último mês FECHADO (em Brasília) — o padrão do relatório: mês corrente
// pela metade compara mal com um mês inteiro.
export function mesFechadoAtual(): string {
  const agora = new Date(Date.now() - 3 * 3_600_000);
  agora.setUTCDate(1);
  agora.setUTCMonth(agora.getUTCMonth() - 1);
  return agora.toISOString().slice(0, 7);
}

export function mesValido(mes: string | null | undefined): string | null {
  if (!mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return null;
  return mes;
}

// Início e fim do mês em UTC, deslocados para Brasília (UTC-3): o dia 1 de
// julho no Brasil começa às 03:00 UTC.
function janela(mes: string): { de: string; ate: string } {
  const [ano, m] = mes.split("-").map(Number);
  const de = new Date(Date.UTC(ano, m - 1, 1, 3, 0, 0));
  const ate = new Date(Date.UTC(ano, m, 1, 3, 0, 0));
  return { de: de.toISOString(), ate: ate.toISOString() };
}

type EventoRow = { tipo: string; rotulo: string | null; origem: string | null; created_at: string };

async function medirMes(orgId: string, siteIaId: string, mes: string): Promise<DadosMes> {
  const admin = createAdminClient();
  const { de, ate } = janela(mes);
  const { data } = await admin
    .from("analytics_eventos")
    .select("tipo, rotulo, origem, created_at")
    .eq("org_id", orgId)
    .eq("site_id", siteIaId)
    .gte("created_at", de)
    .lt("created_at", ate)
    .limit(20000);
  const eventos = (data as EventoRow[] | null) ?? [];

  let visitas = 0;
  let contatos = 0;
  const origens = new Map<string, number>();
  const botoes = new Map<string, number>();
  const porDia = new Map<string, number>();

  for (const e of eventos) {
    if (e.tipo === "pageview") {
      visitas++;
      origens.set(e.origem || "Direto", (origens.get(e.origem || "Direto") ?? 0) + 1);
      // O dia em Brasília, não em UTC — senão a visita das 22h vira "amanhã".
      const dia = new Date(new Date(e.created_at).getTime() - 3 * 3_600_000)
        .toISOString()
        .slice(0, 10);
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
    } else if (e.tipo === "click") {
      contatos++;
      botoes.set(e.rotulo || "Botão", (botoes.get(e.rotulo || "Botão") ?? 0) + 1);
    }
  }

  const melhor = [...porDia.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    visitas,
    contatos,
    taxaPct: visitas > 0 ? Math.round((contatos / visitas) * 100) : null,
    origens: [...origens.entries()]
      .map(([nome, v]) => ({ nome, visitas: v }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 5),
    botoes: [...botoes.entries()]
      .map(([nome, c]) => ({ nome, cliques: c }))
      .sort((a, b) => b.cliques - a.cliques)
      .slice(0, 4),
    melhorDia: melhor ? { dia: melhor[0], visitas: melhor[1] } : null,
  };
}

/*
 * As frases do mês, tiradas dos próprios números.
 *
 * Escritas para serem lidas por quem não sabe (nem precisa saber) o que é
 * taxa de conversão. Cada frase só aparece quando o número existe: relatório
 * que enche linguiça com "seu engajamento foi sólido" não é lido duas vezes.
 */
function montarFrases(atual: DadosMes, anterior: { visitas: number }, variacao: number | null): string[] {
  const f: string[] = [];

  if (atual.visitas === 0) {
    return [
      "Neste mês o site não recebeu visitas.",
      "O site está no ar e funcionando — o que falta é gente chegando até ele. Colocar o link na bio do Instagram, no Google da empresa e no rodapé das mensagens costuma resolver rápido.",
    ];
  }

  const pessoas = atual.visitas === 1 ? "1 pessoa visitou" : `${atual.visitas} pessoas visitaram`;
  if (variacao !== null && anterior.visitas > 0) {
    f.push(
      variacao > 4
        ? `${pessoas} seu site — ${variacao}% a mais que no mês passado. 📈`
        : variacao < -4
          ? `${pessoas} seu site, ${Math.abs(variacao)}% a menos que no mês passado.`
          : `${pessoas} seu site — praticamente o mesmo movimento do mês passado.`,
    );
  } else {
    f.push(`${pessoas} seu site neste mês.`);
  }

  if (atual.contatos > 0) {
    f.push(
      atual.contatos === 1
        ? "1 delas clicou para falar com você. Cada clique desses é um cliente batendo na porta."
        : `${atual.contatos} delas clicaram para falar com você — em média ${atual.taxaPct} a cada 100 visitas.`,
    );
  } else {
    f.push(
      "Ninguém clicou nos botões de contato neste mês. Quando isso se repete, costuma ser sinal de que o botão de WhatsApp precisa aparecer mais cedo na página.",
    );
  }

  const top = atual.origens[0];
  if (top && atual.visitas >= 5) {
    f.push(
      top.nome === "Direto"
        ? "A maior parte das visitas chegou digitando o endereço ou por link direto — provavelmente de quem já conhece você."
        : `A maior parte das visitas veio ${top.nome === "Google" ? "do Google" : `do ${top.nome}`} (${top.visitas} ${top.visitas === 1 ? "visita" : "visitas"}).`,
    );
  }

  if (atual.melhorDia && atual.melhorDia.visitas >= 3) {
    const [a, m, d] = [
      atual.melhorDia.dia.slice(0, 4),
      atual.melhorDia.dia.slice(5, 7),
      atual.melhorDia.dia.slice(8, 10),
    ];
    f.push(
      `O dia mais movimentado foi ${d}/${m}/${a}, com ${atual.melhorDia.visitas} visitas.`,
    );
  }

  return f;
}

export async function montarRelatorio(
  orgId: string,
  siteIaId: string,
  mes: string,
): Promise<Relatorio | null> {
  const admin = createAdminClient();
  const [{ data: sRaw }, { data: oRaw }] = await Promise.all([
    admin.from("sites_ia").select("id, titulo").eq("id", siteIaId).eq("org_id", orgId).maybeSingle(),
    admin.from("organizacoes").select("nome").eq("id", orgId).maybeSingle(),
  ]);
  const site = sRaw as { id: string; titulo: string } | null;
  if (!site) return null;

  const anteriorMes = mesAnterior(mes);
  const [atual, ant] = await Promise.all([
    medirMes(orgId, siteIaId, mes),
    medirMes(orgId, siteIaId, anteriorMes),
  ]);

  const variacaoPct =
    ant.visitas > 0 ? Math.round(((atual.visitas - ant.visitas) / ant.visitas) * 100) : null;

  return {
    titulo: site.titulo,
    mes,
    mesRotulo: rotuloDoMes(mes),
    atual,
    anterior: { visitas: ant.visitas, contatos: ant.contatos },
    variacaoPct,
    frases: montarFrases(atual, ant, variacaoPct),
    assinatura: (oRaw as { nome: string } | null)?.nome ?? "",
  };
}

/*
 * Os meses que valem oferecer no seletor: do primeiro mês com movimento até
 * o último fechado. Sem isso o relatório abriria em meses vazios que nunca
 * existiram.
 */
export async function mesesComDados(orgId: string, siteIaId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("analytics_eventos")
    .select("created_at")
    .eq("org_id", orgId)
    .eq("site_id", siteIaId)
    .order("created_at", { ascending: true })
    .limit(1);
  const primeiro = (data as { created_at: string }[] | null)?.[0]?.created_at;
  if (!primeiro) return [];

  const meses: string[] = [];
  const inicio = new Date(new Date(primeiro).getTime() - 3 * 3_600_000);
  const cursor = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
  const hoje = new Date(Date.now() - 3 * 3_600_000);
  const limite = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  while (cursor <= limite && meses.length < 36) {
    meses.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return meses.reverse();
}
