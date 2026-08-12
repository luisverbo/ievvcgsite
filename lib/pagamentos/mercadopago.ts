import "server-only";

import { MercadoPagoConfig, Payment } from "mercadopago";

/*
 * Mercado Pago: Pix.
 *
 * Entra em dois lugares só:
 *   1. compra avulsa de crédito — sem risco nenhum, o dinheiro entra antes;
 *   2. o mês que o cartão recusou — para o cliente não ficar refém do banco.
 *
 * A assinatura em si nunca passa por aqui. Pix não renova sozinho: exige
 * decisão do cliente todo mês, e é exatamente isso que a assinatura no cartão
 * existe para evitar.
 */

export function mpConfigurado(): boolean {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}

function pagamentos(): Payment {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return new Payment(new MercadoPagoConfig({ accessToken: token }));
}

export type PixCriado = {
  id: string;
  qrCode: string;
  qrCodeBase64: string;
  expiraEm: string | null;
};

/*
 * Cria uma cobrança Pix.
 *
 * `referencia` é o que amarra o pagamento à organização e ao motivo. O webhook
 * chega sem sessão nenhuma — é por ela que sabemos a quem creditar.
 */
export async function criarPix(opcoes: {
  valorCentavos: number;
  descricao: string;
  email: string;
  referencia: string;
  minutosParaExpirar?: number;
}): Promise<PixCriado> {
  const expira = new Date(Date.now() + (opcoes.minutosParaExpirar ?? 60) * 60_000);

  const r = await pagamentos().create({
    body: {
      transaction_amount: Number((opcoes.valorCentavos / 100).toFixed(2)),
      description: opcoes.descricao,
      payment_method_id: "pix",
      external_reference: opcoes.referencia,
      date_of_expiration: expira.toISOString(),
      payer: { email: opcoes.email },
    },
    // Sem isto, um clique duplo no botão gera duas cobranças diferentes para a
    // mesma coisa — e o cliente pode pagar as duas.
    requestOptions: { idempotencyKey: opcoes.referencia },
  });

  const dados = r.point_of_interaction?.transaction_data;
  if (!r.id || !dados?.qr_code) {
    throw new Error("O Mercado Pago não devolveu o código Pix.");
  }

  return {
    id: String(r.id),
    qrCode: dados.qr_code,
    qrCodeBase64: dados.qr_code_base64 ?? "",
    expiraEm: r.date_of_expiration ?? expira.toISOString(),
  };
}

// Consulta o pagamento no Mercado Pago. O webhook manda só o id — o valor e o
// status precisam vir da fonte, nunca do corpo da notificação.
export async function consultarPagamento(id: string) {
  const r = await pagamentos().get({ id });
  return {
    id: String(r.id),
    status: r.status ?? "",
    aprovado: r.status === "approved",
    valorCentavos: Math.round((r.transaction_amount ?? 0) * 100),
    referencia: r.external_reference ?? "",
  };
}
