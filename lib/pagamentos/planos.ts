import "server-only";

/*
 * O que está À VENDA — preço e id da Stripe de cada plano.
 *
 * Não confundir com lib/painel/permissoes.ts: lá mora o que cada plano PODE
 * (recursos, cotas); aqui mora o que cada plano CUSTA e como se cobra. A
 * separação é de propósito — mudar preço não deveria encostar em permissão.
 *
 * O preço em centavos vem de env para bater com o preço criado na Stripe:
 * quem cobra no cartão é o price da Stripe; o valor daqui é o que a TELA
 * mostra e o que o PIX avulso cobra. Divergência entre os dois é o bug mais
 * silencioso possível — por isso os dois nomes ficam lado a lado no .env.
 */

export type PlanoVendido = "pro" | "agencia";

export function planoVendidoValido(bruto: string): PlanoVendido | null {
  return bruto === "pro" || bruto === "agencia" ? bruto : null;
}

export function precoCentavos(plano: PlanoVendido): number {
  /*
   * R$147 no Pro é decisão de posicionamento, não de custo: o plano entrega
   * US$5/mês de IA (que nós pagamos) + hospedagem de 3 sites, e mira quem
   * entende o valor da ferramenta — não quem procura o mais barato.
   */
  if (plano === "pro") return Number(process.env.PRECO_PRO_CENTAVOS) || 14_700; // R$147
  return Number(process.env.PRECO_MENSAL_CENTAVOS) || 30_000; // R$300
}

export function precoEmReais(plano: PlanoVendido): string {
  return (precoCentavos(plano) / 100).toLocaleString("pt-BR");
}

export function priceIdDaStripe(plano: PlanoVendido): string | null {
  const id =
    plano === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_AGENCIA;
  return id?.trim() || null;
}

/*
 * O plano de uma mensalidade que chegou pela Stripe.
 *
 * A fonte é a metadata da assinatura (gravada no checkout). O fallback para
 * "agencia" cobre as assinaturas antigas, criadas antes de existir Pro —
 * todas eram do plano único de R$300.
 */
export function planoDaMetadata(meta: Record<string, string> | null | undefined): PlanoVendido {
  return planoVendidoValido(meta?.plano ?? "") ?? "agencia";
}

/*
 * Que plano é este price da Stripe?
 *
 * Existe para o webhook poder confiar no que foi REALMENTE COBRADO, e não só
 * na metadata. Numa troca de plano são duas escritas na Stripe (o item e a
 * metadata) e elas podem não acontecer juntas — se ficássemos só na metadata,
 * uma falha no meio entregaria Agência para quem pagou Pro, ou o contrário.
 * O preço cobrado é o único fato indiscutível.
 */
export function planoDoPriceId(priceId: string | null | undefined): PlanoVendido | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO?.trim()) return "pro";
  if (priceId === process.env.STRIPE_PRICE_AGENCIA?.trim()) return "agencia";
  return null;
}

/*
 * Só se sobe de plano pelo painel.
 *
 * Descer é para o suporte, de propósito: quem tem 10 sites hospedados e cai
 * para uma cota de 3 vira um problema que a tela não resolve sozinha (o que
 * fazer com os 7 excedentes?), e é a conversa em que se retém o cliente.
 */
export function podeSubirPara(atual: PlanoVendido, alvo: PlanoVendido): boolean {
  return atual === "pro" && alvo === "agencia";
}
