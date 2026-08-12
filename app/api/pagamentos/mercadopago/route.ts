import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { consultarPagamento } from "@/lib/pagamentos/mercadopago";
import { marcarFaturaPagaPorFora } from "@/lib/pagamentos/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { fimDoPeriodo } from "@/lib/pagamentos/estado";

/*
 * Webhook do Mercado Pago (Pix).
 *
 * A notificação avisa "o pagamento X mudou" e nada mais — o status e o valor
 * são consultados na API deles. Confiar no corpo seria aceitar que qualquer um
 * mande um POST dizendo que pagou.
 *
 * A referência (`external_reference`) foi montada por nós na hora de criar a
 * cobrança e diz de quem é e para quê:
 *   credito:<orgId>:<microdolares>:<carimbo>
 *   mensal:<orgId>:<periodo>:<carimbo>
 */

export const maxDuration = 60;

// Confere a assinatura do Mercado Pago quando o segredo está configurado.
function assinaturaValida(req: Request, dataId: string): boolean {
  const segredo = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!segredo) return true; // sem segredo configurado, a checagem do id na API já protege

  const cabecalho = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const partes = Object.fromEntries(
    cabecalho.split(",").map((p) => p.split("=").map((x) => x.trim()) as [string, string]),
  );
  if (!partes.ts || !partes.v1) return false;

  const molde = `id:${dataId};request-id:${requestId};ts:${partes.ts};`;
  const esperado = createHmac("sha256", segredo).update(molde).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  let corpo: { type?: string; action?: string; data?: { id?: string } };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const tipo = corpo.type ?? corpo.action?.split(".")[0];
  const id = corpo.data?.id ? String(corpo.data.id) : null;
  if (tipo !== "payment" || !id) return NextResponse.json({ ignorado: true });

  if (!assinaturaValida(req, id)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  try {
    // A fonte da verdade é a API deles, não o que chegou no POST.
    const pg = await consultarPagamento(id);
    if (!pg.aprovado) return NextResponse.json({ recebido: true, status: pg.status });

    const [motivo, orgId, valor] = pg.referencia.split(":");
    if (!orgId) return NextResponse.json({ error: "referência sem organização" }, { status: 400 });

    const admin = createAdminClient();

    if (motivo === "credito") {
      const creditos = Number(valor);
      if (!Number.isFinite(creditos) || creditos <= 0) {
        return NextResponse.json({ error: "referência inválida" }, { status: 400 });
      }
      await admin.rpc("pagar_credito", {
        p_org: orgId,
        p_provedor: "mercadopago",
        p_evento: pg.id,
        p_valor: pg.valorCentavos,
        p_creditos: creditos,
        p_descricao: "Compra de créditos no Pix",
      });
      return NextResponse.json({ recebido: true });
    }

    if (motivo === "mensal") {
      const periodo = valor; // AAAA-MM-01
      const { data: novo } = await admin.rpc("pagar_assinatura", {
        p_org: orgId,
        p_provedor: "mercadopago",
        p_evento: pg.id,
        p_valor: pg.valorCentavos,
        p_periodo: periodo,
        p_ate: fimDoPeriodo(periodo).toISOString(),
        p_descricao: "Mensalidade no Pix",
      });

      await admin
        .from("cobrancas_pix")
        .update({ status: "pago" })
        .eq("org_id", orgId)
        .eq("periodo", periodo)
        .eq("status", "pendente");

      /*
       * O passo que evita a cobrança dobrada: a Stripe continua tentando o
       * cartão por dias depois da falha. Se ninguém avisar que o mês já foi
       * pago no Pix, ela cobra de novo.
       */
      if (novo !== false) {
        const { data } = await admin
          .from("assinaturas")
          .select("stripe_subscription_id")
          .eq("org_id", orgId)
          .maybeSingle();
        const sub = (data as { stripe_subscription_id: string | null } | null)
          ?.stripe_subscription_id;
        if (sub) await marcarFaturaPagaPorFora(sub);
      }
      return NextResponse.json({ recebido: true });
    }

    return NextResponse.json({ ignorado: true });
  } catch (e) {
    console.error("[mercadopago webhook]", (e as Error).message);
    // 500 faz o Mercado Pago reenviar — é o certo quando a falha é nossa.
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }
}
