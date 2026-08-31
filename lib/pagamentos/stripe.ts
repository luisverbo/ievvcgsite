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

/*
 * Traduz o erro da Stripe para algo acionável.
 *
 * O que ela devolve é técnico e em inglês ("No such price: prod_..."), e quem
 * lê é quem está configurando o sistema às 23h. Estes três casos respondem por
 * quase todo erro de configuração — e em todos a mensagem crua esconde a
 * causa real.
 */
function traduzirErro(e: unknown, variavel = "STRIPE_PRICE_AGENCIA"): Error {
  const msg = e instanceof Error ? e.message : String(e);

  // Colou o id do produto no lugar do id do preço. São vizinhos na mesma tela.
  if (/No such price/i.test(msg) && /prod_/.test(msg)) {
    return new Error(
      `Você colou o ID do produto (prod_…) em ${variavel}. O certo é o ID do PREÇO (price_…): no painel da Stripe, abra o produto, clique na linha do preço e copie o código price_… de lá.`,
    );
  }

  // Chave de um modo com preço do outro: os dois ambientes não se enxergam.
  if (/No such price|similar object exists in (test|live) mode/i.test(msg)) {
    return new Error(
      "A chave e o preço são de modos diferentes da Stripe. Teste e produção são ambientes separados: sk_test_ só funciona com preço criado no modo teste, e sk_live_ só com preço do modo produção. Confira os dois na Vercel.",
    );
  }

  if (/Invalid API Key|No API key provided|Expired API Key/i.test(msg)) {
    return new Error(
      "A Stripe recusou a chave (STRIPE_SECRET_KEY). Copie de novo em Desenvolvedores → Chaves de API, confirmando se está no modo certo, e refaça o deploy na Vercel.",
    );
  }

  return e instanceof Error ? e : new Error(msg);
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
  // Qual plano este checkout vende e o price da Stripe correspondente. O
  // plano viaja na metadata: é dela que o webhook descobre o que entregar.
  plano: string;
  priceId: string;
}): Promise<string> {
  const s = stripe();
  try {
    const sessao = await s.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: opcoes.priceId, quantity: 1 }],
      /*
       * Em modo assinatura a Stripe já cria o cliente sozinha — passar
       * `customer_creation` aqui é erro (só existe em pagamento avulso).
       * Quando o cliente já tem cadastro, reaproveitamos o dele para o
       * histórico de faturas não ficar espalhado em vários customers.
       */
      ...(opcoes.customerId
        ? { customer: opcoes.customerId }
        : { customer_email: opcoes.email }),
      client_reference_id: opcoes.orgId,
      subscription_data: { metadata: { org_id: opcoes.orgId, plano: opcoes.plano } },
      metadata: { org_id: opcoes.orgId, tipo: "assinatura", plano: opcoes.plano },
      locale: "pt-BR",
      /*
       * Não volta para a tela de faturas: o webhook que libera o plano leva
       * alguns segundos e o navegador volta na hora, então quem pagou podia
       * ler "escolha seu plano" logo depois de pagar. /app/pagamento segura
       * essa espera dizendo a verdade e leva ao primeiro passo de cada
       * produto.
       */
      success_url: `${urlBase()}/app/pagamento`,
      cancel_url: `${urlBase()}/app/assinatura?cancelado=1`,
    });
    if (!sessao.url) throw new Error("A Stripe não devolveu o endereço do checkout.");
    return sessao.url;
  } catch (e) {
    throw traduzirErro(e);
  }
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
  try {
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
  } catch (e) {
    throw traduzirErro(e);
  }
}

/*
 * Portal do cliente: trocar cartão, ver faturas, cancelar.
 *
 * Usamos o da Stripe de propósito — refazer essas telas é semanas de trabalho
 * para chegar num lugar pior, e cancelamento é onde erro dá processo.
 */
export async function portalDoCliente(customerId: string): Promise<string> {
  const s = stripe();
  try {
    const sessao = await s.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${urlBase()}/app/assinatura`,
    });
    return sessao.url;
  } catch (e) {
    throw traduzirErro(e);
  }
}

/*
 * Sobe o cliente de plano na assinatura que ele já tem.
 *
 * Troca o PREÇO do item do plano — não cria assinatura nova. Assim o cliente
 * mantém um cartão, uma fatura e uma data de renovação; duas assinaturas em
 * paralelo seria a receita para ele pagar dois planos sem perceber.
 *
 * `always_invoice` cobra a diferença proporcional na hora, no cartão que já
 * está cadastrado: ele usou meio mês de Pro, paga só o que falta para o
 * Agência até a renovação. Sem isso ele teria o plano caro de graça até o
 * mês virar.
 *
 * O item do site extra (quando existe) NÃO é tocado: identificamos o item do
 * plano pelo price, nunca por posição na lista.
 */
export async function trocarPlanoDaAssinatura(opcoes: {
  subscriptionId: string;
  precoAtual: string;
  precoNovo: string;
  orgId: string;
  planoNovo: string;
}): Promise<{ ok: true } | { ok: false; motivo: string }> {
  try {
    const s = stripe();
    const assinatura = await s.subscriptions.retrieve(opcoes.subscriptionId);
    const item = assinatura.items.data.find((i) => i.price?.id === opcoes.precoAtual);
    if (!item) {
      return {
        ok: false,
        motivo:
          "Não encontrei o plano atual dentro da sua assinatura. Fale com o suporte para trocarmos na mão.",
      };
    }

    /*
     * Ordem importa: primeiro o dinheiro, depois a etiqueta.
     *
     * Se a metadata falhasse depois de a cobrança passar, o webhook ainda
     * acerta o plano pelo preço da fatura (planoDoPriceId). O contrário —
     * etiqueta trocada e cobrança que não passou — entregaria plano de graça.
     */
    await s.subscriptionItems.update(item.id, {
      price: opcoes.precoNovo,
      proration_behavior: "always_invoice",
    });
    await s.subscriptions.update(opcoes.subscriptionId, {
      metadata: { org_id: opcoes.orgId, plano: opcoes.planoNovo },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: traduzirErro(e).message };
  }
}

/*
 * Sites extras hospedados: quantos o cliente paga por mês, além dos que o
 * plano já inclui.
 *
 * Entram como um SEGUNDO item na mesma assinatura, não como outra assinatura.
 * Assim o cliente tem uma fatura só, um cartão só, uma data só — e quando ele
 * cancela, cancela tudo junto. Duas assinaturas separadas viram, mais cedo ou
 * mais tarde, um cliente que cancelou uma e continua pagando a outra.
 *
 * `quantidade` é sempre o total desejado, não a diferença. Repetir a mesma
 * chamada não cobra de novo: para a Stripe, quantidade igual é nada mudou.
 *
 * `create_prorations` faz o rateio dos dias — quem contrata dia 20 paga só os
 * dias que faltam do mês, e quem devolve recebe o crédito na próxima fatura.
 */
export async function ajustarSitesExtras(
  subscriptionId: string,
  quantidade: number,
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const priceId = process.env.STRIPE_PRICE_SITE_EXTRA?.trim();
  if (!priceId) {
    return {
      ok: false,
      motivo:
        "A cobrança de site extra ainda não está configurada no servidor (STRIPE_PRICE_SITE_EXTRA). Fale com o suporte.",
    };
  }

  try {
    const s = stripe();
    const assinatura = await s.subscriptions.retrieve(subscriptionId);
    const item = assinatura.items.data.find((i) => i.price?.id === priceId);

    if (item) {
      if (quantidade > 0) {
        await s.subscriptionItems.update(item.id, {
          quantity: quantidade,
          proration_behavior: "create_prorations",
        });
      } else {
        // Zero extras: tira o item da assinatura em vez de deixar quantidade 0,
        // para a fatura do cliente não exibir uma linha de R$0,00.
        await s.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
      }
    } else if (quantidade > 0) {
      await s.subscriptionItems.create({
        subscription: subscriptionId,
        price: priceId,
        quantity: quantidade,
        proration_behavior: "create_prorations",
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: traduzirErro(e, "STRIPE_PRICE_SITE_EXTRA").message };
  }
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
