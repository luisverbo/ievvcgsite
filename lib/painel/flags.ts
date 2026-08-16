import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Interruptores das funções novas — o freio de mão do dono.
 *
 * Toda função nova de peso nasce com um interruptor aqui. Se o dono não
 * gostar do comportamento em produção, ele DESLIGA no Admin e a função some
 * para todos os clientes na hora — sem deploy, sem me chamar, sem código.
 *
 * A regra para o código de produto: uma função listada aqui só aparece/roda
 * depois de `funcaoLigada("nome")` dizer sim. Padrão LIGADA — o interruptor
 * existe para desligar o que desagradar, não para esconder o que foi lançado.
 */

export const FUNCOES_NOVAS: Record<
  string,
  { rotulo: string; descricao: string; pronta: boolean }
> = {
  escuta: {
    rotulo: "Agente escuta as respostas",
    descricao:
      "O agente detecta quando um lead abordado responde no WhatsApp, a IA classifica (interesse, preço, dúvida, recusa) e o painel marca sozinho. Recusa vira opt-out definitivo.",
    pronta: true,
  },
  fechador: {
    rotulo: "Fechador (site automático na resposta)",
    descricao:
      "Quando o lead responde com interesse, o sistema gera o site com as fotos do Instagram dele e — conforme o nível do cliente — prepara ou envia a mensagem com o link. Com teto de gasto mensal.",
    pronta: true,
  },
  followup: {
    rotulo: "Follow-up automático",
    descricao:
      "Quem não respondeu em alguns dias recebe uma segunda mensagem, uma única vez, no mesmo ritmo humano.",
    pronta: false,
  },
  resumo_diario: {
    rotulo: "Resumo diário no WhatsApp do dono",
    descricao:
      "O agente manda ao próprio dono um resumo do dia: enviadas, respostas, sites entregues.",
    pronta: false,
  },
  otimizador: {
    rotulo: "Otimizador de páginas",
    descricao:
      "A IA lê as métricas das páginas e sugere melhorias com botão Aplicar.",
    pronta: false,
  },
};

export async function funcaoLigada(nome: keyof typeof FUNCOES_NOVAS): Promise<boolean> {
  if (!FUNCOES_NOVAS[nome]?.pronta) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", `funcao_${nome}`)
    .maybeSingle();
  // Sem linha = ligada. Só "0" desliga.
  return (data as { valor: string } | null)?.valor?.trim() !== "0";
}

// Estado bruto para a tela do Admin (inclui as ainda não prontas).
export async function estadoDasFuncoes(): Promise<Record<string, boolean>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("chave, valor")
    .like("chave", "funcao_%");
  const mapa = new Map(
    ((data as { chave: string; valor: string }[] | null) ?? []).map((l) => [l.chave, l.valor]),
  );
  const saida: Record<string, boolean> = {};
  for (const nome of Object.keys(FUNCOES_NOVAS)) {
    saida[nome] = mapa.get(`funcao_${nome}`)?.trim() !== "0";
  }
  return saida;
}
