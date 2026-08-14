import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/pagamentos/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { periodoDe, fimDoPeriodo } from "@/lib/pagamentos/estado";
import { cotaDoPlano } from "@/lib/painel/permissoes";
import { planoDaMetadata } from "@/lib/pagamentos/planos";

/*
 * Webhook da Stripe — é AQUI que o dinheiro vira acesso.
 *
 * Nunca na tela de retorno: o cliente paga e fecha a aba antes de voltar, e
 * quem depende do retorno cobra sem entregar.
 *
 * Três cuidados que não são opcionais:
 *
 * 1. Assinatura conferida. Sem verificar o cabeçalho, qualquer um manda um
 *    POST dizendo "fulano pagou" e ganha um plano de graça.
 * 2. Idempotência. A Stripe reenvia o mesmo evento de propósito (retentativa,
 *    timeout, replay). A UNIQUE em (provedor, evento_id) no banco é o que
 *    impede o cliente de receber crédito duas ou três vezes.
 * 3. Corpo cru. A verificação usa o texto exato recebido — ler como JSON e
 *    reserializar quebra a assinatura.
 */

export const maxDuration = 60;

export async function POST(req: Request) {
  const assinatura = req.headers.get("stripe-signature");
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!assinatura || !segredo) {
    return NextResponse.json({ error: "webhook não configurado" }, { status: 400 });
  }

  const corpo = await req.text();
  let evento: Stripe.Event;
  try {
    evento = stripe().webhooks.constructEvent(corpo, assinatura, segredo);
  } catch (e) {
    return NextResponse.json({ error: `assinatura inválida: ${(e as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (evento.type) {
      /*
       * Pagamento avulso (crédito). Só o checkout de `mode: payment` termina
       * aqui já pago — o de assinatura é tratado em invoice.paid, que é quem
       * também cobre as renovações dos meses seguintes.
       */
      case "checkout.session.completed": {
        const s = evento.data.object;
        const orgId = s.metadata?.org_id ?? s.client_reference_id;
        if (!orgId || s.metadata?.tipo !== "credito") break;
        if (s.payment_status !== "paid") break;

        const creditos = Number(s.metadata?.creditos ?? 0);
        if (creditos > 0) {
          await admin.rpc("pagar_credito", {
            p_org: orgId,
            p_provedor: "stripe",
            p_evento: evento.id,
            p_valor: s.amount_total ?? 0,
            p_creditos: creditos,
            p_descricao: "Compra de créditos no cartão",
          });
        }
        break;
      }

      // Assinatura paga — a primeira e todas as renovações.
      case "invoice.paid": {
        const f = evento.data.object as Stripe.Invoice & {
          subscription?: string | { id: string };
        };
        const orgId = await orgDaFatura(f);
        if (!orgId) break;

        // O período vem da própria fatura quando existe; senão, do dia de hoje.
        const inicio = f.period_start ? new Date(f.period_start * 1000) : new Date();
        const periodo = periodoDe(inicio);

        await admin.rpc("pagar_assinatura", {
          p_org: orgId,
          p_provedor: "stripe",
          p_evento: evento.id,
          p_valor: f.amount_paid ?? 0,
          p_periodo: periodo,
          p_ate: fimDoPeriodo(periodo).toISOString(),
          p_descricao: "Mensalidade no cartão",
        });

        /*
         * O plano vem da metadata da assinatura, gravada no checkout. É o que
         * permite vender Pro e Agência pelo MESMO webhook: cada renovação
         * repete a metadata, então até o upgrade futuro fica correto — a
         * fatura seguinte traz o plano novo e a promoção acompanha.
         */
        const planoPago = planoDaMetadata(
          (f as { subscription_details?: { metadata?: Record<string, string> } })
            .subscription_details?.metadata ?? f.metadata ?? undefined,
        );

        // Guarda os ids para o portal e para o Pix saber qual fatura quitar.
        const sub = typeof f.subscription === "string" ? f.subscription : f.subscription?.id;
        await admin
          .from("assinaturas")
          .update({
            stripe_customer_id: typeof f.customer === "string" ? f.customer : (f.customer?.id ?? null),
            stripe_subscription_id: sub ?? null,
            plano: planoPago,
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId);

        /*
         * Promove a organização — sem isto o cliente paga e não recebe nada.
         *
         * Quem libera as telas é `organizacoes.plano`; a assinatura só diz se
         * está em dia. Faltando esta parte, o pagamento entrava, a assinatura
         * ficava ativa e o cliente continuava no plano grátis, sem crédito.
         */
        await admin
          .from("organizacoes")
          .update({ plano: planoPago, cota_mensal: cotaDoPlano(planoPago) })
          .eq("id", orgId);
        break;
      }

      /*
       * Cartão recusado. NÃO bloqueia nada agora: começa a tolerância. É o
       * `pago_ate` que decide o acesso, e ele ainda está válido até o fim do
       * mês pago.
       */
      case "invoice.payment_failed": {
        const f = evento.data.object as Stripe.Invoice;
        const orgId = await orgDaFatura(f);
        if (!orgId) break;
        await admin
          .from("assinaturas")
          .update({
            status: "atrasada",
            falhou_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = evento.data.object;
        const orgId = sub.metadata?.org_id;
        if (!orgId) break;
        // Cancelada, mas o que já foi pago continua valendo até o fim do mês.
        await admin
          .from("assinaturas")
          .update({ status: "cancelada", updated_at: new Date().toISOString() })
          .eq("org_id", orgId);
        /*
         * Zera os sites extras: o item que os cobrava morreu junto com a
         * assinatura. Sem isto, o cliente que voltasse meses depois reapareceria
         * devendo extras que ninguém mais está cobrando — e a nossa conta
         * discordaria da conta da Stripe, que é a que ele enxerga na fatura.
         */
        await admin.from("organizacoes").update({ sites_extras_pagos: 0 }).eq("id", orgId);
        break;
      }
    }
  } catch (e) {
    // Devolver 500 faz a Stripe reenviar, que é o certo para falha nossa.
    console.error("[stripe webhook]", evento.type, (e as Error).message);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }

  return NextResponse.json({ recebido: true });
}

/*
 * De quem é esta fatura.
 *
 * A metadata da assinatura é a fonte boa, mas nem toda fatura traz. O customer
 * é o plano B — por isso ele é guardado assim que a primeira fatura chega.
 */
async function orgDaFatura(
  f: Stripe.Invoice & { subscription?: string | { id: string } },
): Promise<string | null> {
  // subscription_details existe na API mas não no tipo desta versão do SDK.
  const detalhes = (f as { subscription_details?: { metadata?: Record<string, string> } })
    .subscription_details;
  const daMetadata = detalhes?.metadata?.org_id ?? f.metadata?.org_id;
  if (daMetadata) return daMetadata;

  const customer = typeof f.customer === "string" ? f.customer : f.customer?.id;
  if (!customer) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("org_id")
    .eq("stripe_customer_id", customer)
    .maybeSingle();
  return (data as { org_id: string } | null)?.org_id ?? null;
}
