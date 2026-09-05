import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * O teste grátis do Prospector.
 *
 * Sete dias com a prospecção inteira — agente, WhatsApp, funil — e dois
 * freios por dia: quantas empresas o agente encontra e quantas mensagens
 * saem. Sem cartão. O dono não paga nada por isso (o Prospector não gasta
 * IA), então o teste é uma campanha de entrada, não um custo.
 *
 * As regras moram aqui, num lugar só. Quem precisa delas: o cadastro (para
 * ativar), a busca e a abordagem (para frear), a home e o menu (para contar
 * os dias), e a rota do agente (para não entregar fila a teste vencido).
 */

export const TESTE = {
  dias: 7,
  empresasPorDia: 30,
  enviosPorDia: 30,
} as const;

export type SituacaoTeste = {
  /* Ainda dentro dos 7 dias. */
  ativo: boolean;
  /* Passou o prazo: o painel abre, mas a prospecção pede assinatura. */
  acabou: boolean;
  diasRestantes: number;
  ate: string | null;
};

const DIA = 86_400_000;

/*
 * A situação do teste de uma organização — ou null quando ela não está
 * (nem esteve) em teste. Puro: recebe a linha, não consulta nada.
 *
 * teste_ate nulo com plano 'teste' é um teste que o Admin ligou na mão sem
 * data: conta como ativo e o Admin grava a data ao ligar. Não vale como
 * "para sempre" — planoVigente trata nulo como vencido, então a data tem
 * que existir; esta função só descreve.
 */
export function situacaoDoTeste(
  org: { plano: string; teste_ate?: string | null },
  agora: Date = new Date(),
): SituacaoTeste | null {
  if (org.plano !== "teste") return null;
  const ate = org.teste_ate ? new Date(org.teste_ate).getTime() : 0;
  const restanteMs = ate - agora.getTime();
  const ativo = restanteMs > 0;
  return {
    ativo,
    acabou: !ativo,
    diasRestantes: ativo ? Math.max(1, Math.ceil(restanteMs / DIA)) : 0,
    ate: org.teste_ate ?? null,
  };
}

// Quando o teste começa hoje, até quando vale.
export function fimDoTeste(agora: Date = new Date()): string {
  return new Date(agora.getTime() + TESTE.dias * DIA).toISOString();
}

/*
 * A organização está em teste ATIVO? (Sem sessão: serve à rota do agente e
 * às ações que não têm o usuário na mão.)
 */
export async function orgEmTeste(orgId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizacoes")
      .select("plano, teste_ate")
      .eq("id", orgId)
      .maybeSingle();
    if (error || !data) return false;
    return situacaoDoTeste(data as { plano: string; teste_ate: string | null })?.ativo === true;
  } catch {
    return false;
  }
}

/*
 * Quantas mensagens por dia esta organização pode mandar, no máximo — null
 * quando não há teto além do que o cliente configurou.
 */
export async function tetoEnviosDaOrg(orgId: string): Promise<number | null> {
  return (await orgEmTeste(orgId)) ? TESTE.enviosPorDia : null;
}

/*
 * Quantas empresas o teste ainda pode pedir HOJE — null quando não há teto.
 *
 * Conta o que já foi gravado hoje mais o que está na fila (uma busca
 * pendente de 30 já reserva as 30): senão bastaria enfileirar cinco buscas
 * antes de o agente ligar. O "hoje" é o de Brasília.
 */
export async function empresasDisponiveisHoje(orgId: string): Promise<number | null> {
  if (!(await orgEmTeste(orgId))) return null;
  try {
    const admin = createAdminClient();
    const inicio = new Date(Date.now() - 3 * 3_600_000);
    inicio.setUTCHours(3, 0, 0, 0); // 00:00 em Brasília, em UTC
    const desde = inicio.toISOString();

    const [{ count: gravadas }, { data: fila }] = await Promise.all([
      admin
        .from("prospeccao")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("fonte", "google")
        .gte("created_at", desde),
      admin
        .from("prospeccao_tarefas")
        .select("limite, status, created_at")
        .eq("org_id", orgId)
        .in("status", ["pendente", "rodando"])
        .gte("created_at", desde),
    ]);
    const reservadas = ((fila as { limite: number }[] | null) ?? []).reduce(
      (s, t) => s + (Number(t.limite) || 0),
      0,
    );
    return Math.max(0, TESTE.empresasPorDia - (gravadas ?? 0) - reservadas);
  } catch {
    return TESTE.empresasPorDia;
  }
}
