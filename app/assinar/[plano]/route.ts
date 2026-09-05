import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { planoVendidoValido, priceIdDaStripe } from "@/lib/pagamentos/planos";
import { checkoutAssinatura } from "@/lib/pagamentos/stripe";
import { registrarFunil, landingDoPlano } from "@/lib/vendas-funil";
import { fimDoTeste, configDoTeste } from "@/lib/painel/teste";
import { avisarDono, textoNovoTeste } from "@/lib/avisos/zap";

/*
 * Ativa o teste grátis de 7 dias do Prospector — o /assinar sem Stripe.
 *
 *   visitante          → cadastro (o plano "teste" viaja junto e ele volta aqui)
 *   logado, sem org    → onboarding, idem
 *   org no grátis      → vira 'teste' com teste_ate daqui a 7 dias → tutorial
 *   org com plano pago → nada a ativar, vai para o painel
 *   já testou          → sem segundo teste: painel (que pede a assinatura)
 */
async function ativarTeste(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/cadastro?plano=teste", req.url));

  const org = await getMinhaOrg();
  if (!org) return NextResponse.redirect(new URL("/app/onboarding?plano=teste", req.url));

  const admin = createAdminClient();
  const { data: atualRaw } = await admin
    .from("organizacoes")
    .select("plano, teste_ate")
    .eq("id", org.id)
    .maybeSingle();
  const atual = atualRaw as { plano: string; teste_ate: string | null } | null;

  // Plano pago, ou teste já usado (a data fica gravada para sempre): não há
  // o que ativar. O painel explica a situação e oferece a assinatura.
  if (!atual || atual.plano !== "free" || atual.teste_ate) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  const ate = await fimDoTeste();
  const { error } = await admin
    .from("organizacoes")
    .update({ plano: "teste", teste_ate: ate })
    .eq("id", org.id)
    .eq("plano", "free");
  if (error) {
    // Migração pendente (o CHECK não conhece 'teste'): melhor a assinatura
    // paga na frente do que um erro cru na cara de quem ia experimentar.
    console.error("[assinar/teste]", error.message);
    return NextResponse.redirect(new URL("/app/assinatura", req.url));
  }

  await registrarFunil("prospector", "Começou o teste", "/assinar/teste");

  // O dono fica sabendo na hora, no WhatsApp dele. Cortesia: nunca derruba a ativação.
  const { dias } = await configDoTeste();
  const aviso = textoNovoTeste({ empresa: org.nome, email: user.email ?? null, ate, dias });
  await avisarDono(aviso.titulo, aviso.linhas);
  return NextResponse.redirect(new URL("/app/comecar", req.url));
}

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

  /*
   * /assinar/teste: o mesmo caminho do preço, sem cobrança no fim.
   *
   * Reaproveita o funil inteiro (cadastro → onboarding → volta para cá) e,
   * com a organização na mão, ATIVA o teste em vez de abrir a Stripe. Uma
   * vez só por conta: teste_ate gravado é teste usado, e quem já tem plano
   * pago não precisa de degustação.
   */
  if (bruto === "teste") return ativarTeste(_req);

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

  /*
   * O rastro do anúncio, colhido AQUI.
   *
   * Este é o último instante em que ainda estamos no nosso domínio: no clique
   * seguinte a pessoa já está no checkout da Stripe, onde o nosso pixel não
   * roda e estes cookies não existem. Se não pegarmos agora, a venda chega ao
   * Meta sem ligação com anúncio nenhum.
   *
   * _fbp é o navegador dela; _fbc é o clique no anúncio que a trouxe.
   */
  const bolachas = _req.headers.get("cookie") ?? "";
  const cookie = (nome: string) =>
    bolachas.match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`))?.[1] ?? "";
  const rastro = {
    fbp: cookie("_fbp").slice(0, 200),
    fbc: cookie("_fbc").slice(0, 200),
    // O primeiro IP da cadeia é o do visitante; os seguintes são de proxy.
    ip: (_req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 60),
    // Metadata da Stripe aceita 500 caracteres por campo.
    ua: (_req.headers.get("user-agent") ?? "").slice(0, 400),
    url: _req.url.slice(0, 400),
  };

  try {
    const destino = await checkoutAssinatura({
      orgId: org.id,
      email: user.email ?? "",
      customerId: (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id,
      plano,
      priceId,
      rastro,
    });
    // Degrau do funil: a Stripe abriu. Daqui ou paga, ou some.
    await registrarFunil(landingDoPlano(plano), "Chegou ao pagamento", `/assinar/${plano}`);
    return NextResponse.redirect(destino);
  } catch {
    // Qualquer tropeço na Stripe cai na tela que sabe explicar o que houve.
    return NextResponse.redirect(new URL("/app/assinatura", _req.url));
  }
}
