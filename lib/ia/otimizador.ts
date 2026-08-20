import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { textoDaResposta } from "@/lib/estudio/llm";
import { createAdminClient } from "@/lib/supabase/admin";
import { contaDaOrg, cobrar } from "@/lib/creditos/conta";
import { MODELO_PADRAO } from "./modelos";

/*
 * O Otimizador: a IA lê as métricas REAIS da página e propõe melhorias.
 *
 * A diferença para "dicas de conversão" genéricas é que aqui cada sugestão
 * nasce de um número: "62% dos visitantes param antes da metade — suba o
 * botão de WhatsApp para o topo". E cada sugestão vem com o `pedido` pronto:
 * o botão Aplicar abre o chat do construtor com a instrução preenchida, o
 * dono revisa e envia — a IA nunca mexe na página sozinha.
 *
 * A análise custa crédito (o modelo lê a página inteira), então ela só roda
 * no clique, com o preço escrito no botão, e exige um mínimo de visitas:
 * opinar em cima de 6 acessos seria vender adivinhação como estatística.
 */

export const MIN_VISITAS_ANALISE = 20;

// ~US$0,10 por análise — o número escrito no botão antes do clique.
export const CUSTO_ESTIMADO_ANALISE_MICRO = 100_000;

export type Sugestao = { titulo: string; motivo: string; pedido: string };

export type ResumoMetricas = {
  visitas: number;
  cliques: number;
  taxaPct: number | null;
  tempoMedioS: number | null;
  saidas: number;
  // % das visitas que chegam a cada décimo da página (alcance de rolagem).
  alcance: { zona: number; pct: number }[];
  // O décimo (10..90) onde a maior fatia desistiu — null se a maioria chega ao fim.
  zonaAbandono: number | null;
  origens: { nome: string; visitas: number }[];
  rotulos: { nome: string; cliques: number }[];
};

type EventoRow = {
  tipo: string;
  rotulo: string | null;
  origem: string | null;
  dados: { max_scroll?: number; tempo_s?: number } | null;
};

export async function resumirMetricas(orgId: string, siteIaId: string): Promise<ResumoMetricas> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("analytics_eventos")
    .select("tipo, rotulo, origem, dados")
    .eq("org_id", orgId)
    .eq("site_id", siteIaId)
    .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);
  const eventos = (data as EventoRow[] | null) ?? [];

  let visitas = 0;
  let cliques = 0;
  const origens = new Map<string, number>();
  const rotulos = new Map<string, number>();
  const scrolls: number[] = [];
  const tempos: number[] = [];

  for (const e of eventos) {
    if (e.tipo === "pageview") {
      visitas++;
      const o = e.origem || "Direto";
      origens.set(o, (origens.get(o) ?? 0) + 1);
    } else if (e.tipo === "click") {
      cliques++;
      const r = e.rotulo || "CTA";
      rotulos.set(r, (rotulos.get(r) ?? 0) + 1);
    } else if (e.tipo === "saida") {
      const s = Number(e.dados?.max_scroll);
      const t = Number(e.dados?.tempo_s);
      if (Number.isFinite(s) && s > 0) scrolls.push(Math.min(100, s));
      if (Number.isFinite(t) && t > 0) tempos.push(t);
    }
  }

  const alcance: { zona: number; pct: number }[] = [];
  for (let z = 10; z <= 100; z += 10) {
    const chegam = scrolls.filter((s) => s >= z).length;
    alcance.push({ zona: z, pct: scrolls.length ? Math.round((chegam / scrolls.length) * 100) : 0 });
  }

  // Onde a maior fatia desistiu: o décimo (antes do fim) com mais paradas.
  let zonaAbandono: number | null = null;
  if (scrolls.length >= 5) {
    let melhor = 0;
    for (let z = 10; z <= 90; z += 10) {
      const pararamAqui = scrolls.filter((s) => s >= z && s < z + 10).length;
      if (pararamAqui > melhor) {
        melhor = pararamAqui;
        zonaAbandono = z;
      }
    }
    // Se a moda é "chegou ao fim", não há abandono a apontar.
    const aoFim = scrolls.filter((s) => s >= 100).length;
    if (aoFim >= melhor) zonaAbandono = null;
  }

  return {
    visitas,
    cliques,
    taxaPct: visitas > 0 ? Math.round((cliques / visitas) * 100) : null,
    tempoMedioS: tempos.length
      ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
      : null,
    saidas: scrolls.length,
    alcance,
    zonaAbandono,
    origens: [...origens.entries()]
      .map(([nome, v]) => ({ nome, visitas: v }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, 6),
    rotulos: [...rotulos.entries()]
      .map(([nome, c]) => ({ nome, cliques: c }))
      .sort((a, b) => b.cliques - a.cliques)
      .slice(0, 6),
  };
}

// O texto visível da página, na ordem em que aparece — o que a IA precisa
// para apontar ONDE mexer sem pagar pelo HTML inteiro.
function textoDaPagina(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(h1|h2|h3)[^>]*>/gi, "\n# ")
    .replace(/<(li|p|section|div|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 9000);
}

const SYSTEM = `Você é um especialista em conversão de landing pages de pequenos negócios brasileiros. Recebe as métricas reais de uma página (30 dias) e o texto dela na ordem em que aparece.

Proponha NO MÁXIMO 3 melhorias. Regras:
- Cada uma tem que nascer de um número recebido (cite-o no motivo). Nada de dica genérica que serviria para qualquer página.
- "pedido" é a instrução que será enviada ao chat que edita a página: escreva-a completa e específica (o que mudar, onde, como), em português, como se o dono estivesse pedindo. Não mencione métricas no pedido — só a mudança.
- Não proponha nada sobre imagens específicas, preço do serviço ou domínio.
- Se as métricas estão saudáveis (boa taxa de clique, gente chegando ao fim), diga menos sugestões — ou uma só. Não invente problema.

RESPONDA APENAS com JSON válido, sem markdown: [{"titulo":"...","motivo":"...","pedido":"..."}]`;

function extrairJson(bruto: string): Sugestao[] {
  const inicio = bruto.indexOf("[");
  const fim = bruto.lastIndexOf("]");
  if (inicio === -1 || fim <= inicio) return [];
  try {
    const arr = JSON.parse(bruto.slice(inicio, fim + 1)) as Partial<Sugestao>[];
    return arr
      .filter(
        (s) =>
          typeof s?.titulo === "string" &&
          typeof s?.motivo === "string" &&
          typeof s?.pedido === "string" &&
          s.pedido.trim().length > 10,
      )
      .slice(0, 3)
      .map((s) => ({
        titulo: s.titulo!.trim().slice(0, 120),
        motivo: s.motivo!.trim().slice(0, 400),
        pedido: s.pedido!.trim().slice(0, 1500),
      }));
  } catch {
    return [];
  }
}

export async function analisarPagina(
  orgId: string,
  siteIaId: string,
): Promise<{ ok: true; sugestoes: Sugestao[] } | { ok: false; motivo: string }> {
  const admin = createAdminClient();
  const { data: sRaw } = await admin
    .from("sites_ia")
    .select("id, titulo, html")
    .eq("id", siteIaId)
    .eq("org_id", orgId)
    .maybeSingle();
  const site = sRaw as { id: string; titulo: string; html: string | null } | null;
  if (!site?.html) return { ok: false, motivo: "A página ainda está vazia." };

  const resumo = await resumirMetricas(orgId, siteIaId);
  if (resumo.visitas < MIN_VISITAS_ANALISE) {
    return {
      ok: false,
      motivo: `A página teve ${resumo.visitas} visita${resumo.visitas === 1 ? "" : "s"} em 30 dias — com menos de ${MIN_VISITAS_ANALISE}, qualquer sugestão seria adivinhação. Divulgue o link e volte aqui.`,
    };
  }

  const conta = await contaDaOrg(orgId);
  if (!conta.anthropic) {
    return { ok: false, motivo: "Sem crédito de IA disponível para a análise." };
  }
  const client = new Anthropic({ apiKey: conta.anthropic });

  const resposta = await client.messages.create({
    model: MODELO_PADRAO,
    max_tokens: 1400,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `MÉTRICAS (últimos 30 dias) da página "${site.titulo}":\n${JSON.stringify({
          visitas: resumo.visitas,
          cliques_em_botoes: resumo.cliques,
          taxa_de_clique_pct: resumo.taxaPct,
          tempo_medio_s: resumo.tempoMedioS,
          alcance_de_rolagem_pct: Object.fromEntries(resumo.alcance.map((a) => [`${a.zona}%`, a.pct])),
          decimo_onde_mais_desistem: resumo.zonaAbandono ? `${resumo.zonaAbandono}%` : null,
          origens: resumo.origens,
          botoes_mais_clicados: resumo.rotulos,
        })}\n\nTEXTO DA PÁGINA, na ordem (# = título de seção):\n${textoDaPagina(site.html)}`,
      },
    ],
  });

  await cobrar({
    conta,
    modelo: MODELO_PADRAO,
    uso: {
      entrada: resposta.usage.input_tokens ?? 0,
      saida: resposta.usage.output_tokens ?? 0,
    },
    descricao: "Análise do Otimizador de páginas",
    referenciaTipo: "site_ia",
    referenciaId: site.id,
  });

  const bruto = textoDaResposta(resposta.content as { type: string; text?: string }[]);
  const sugestoes = extrairJson(bruto);
  if (sugestoes.length === 0) {
    return { ok: false, motivo: "A IA não devolveu sugestões desta vez — tente de novo em instantes." };
  }

  await admin
    .from("sites_ia")
    .update({ otimizacoes: sugestoes, otimizadas_em: new Date().toISOString() })
    .eq("id", siteIaId);

  return { ok: true, sugestoes };
}
