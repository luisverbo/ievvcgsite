/*
 * Em que pé está a assinatura de um cliente.
 *
 * Puro de propósito: é a regra que derruba (ou não) o site de alguém, e isso
 * precisa ser testável sem banco, sem Stripe e sem esperar sete dias passarem.
 *
 * Os quatro estados:
 *
 *   ativa     — pago em dia, tudo liberado.
 *   atrasada  — o cartão falhou, mas está dentro da tolerância. Continua com
 *               TUDO liberado, só que avisado. É de propósito: derrubar o site
 *               de um cliente do seu cliente por causa de um cartão vencido é
 *               entrar numa briga que não é sua.
 *   suspensa  — passou a tolerância. Cai para o plano grátis: o painel abre, os
 *               dados continuam lá, mas o que é pago para de funcionar.
 *   cancelada — pediu para sair.
 */

export const DIAS_TOLERANCIA = 7;

export type StatusAssinatura = "nova" | "ativa" | "atrasada" | "suspensa" | "cancelada";

export type AssinaturaRow = {
  plano: "pro" | "agencia";
  pago_ate: string | null;
  status: StatusAssinatura;
  falhou_em: string | null;
};

export type Situacao = {
  status: StatusAssinatura;
  liberado: boolean;
  diasRestantes: number; // só faz sentido em "atrasada"
  aviso: string | null;
};

const DIA = 86_400_000;

export function situacaoDaAssinatura(
  a: AssinaturaRow | null,
  agora: Date = new Date(),
): Situacao {
  // Sem assinatura = plano grátis. Não é erro nem bloqueio.
  if (!a) {
    return { status: "nova", liberado: false, diasRestantes: 0, aviso: null };
  }
  if (a.status === "cancelada") {
    return {
      status: "cancelada",
      liberado: false,
      diasRestantes: 0,
      aviso: "Sua assinatura foi cancelada. Reative quando quiser — nada foi apagado.",
    };
  }

  const pagoAte = a.pago_ate ? new Date(a.pago_ate).getTime() : 0;
  if (pagoAte > agora.getTime()) {
    return { status: "ativa", liberado: true, diasRestantes: 0, aviso: null };
  }

  /*
   * Venceu. A tolerância conta a partir do vencimento, não da hora em que o
   * cartão falhou: se a falha só for registrada dias depois (retentativa da
   * Stripe demora), contar dali daria ao cliente mais prazo do que o combinado
   * a cada mês que ele atrasa.
   */
  const base = pagoAte || (a.falhou_em ? new Date(a.falhou_em).getTime() : agora.getTime());
  const diasVencido = Math.floor((agora.getTime() - base) / DIA);
  const restantes = DIAS_TOLERANCIA - diasVencido;

  if (restantes > 0) {
    return {
      status: "atrasada",
      liberado: true,
      diasRestantes: restantes,
      aviso:
        restantes === 1
          ? "Seu pagamento falhou. Você tem 1 dia para regularizar antes que os sites saiam do ar."
          : `Seu pagamento falhou. Você tem ${restantes} dias para regularizar antes que os sites saiam do ar.`,
    };
  }

  return {
    status: "suspensa",
    liberado: false,
    diasRestantes: 0,
    aviso: "Sua assinatura está suspensa por falta de pagamento. Pague no cartão ou no Pix para reativar.",
  };
}

/*
 * O mês que uma cobrança cobre, no formato AAAA-MM-01.
 *
 * É a chave que impede o cliente de pagar o mesmo mês duas vezes — uma no Pix
 * e outra na retentativa do cartão, que a Stripe segue tentando por dias.
 */
export function periodoDe(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}-01`;
}

// Fim do período pago, a partir do início do mês cobrado.
export function fimDoPeriodo(periodo: string): Date {
  const [ano, mes] = periodo.split("-").map(Number);
  return new Date(Date.UTC(mes === 12 ? ano + 1 : ano, mes === 12 ? 0 : mes, 1));
}
