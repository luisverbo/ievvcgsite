import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { funcaoLigada } from "@/lib/painel/flags";

/*
 * O Resumo diário: uma vez por dia o agente manda ao PRÓPRIO dono, no
 * WhatsApp que ele indicou, o balanço do trabalho — enviadas, respostas,
 * sites entregues e os leads quentes do Termômetro.
 *
 * A mensagem sai pelo mesmo carteiro das abordagens (a sessão já conectada
 * do cliente), então aqui só se decide QUANDO sai e o QUE vai escrito.
 *
 * Dia sem movimento não gera mensagem: um "hoje não aconteceu nada" todo
 * dia às 18h ensina o dono a ignorar o resumo — e aí ele perde o dia em
 * que um lead quente aparecer.
 */

/*
 * Brasília é UTC-3 o ano todo (o horário de verão acabou em 2019).
 * A conta na mão evita depender do fuso do servidor, que roda em UTC.
 */
const TZ_MS = 3 * 3_600_000;

function hojeBrasilia(): string {
  return new Date(Date.now() - TZ_MS).toISOString().slice(0, 10);
}

function horaBrasilia(): number {
  return new Date(Date.now() - TZ_MS).getUTCHours();
}

// Meia-noite de Brasília, em UTC — o começo do "hoje" das contagens.
function inicioDoDia(): string {
  return `${hojeBrasilia()}T03:00:00.000Z`;
}

type ConfigResumo = {
  resumo_zap: string | null;
  resumo_hora: number;
  resumo_ultimo_dia: string | null;
};

async function lerConfig(orgId: string): Promise<ConfigResumo | null> {
  const admin = createAdminClient();
  // Migração ainda não rodada = colunas não existem = select com erro.
  // Nesse caso a função simplesmente não existe ainda para esta conta.
  const { data, error } = await admin
    .from("prospeccao_config")
    .select("resumo_zap, resumo_hora, resumo_ultimo_dia")
    .eq("org_id", orgId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ConfigResumo;
}

/*
 * Barato de propósito: é chamado a cada checagem de estado do agente.
 * Diz só "vale a pena tentar?" — a decisão final (e a trava de corrida)
 * mora em montarResumoDoDia.
 */
export async function resumoDevido(orgId: string): Promise<boolean> {
  try {
    if (!(await funcaoLigada("resumo_diario"))) return false;
    const cfg = await lerConfig(orgId);
    if (!cfg?.resumo_zap) return false;
    if (horaBrasilia() < (cfg.resumo_hora ?? 18)) return false;
    return cfg.resumo_ultimo_dia !== hojeBrasilia();
  } catch {
    return false;
  }
}

/*
 * Monta o texto do dia e RESERVA o envio: marca resumo_ultimo_dia antes de
 * devolver, para dois agentes da mesma conta não mandarem o resumo em
 * dobro. Se o envio falhar lá na ponta, resumoFalhou() devolve a vez.
 *
 * Devolve null quando não é hora, já saiu hoje — ou o dia foi parado
 * (aí marca como feito sem mandar nada).
 */
export async function montarResumoDoDia(
  orgId: string,
): Promise<{ telefone: string; texto: string } | null> {
  if (!(await funcaoLigada("resumo_diario"))) return null;
  const cfg = await lerConfig(orgId);
  if (!cfg?.resumo_zap) return null;
  if (horaBrasilia() < (cfg.resumo_hora ?? 18)) return null;

  const hoje = hojeBrasilia();
  if (cfg.resumo_ultimo_dia === hoje) return null;

  const admin = createAdminClient();

  // A reserva. O filtro "ainda não é hoje" é a trava: só um UPDATE ganha.
  const { data: reserva } = await admin
    .from("prospeccao_config")
    .update({ resumo_ultimo_dia: hoje })
    .eq("org_id", orgId)
    .or(`resumo_ultimo_dia.is.null,resumo_ultimo_dia.neq.${hoje}`)
    .select("org_id");
  if (!reserva || reserva.length === 0) return null;

  const inicio = inicioDoDia();

  const [{ data: enviadasRaw }, { data: respostasRaw }, { data: aberturasRaw }] =
    await Promise.all([
      admin
        .from("prospeccao_mensagens")
        .select("tipo, modo, status")
        .eq("org_id", orgId)
        .eq("status", "enviada")
        .gte("enviada_em", inicio),
      admin
        .from("prospeccao_mensagens")
        .select("resposta_classe, prospecto_id")
        .eq("org_id", orgId)
        .gte("resposta_em", inicio),
      admin
        .from("prospeccao_aberturas")
        .select("prospecto_id, created_at, prospeccao(nome)")
        .eq("org_id", orgId)
        .gte("created_at", inicio)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

  const enviadas = (enviadasRaw as { tipo: string | null; modo: string; status: string }[] | null) ?? [];
  const abordagens = enviadas.filter((m) => (m.tipo ?? "abordagem") === "abordagem").length;
  const fechamentos = enviadas.filter((m) => m.tipo === "fechamento").length;

  // Sites prontos esperando o clique do dono (nível "preparar").
  const { count: prontosRaw } = await admin
    .from("prospeccao_mensagens")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "pendente")
    .eq("modo", "semi")
    .eq("tipo", "fechamento");
  const prontos = prontosRaw ?? 0;

  const respostas = (respostasRaw as { resposta_classe: string | null }[] | null) ?? [];
  const porClasse = new Map<string, number>();
  for (const r of respostas) {
    const c = r.resposta_classe ?? "outro";
    porClasse.set(c, (porClasse.get(c) ?? 0) + 1);
  }

  // Termômetro: quem abriu o site hoje, agrupado, do mais recente pro resto.
  type Abertura = { prospecto_id: string; created_at: string; prospeccao: { nome: string } | null };
  const aberturas = (aberturasRaw as unknown as Abertura[] | null) ?? [];
  const quentes = new Map<string, { nome: string; vezes: number; ultima: string }>();
  for (const a of aberturas) {
    const atual = quentes.get(a.prospecto_id);
    if (atual) atual.vezes++;
    else
      quentes.set(a.prospecto_id, {
        nome: a.prospeccao?.nome ?? "Lead",
        vezes: 1,
        ultima: a.created_at,
      });
  }

  const nadaAconteceu =
    abordagens === 0 && fechamentos === 0 && respostas.length === 0 && quentes.size === 0 && prontos === 0;
  // Dia parado: a reserva fica (não manda nada hoje) e amanhã segue normal.
  if (nadaAconteceu) return null;

  const ROTULO: Record<string, string> = {
    interesse: "com interesse 🎯",
    preco: "perguntando preço",
    duvida: "com dúvida",
    recusa: "recusando",
    outro: "para você ler",
  };

  const linhas: string[] = ["🤖 Resumo do dia — seu agente PáginaPro", ""];
  if (abordagens > 0)
    linhas.push(`✉️ ${abordagens} ${abordagens === 1 ? "mensagem enviada" : "mensagens enviadas"}`);
  if (respostas.length > 0) {
    const partes = [...porClasse.entries()].map(([c, n]) => `${n} ${ROTULO[c] ?? c}`);
    linhas.push(
      `💬 ${respostas.length} ${respostas.length === 1 ? "resposta" : "respostas"} (${partes.join(", ")})`,
    );
  }
  if (fechamentos > 0)
    linhas.push(`🌐 ${fechamentos} ${fechamentos === 1 ? "site entregue" : "sites entregues"} com link`);
  if (prontos > 0)
    linhas.push(
      `👆 ${prontos} ${prontos === 1 ? "site pronto esperando" : "sites prontos esperando"} seu clique no painel`,
    );

  if (quentes.size > 0) {
    linhas.push("", "🔥 Abriram o site hoje:");
    for (const q of [...quentes.values()].slice(0, 5)) {
      const min = Math.max(1, Math.round((Date.now() - new Date(q.ultima).getTime()) / 60_000));
      const quando =
        min < 60 ? `há ${min} min` : `há ${Math.round(min / 60)}h`;
      linhas.push(`• ${q.nome} — ${q.vezes === 1 ? "1 vez" : `${q.vezes} vezes`}, última ${quando}`);
    }
    linhas.push("Quem abriu mais de uma vez está pensando: liga primeiro nesses. 📞");
  }

  linhas.push("", "Amanhã sigo trabalhando. Até lá! 👋");

  return { telefone: cfg.resumo_zap, texto: linhas.join("\n") };
}

// O envio falhou lá no WhatsApp: devolve a vez para tentar de novo.
export async function resumoFalhou(orgId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("prospeccao_config")
    .update({ resumo_ultimo_dia: null })
    .eq("org_id", orgId);
}
