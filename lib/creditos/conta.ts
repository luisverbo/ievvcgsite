import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decifrar } from "./cripto";
import { custoEmMicro, type UsoTokens } from "./precos";

/*
 * A conta de IA de um cliente: de quem é a chave e de onde sai o dinheiro.
 *
 * Dois caminhos, e a diferença importa:
 *
 *   própria     — o cliente colou a chave dele. Nada é debitado; a fatura é
 *                 dele, com a Anthropic, e nós nem vemos o valor.
 *   plataforma  — usa a nossa chave e desconta do saldo. Aqui todo consumo
 *                 PRECISA virar lançamento no extrato, senão pagamos a conta.
 */

export type Fonte = "propria" | "plataforma";

export type ContaIA = {
  orgId: string;
  fonte: Fonte;
  anthropic: string | null;
  openai: string | null;
  saldo: number; // microdólares (0 quando a chave é própria)
};

type OrgRow = {
  id: string;
  plano: string;
  creditos: number;
  cota_mensal: number;
  anthropic_key_cifrada: string | null;
  openai_key_cifrada: string | null;
};

/*
 * Resolve a conta da organização.
 *
 * A chave própria vem primeiro: quem colou a dele não deve gastar crédito
 * comprado, nem esbarrar em saldo zerado.
 */
export async function contaDaOrg(orgId: string): Promise<ContaIA> {
  const admin = createAdminClient();

  // Antes de olhar o saldo, garante a cota do mês. É idempotente no banco.
  await admin.rpc("renovar_cota", { p_org: orgId });

  const { data } = await admin
    .from("organizacoes")
    .select("id, plano, creditos, cota_mensal, anthropic_key_cifrada, openai_key_cifrada")
    .eq("id", orgId)
    .maybeSingle();
  const org = data as OrgRow | null;
  if (!org) return { orgId, fonte: "plataforma", anthropic: null, openai: null, saldo: 0 };

  const propriaAnthropic = decifrar(org.anthropic_key_cifrada);
  const propriaOpenai = decifrar(org.openai_key_cifrada);

  if (propriaAnthropic) {
    return {
      orgId,
      fonte: "propria",
      anthropic: propriaAnthropic,
      // Sem chave própria de OpenAI, a imagem cai na nossa (e aí sim debita).
      openai: propriaOpenai,
      saldo: org.creditos,
    };
  }

  return {
    orgId,
    fonte: "plataforma",
    anthropic: process.env.ANTHROPIC_API_KEY || (await chaveDaPlataforma("anthropic_api_key")),
    openai: propriaOpenai || process.env.OPENAI_API_KEY || (await chaveDaPlataforma("openai_api_key")),
    saldo: org.creditos,
  };
}

async function chaveDaPlataforma(chave: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("valor")
    .eq("chave", chave)
    .maybeSingle();
  return (data as { valor: string } | null)?.valor?.trim() || null;
}

/* ------------------------------ antes de gastar --------------------------- */

// Saldo mínimo para deixar começar. Não dá para saber o custo antes, então
// exigimos o de uma página típica: começar e faltar no meio seria pior.
const MINIMO_PARA_COMEÇAR = 300_000; // US$0,30

export type Permissao = { ok: true } | { ok: false; motivo: string };

export function podeGastar(conta: ContaIA): Permissao {
  if (conta.fonte === "propria") {
    return conta.anthropic ? { ok: true } : { ok: false, motivo: "Chave da Anthropic inválida." };
  }
  if (!conta.anthropic) {
    return {
      ok: false,
      motivo:
        "A IA da plataforma está indisponível no momento. Você pode usar a sua própria chave da Anthropic na tela de Créditos.",
    };
  }
  // "Acabou" seria mentira para quem nunca teve — e a primeira frase que um
  // cliente novo lê não pode ser uma acusação errada.
  if (conta.saldo < MINIMO_PARA_COMEÇAR) {
    return {
      ok: false,
      motivo:
        conta.saldo > 0
          ? "Seu crédito de IA acabou. Compre mais créditos ou use a sua própria chave da Anthropic."
          : "Você está sem crédito de IA. Compre créditos ou use a sua própria chave da Anthropic.",
    };
  }
  return { ok: true };
}

/*
 * O que a tela precisa saber antes de deixar gerar.
 *
 * Uma pergunta só — "dá para gerar agora?" — em vez de a tela ter que saber se
 * existe chave, de quem ela é e quanto sobrou de saldo.
 */
export type StatusConta = {
  pronta: boolean;
  aviso: string | null;
  fonte: Fonte;
  saldo: number;
};

export async function statusDaConta(orgId: string): Promise<StatusConta> {
  const conta = await contaDaOrg(orgId);
  const p = podeGastar(conta);
  return {
    pronta: p.ok,
    aviso: p.ok ? null : p.motivo,
    fonte: conta.fonte,
    saldo: conta.saldo,
  };
}

/* ------------------------------ depois de gastar -------------------------- */

/*
 * Registra o consumo. Chave própria não debita nada — mas nem por isso deixa
 * de existir: sem o lançamento o cliente não teria como saber o que gastou.
 */
export async function cobrar(opcoes: {
  conta: ContaIA;
  modelo: string;
  uso: UsoTokens;
  descricao: string;
  referenciaTipo?: string;
  referenciaId?: string;
}): Promise<number> {
  const custo = custoEmMicro(opcoes.modelo, opcoes.uso);
  if (opcoes.conta.fonte === "propria" || custo <= 0) return 0;

  const admin = createAdminClient();
  const { error } = await admin.rpc("debitar_creditos", {
    p_org: opcoes.conta.orgId,
    p_valor: custo,
    p_descricao: opcoes.descricao,
    p_referencia_tipo: opcoes.referenciaTipo ?? null,
    p_referencia_id: opcoes.referenciaId ?? null,
    p_modelo: opcoes.modelo,
    p_tokens_entrada: opcoes.uso.entrada,
    p_tokens_saida: opcoes.uso.saida,
  });
  // Falha no débito não pode derrubar o trabalho já entregue ao cliente: ele
  // fica com a página, e o erro vai para o log para você conferir depois.
  if (error) console.error("[creditos] falha ao debitar", opcoes.conta.orgId, error.message);

  return custo;
}

// Custo fixo (imagem gerada), sem tokens.
export async function cobrarFixo(opcoes: {
  conta: ContaIA;
  micro: number;
  descricao: string;
  referenciaTipo?: string;
  referenciaId?: string;
}): Promise<number> {
  if (opcoes.conta.fonte === "propria" || opcoes.micro <= 0) return 0;
  const admin = createAdminClient();
  const { error } = await admin.rpc("debitar_creditos", {
    p_org: opcoes.conta.orgId,
    p_valor: opcoes.micro,
    p_descricao: opcoes.descricao,
    p_referencia_tipo: opcoes.referenciaTipo ?? null,
    p_referencia_id: opcoes.referenciaId ?? null,
    p_modelo: null,
    p_tokens_entrada: null,
    p_tokens_saida: null,
  });
  if (error) console.error("[creditos] falha ao debitar imagem", error.message);
  return opcoes.micro;
}
