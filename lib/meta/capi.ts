import "server-only";

import { createHash } from "node:crypto";

/*
 * Conversions API do Meta — a venda contada pelo SERVIDOR.
 *
 * O pixel do navegador conta a visita e o clique em "assinar", e para aí: a
 * compra acontece no domínio da Stripe, onde o nosso pixel não roda. Ou seja,
 * o Meta sabia quem entrou no caixa e nunca soube quem pagou — e otimizava o
 * anúncio pelo sinal errado, procurando gente que CLICA em vez de gente que
 * COMPRA.
 *
 * Aqui a venda é enviada do nosso servidor, na hora em que o dinheiro entra
 * de verdade (webhook da Stripe). É o sinal mais valioso que existe para o
 * algoritmo, e o único que não some quando o navegador bloqueia cookie.
 *
 * Os identificadores (_fbp, _fbc, IP, navegador) são colhidos lá no clique de
 * assinar e viajam na metadata da Stripe até aqui — sem eles o Meta recebe a
 * venda mas não consegue ligá-la a nenhum anúncio.
 */

/*
 * A versão da API do Graph.
 *
 * O Meta aposenta versões com uns dois anos de prazo. Se um dia a resposta
 * vier reclamando de versão, é só apontar META_API_VERSION para uma mais nova
 * na Vercel — sem mexer em código.
 */
const VERSAO = process.env.META_API_VERSION?.trim() || "v21.0";

/* O Meta exige SHA-256 do valor normalizado (minúsculo, sem espaços). */
function hash(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

export type DadosCompra = {
  /* De quem: quanto mais campos, melhor a chance de o Meta achar a pessoa. */
  email?: string | null;
  fbp?: string | null; // cookie _fbp — o navegador da pessoa
  fbc?: string | null; // cookie _fbc — o clique no anúncio que a trouxe
  ip?: string | null;
  navegador?: string | null;
  /* O quê: valor em REAIS (não centavos) e o que foi comprado. */
  valor: number;
  plano: string;
  /* Para o Meta não contar a mesma venda duas vezes se o webhook repetir. */
  eventoId: string;
  /* A página de onde veio a compra. */
  origemUrl?: string | null;
};

export function capiConfigurada(): boolean {
  return Boolean(process.env.META_CAPI_TOKEN?.trim());
}

export type ResultadoCapi = { ok: true } | { ok: false; erro: string };

/*
 * REGRA: nunca lança. Quem chama é o webhook da Stripe, e uma falha de
 * rastreamento não pode fazer o pagamento voltar como erro — a Stripe
 * reenviaria o evento e o cliente terminaria com o mês pago duas vezes.
 */
export async function enviarCompraAoMeta(dados: DadosCompra): Promise<ResultadoCapi> {
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!token) return { ok: false, erro: "sem META_CAPI_TOKEN" };

  // O id do pixel é o MESMO que aparece nas landings, configurado no Admin.
  const { pixelDasVendas } = await import("@/lib/vendas-pixel");
  const { meta: pixelId } = await pixelDasVendas();
  if (!pixelId) return { ok: false, erro: "sem pixel do Meta configurado no Admin" };

  /*
   * user_data só com o que existe. Mandar campo vazio não é neutro: o Meta
   * conta isso como qualidade baixa de correspondência e o evento vale menos.
   */
  const user: Record<string, unknown> = {};
  if (dados.email) user.em = [hash(dados.email)];
  if (dados.fbp) user.fbp = dados.fbp;
  if (dados.fbc) user.fbc = dados.fbc;
  if (dados.ip) user.client_ip_address = dados.ip;
  if (dados.navegador) user.client_user_agent = dados.navegador;

  const corpo = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: dados.eventoId,
        // "website" mesmo saindo do servidor: a jornada começou no site, e é
        // assim que o Meta junta este evento com o InitiateCheckout de lá.
        action_source: "website",
        ...(dados.origemUrl ? { event_source_url: dados.origemUrl } : {}),
        user_data: user,
        custom_data: {
          currency: "BRL",
          value: Number(dados.valor.toFixed(2)),
          content_name: dados.plano,
          content_type: "product",
          content_ids: [dados.plano],
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${VERSAO}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        // O webhook da Stripe tem tempo curto; rastreamento não pode segurá-lo.
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) {
      const texto = await res.text().catch(() => "");
      return { ok: false, erro: `Meta respondeu ${res.status}: ${texto.slice(0, 250)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message.slice(0, 200) };
  }
}
