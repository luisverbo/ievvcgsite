import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/pagamentos/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { periodoDe, fimDoPeriodo } from "@/lib/pagamentos/estado";
import { cotaDoPlano } from "@/lib/painel/permissoes";
import { planoDaMetadata, planoDoPriceId, type PlanoVendido } from "@/lib/pagamentos/planos";
import { mandarBoasVindas } from "@/lib/email/boas-vindas";
import { enviarCompraAoMeta } from "@/lib/meta/capi";
import { emailDoDono } from "@/lib/painel/acesso";
import { registrarFunil, landingDoPlano } from "@/lib/vendas-funil";

/*
 * Qual plano esta fatura realmente cobrou.
 *
 * Numa troca de plano a fatura traz duas linhas: o estorno proporcional do
 * plano velho (valor negativo) e a cobrança do novo (positivo). Somando por
 * plano e pegando o maior positivo, sobra o que ele passou a pagar.
 *
 * Linha de site extra é ignorada sozinha: o price dela não é de plano nenhum.
 */
function planoDaFatura(f: Stripe.Invoice): PlanoVendido | null {
  const soma = new Map<PlanoVendido, number>();
  for (const linha of f.lines?.data ?? []) {
    const priceId =
      (linha as { price?: { id?: string } }).price?.id ??
      (linha as { pricing?: { price_details?: { price?: string } } }).pricing?.price_details?.price;
    const plano = planoDoPriceId(priceId);
    if (!plano) continue;
    soma.set(plano, (soma.get(plano) ?? 0) + (linha.amount ?? 0));
  }
  let melhor: PlanoVendido | null = null;
  let maior = 0;
  for (const [plano, valor] of soma) {
    if (valor > maior) {
      maior = valor;
      melhor = plano;
    }
  }
  return melhor;
}

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
        if (!orgId) break;

        /*
         * Assinatura fechada por LINK DE PAGAMENTO (buy.stripe.com), usada na
         * venda na mão: manda-se o link com ?client_reference_id=<org_id>.
         *
         * O link não carrega metadata nossa, então a fatura que vem depois
         * não teria como dizer de quem é o dinheiro — e o pagamento entraria
         * sem liberar a conta, que é o pior defeito possível. Aqui gravamos o
         * cliente da Stripe na organização; daí em diante o caminho normal
         * (orgDaFatura pelo customer) reconhece esta e todas as renovações.
         *
         * Pelo site isso nem chega a ser necessário — /assinar/<plano> já
         * nasce com o org_id na metadata. É rede de segurança para a venda
         * feita fora do site.
         */
        if (s.mode === "subscription") {
          const customer = typeof s.customer === "string" ? s.customer : s.customer?.id;
          if (customer) {
            await admin
              .from("assinaturas")
              .upsert({ org_id: orgId, stripe_customer_id: customer }, { onConflict: "org_id" });
          }
          break;
        }

        if (s.metadata?.tipo !== "credito") break;
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

        /*
         * Fatura de troca de plano (o rateio dos dias) x mensalidade.
         *
         * A diferença importa: a mensalidade passa por `pagar_assinatura`, que
         * tem a trava de "um mês só pode ser pago uma vez" — a proteção contra
         * pagar o mesmo mês no Pix e no cartão. Só que a fatura do upgrade cai
         * no MESMO mês da mensalidade e batia nessa trava, sumindo do extrato
         * em silêncio mesmo com o dinheiro já cobrado.
         *
         * Então ela entra como tipo 'upgrade', fora da trava. A idempotência
         * continua garantida pelo UNIQUE em (provedor, evento_id).
         */
        if (f.billing_reason === "subscription_update") {
          const { error } = await admin.from("pagamentos").insert({
            org_id: orgId,
            provedor: "stripe",
            evento_id: evento.id,
            tipo: "upgrade",
            valor_centavos: f.amount_paid ?? 0,
            periodo,
            status: "pago",
            descricao: "Diferença da troca de plano",
          });
          // 23505 = webhook repetido. É o comportamento esperado, não é falha.
          if (error && error.code !== "23505") throw new Error(error.message);
        } else {
          await admin.rpc("pagar_assinatura", {
            p_org: orgId,
            p_provedor: "stripe",
            p_evento: evento.id,
            p_valor: f.amount_paid ?? 0,
            p_periodo: periodo,
            p_ate: fimDoPeriodo(periodo).toISOString(),
            p_descricao: "Mensalidade no cartão",
          });
        }

        /*
         * Que plano entregar. O preço COBRADO manda; a metadata é o plano B.
         *
         * Assim o upgrade fica correto mesmo que a gravação da metadata falhe
         * no meio da troca: o cliente recebe exatamente o plano que pagou.
         */
        const planoPago =
          planoDaFatura(f) ??
          planoDaMetadata(
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
        /*
         * O plano ANTES desta fatura decide se é a primeira liberação.
         *
         * invoice.paid chega todo mês; boas-vindas é uma vez só. Sair de
         * "free" (ou de nada) para um plano pago é exatamente a compra —
         * renovação chega aqui já com o plano certo e não dispara nada.
         *
         * Quem cancelou e voltou recebe de novo, e está certo: para ele é
         * uma entrada nova, e a senha provavelmente já foi esquecida.
         */
        const { data: antes } = await admin
          .from("organizacoes")
          .select("plano")
          .eq("id", orgId)
          .maybeSingle();
        const planoAntigo = (antes as { plano: string } | null)?.plano ?? "free";

        await admin
          .from("organizacoes")
          .update({ plano: planoPago, cota_mensal: cotaDoPlano(planoPago) })
          .eq("id", orgId);

        /*
         * O e-mail de boas-vindas, com o link de acesso dentro.
         *
         * Depois do update de propósito: o acesso liberado é o que importa, o
         * e-mail é a cortesia. E o await é engolido — falha aqui NÃO pode
         * virar erro para a Stripe, ou ela reenvia o evento e o cliente
         * termina com o mês pago duas vezes. O motivo vai para o log.
         */
        // planoPago é sempre um plano vendido — só o lado de cá pode ser free
        // ou teste. Quem vem do teste grátis está COMPRANDO agora: boas-vindas,
        // conversão e degrau do funil valem igual.
        if (planoAntigo === "free" || planoAntigo === "teste") {
          const r = await mandarBoasVindas(orgId, planoPago).catch((e) => ({
            ok: false,
            motivo: (e as Error).message,
          }));
          if (!r.ok) console.error("[boas-vindas]", orgId, r.motivo);

          /*
           * A venda contada para o Meta, pelo servidor.
           *
           * Só na PRIMEIRA cobrança: renovação de mês não é conversão de
           * anúncio, e mandar renovação como Purchase ensinaria o algoritmo a
           * mirar em quem já é cliente.
           *
           * Os identificadores vêm da metadata da assinatura, gravados lá no
           * clique de assinar — é o último ponto em que os cookies do pixel
           * ainda existiam. Também engolido: rastreamento não pode derrubar
           * um pagamento.
           */
          const meta =
            (f as { subscription_details?: { metadata?: Record<string, string> } })
              .subscription_details?.metadata ?? {};
          const capi = await enviarCompraAoMeta({
            email: await emailDoDono(orgId),
            fbp: meta.fbp,
            fbc: meta.fbc,
            ip: meta.ip,
            navegador: meta.ua,
            origemUrl: meta.url,
            valor: (f.amount_paid ?? 0) / 100,
            plano: planoPago,
            // O id do evento da Stripe: webhook repetido não vira venda dupla.
            eventoId: evento.id,
          }).catch((e) => ({ ok: false as const, erro: (e as Error).message }));
          if (!capi.ok) console.error("[meta-capi]", orgId, capi.erro);

          // O último degrau do funil, no relatório de métricas da landing.
          await registrarFunil(landingDoPlano(planoPago), "Comprou", "/app/pagamento");
        }
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
