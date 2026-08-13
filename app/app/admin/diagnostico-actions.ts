"use server";

import { ehAdmin } from "@/lib/painel/admin";

/*
 * Testa o token do Mercado Pago com uma chamada real.
 *
 * "A variável existe" e "o token funciona" são perguntas diferentes. Esta
 * responde a segunda: bate na API deles e devolve o que ELES disseram — token
 * recusado, conta bloqueada, ok. Sem isto, um token colado pela metade passa
 * no diagnóstico e falha só na frente do cliente.
 */

export type TesteMpState =
  | { ok: true; detalhe: string }
  | { ok: false; detalhe: string }
  | undefined;

export async function testarMercadoPago(): Promise<TesteMpState> {
  if (!(await ehAdmin())) return { ok: false, detalhe: "Sem permissão." };

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      detalhe:
        "MERCADOPAGO_ACCESS_TOKEN não chegou ao servidor. Veja a lista de nomes logo acima — se o nome não aparecer lá, a variável está em outro projeto ou em outro ambiente da Vercel.",
    };
  }

  // O prefixo diz de que credencial é, sem revelar o valor.
  const tipo = token.startsWith("TEST-")
    ? "credencial de TESTE"
    : token.startsWith("APP_USR-")
      ? "credencial de PRODUÇÃO"
      : "prefixo desconhecido (esperado TEST- ou APP_USR-)";

  try {
    const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (res.ok) {
      return { ok: true, detalhe: `O Mercado Pago aceitou o token (${tipo}). O Pix deve funcionar.` };
    }
    if (res.status === 401) {
      return {
        ok: false,
        detalhe: `O Mercado Pago RECUSOU o token (${tipo}). Ele está errado, incompleto ou foi renovado lá. Copie de novo em Suas integrações → Credenciais e refaça o deploy.`,
      };
    }
    return {
      ok: false,
      detalhe: `O Mercado Pago respondeu ${res.status} (${tipo}). Tente de novo em instantes; se persistir, gere outro token.`,
    };
  } catch (e) {
    return { ok: false, detalhe: `Não consegui falar com o Mercado Pago: ${(e as Error).message}` };
  }
}
