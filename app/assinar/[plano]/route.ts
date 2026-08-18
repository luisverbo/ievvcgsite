import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { planoVendidoValido, priceIdDaStripe } from "@/lib/pagamentos/planos";
import { checkoutAssinatura } from "@/lib/pagamentos/stripe";

/*
 * O atalho da landing: /assinar/pro e /assinar/agencia.
 *
 * Um clique no preço tem que cair no pagamento — não no painel, não num
 * menu. Mas o checkout PRECISA nascer com o org_id na metadata: é por ele
 * que o webhook sabe de quem é o dinheiro. Um link de pagamento cru (aquele
 * buy.stripe.com solto) não carrega isso, e o resultado seria o pior
 * defeito possível: a cobrança entra e a conta do cliente não libera.
 *
 * Por isso este caminho:
 *   já tem conta  → sessão de checkout com metadata, direto para a Stripe
 *   não tem conta → cadastro, e o plano escolhido viaja junto até a volta
 *
 * Os links de pagamento continuam úteis para venda na mão (ver o comentário
 * em checkout.session.completed, no webhook) — só não podem ser o botão da
 * landing, onde quem clica ainda é um desconhecido.
 */

export async function GET(_req: Request, ctx: { params: Promise<{ plano: string }> }) {
  const { plano: bruto } = await ctx.params;
  const plano = planoVendidoValido(bruto);
  if (!plano) return NextResponse.redirect(new URL("/#preco", _req.url));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visitante: cria a conta primeiro. O plano vai junto e ele volta para cá.
  if (!user) {
    return NextResponse.redirect(new URL(`/cadastro?plano=${plano}`, _req.url));
  }

  const org = await getMinhaOrg();
  // Logado, mas ainda sem organização (parou no meio do onboarding).
  if (!org) {
    return NextResponse.redirect(new URL(`/app/onboarding?plano=${plano}`, _req.url));
  }

  const priceId = priceIdDaStripe(plano);
  // Sem price configurado, mandar para a tela de assinatura é melhor que
  // estourar um erro de Stripe na cara de quem ia pagar.
  if (!priceId) return NextResponse.redirect(new URL("/app/assinatura", _req.url));

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("stripe_customer_id")
    .eq("org_id", org.id)
    .maybeSingle();

  try {
    const destino = await checkoutAssinatura({
      orgId: org.id,
      email: user.email ?? "",
      customerId: (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id,
      plano,
      priceId,
    });
    return NextResponse.redirect(destino);
  } catch {
    // Qualquer tropeço na Stripe cai na tela que sabe explicar o que houve.
    return NextResponse.redirect(new URL("/app/assinatura", _req.url));
  }
}
