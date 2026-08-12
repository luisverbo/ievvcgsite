import "server-only";

import Stripe from "stripe";

/*
 * Stripe: assinatura no cartão e compra de crédito no cartão.
 *
 * A assinatura é SEMPRE cartão, nunca Pix. É o motivo de existir: renova
 * sozinha. Pix mensal depende de o cliente decidir pagar de novo todo mês, e
 * uma parte não decide.
 */

let cliente: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }
  cliente ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return cliente;
}

export function stripeConfigurada(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_AGENCIA;
}

function urlBase(): string {
  const bruto =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return bruto.replace(/\/$/, "");
}

/*
 * Leva o cliente ao checkout da assinatura.
 *
 * O org_id vai em `metadata` E em `client_reference_id`: o webhook chega sem
 * sessão de login nenhuma, então é por aqui que descobrimos de quem é o
 * pagamento. Sem isso o dinheiro entra e ninguém sabe a quem creditar.
 */
export async function checkoutAssinatura(opcoes: {
  orgId: string;
  email: string;
  customerId?: string | null;
}): Promise<string> {
  const s = stripe();
  const sessao = await s.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_AGENCIA!, quantity: 1 }],
    ...(opcoes.customerId
      ? { customer: opcoes.customerId }
      : { customer_email: opcoes.email, customer_creation: "always" }),
    client_reference_id: opcoes.orgId,
    subscription_data: { metadata: { org_id: opcoes.orgId } },
    metadata: { org_id: opcoes.orgId, tipo: "assinatura" },
    locale: "pt-BR",
    success_url: `${urlBase()}/app/assinatura?ok=1`,
    cancel_url: `${urlBase()}/app/assinatura?cancelado=1`,
  });
  if (!sessao.url) throw new Error("A Stripe não devolveu o endereço do checkout.");
  return sessao.url;
}

// Compra avulsa de crédito no cartão.
export async function checkoutCredito(opcoes: {
  orgId: string;
  email: string;
  dolares: number;
  precoCentavos: number;
  creditos: number;
}): Promise<string> {
  const s = stripe();
  const sessao = await s.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: opcoes.precoCentavos,
          product_data: {
            name: `US$ ${opcoes.dolares} em créditos de IA`,
            description: "Crédito para gerar páginas e imagens. Não expira.",
          },
        },
      },
    ],
    customer_email: opcoes.email,
    client_reference_id: opcoes.orgId,
    // creditos como texto: metadata da Stripe só aceita string.
    metadata: { org_id: opcoes.orgId, tipo: "credito", creditos: String(opcoes.creditos) },
    locale: "pt-BR",
    success_url: `${urlBase()}/app/creditos?ok=1`,
    cancel_url: `${urlBase()}/app/creditos?cancelado=1`,
  });
  if (!sessao.url) throw new Error("A Stripe não devolveu o endereço do checkout.");
  return sessao.url;
}

/*
 * Portal do cliente: trocar cartão, ver faturas, cancelar.
 *
 * Usamos o da Stripe de propósito — refazer essas telas é semanas de trabalho
 * para chegar num lugar pior, e cancelamento é onde erro dá processo.
 */
export async function portalDoCliente(customerId: string): Promise<string> {
  const s = stripe();
  const sessao = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${urlBase()}/app/assinatura`,
  });
  return sessao.url;
}

/*
 * Marca a fatura como paga por fora.
 *
 * É isto que evita a cobrança dobrada: quando o cliente paga o mês no Pix, a
 * Stripe ainda tem retentativas de cartão engatilhadas para dias à frente. Sem
 * este aviso, ela cobra de novo o mês que já foi pago.
 */
export async function marcarFaturaPagaPorFora(subscriptionId: string): Promise<boolean> {
  try {
    const s = stripe();
    const faturas = await s.invoices.list({
      subscription: subscriptionId,
      status: "open",
      limit: 3,
    });
    let alguma = false;
    for (const f of faturas.data) {
      if (!f.id) continue;
      await s.invoices.pay(f.id, { paid_out_of_band: true });
      alguma = true;
    }
    return alguma;
  } catch (e) {
    // Não pode derrubar a liberação do cliente: ele já pagou. Fica no log
    // para você conferir e, se for o caso, estornar na mão.
    console.error("[stripe] falha ao marcar fatura paga por fora:", (e as Error).message);
    return false;
  }
}
