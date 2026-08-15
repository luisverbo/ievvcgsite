"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import {
  checkoutAssinatura,
  checkoutCredito,
  portalDoCliente,
  trocarPlanoDaAssinatura,
} from "@/lib/pagamentos/stripe";
import { criarPix, mpConfigurado, motivoIndisponivel } from "@/lib/pagamentos/mercadopago";
import { ehAdmin } from "@/lib/painel/admin";
import { situacaoDaAssinatura, periodoDe, type AssinaturaRow } from "@/lib/pagamentos/estado";
import {
  planoVendidoValido,
  precoCentavos,
  priceIdDaStripe,
  podeSubirPara,
} from "@/lib/pagamentos/planos";
import { cotaDoPlano } from "@/lib/painel/permissoes";
import { pacoteValido, MICRO } from "@/lib/creditos/precos";

/*
 * Estas ações são usadas direto em <form action={...}>, então devolvem void.
 * O recado para o cliente volta pela URL: em caso de erro, redireciona para a
 * própria tela com ?erro=..., que ela exibe. Devolver objeto aqui não compila
 * — e mais importante, sumiria da tela.
 */
function voltarCom(destino: string, chave: "erro" | "ok", texto: string): never {
  redirect(`${destino}?${chave}=${encodeURIComponent(texto)}`);
}

// Para o cliente, "indisponível" basta. Para você, que está configurando,
// a mensagem diz exatamente o que falta.
async function avisoSemPix(): Promise<string> {
  const base = "O Pix ainda não está disponível. Fale com o suporte.";
  return (await ehAdmin()) ? `${base}\n\n${motivoIndisponivel()}` : base;
}

async function emailDoUsuario(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

/* ----------------------------- assinar (cartão) --------------------------- */

export async function assinar(planoBruto: string): Promise<void> {
  const plano = planoVendidoValido(planoBruto);
  if (!plano) voltarCom("/app/assinatura", "erro", "Plano inválido.");

  const priceId = priceIdDaStripe(plano!);
  if (!priceId) {
    // Configuração incompleta (falta o price na Vercel) não pode virar um
    // erro técnico na cara do cliente na hora de PAGAR.
    voltarCom(
      "/app/assinatura",
      "erro",
      (await ehAdmin())
        ? `Falta configurar ${plano === "pro" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_AGENCIA"} na Vercel (e fazer Redeploy).`
        : "Este plano está indisponível no momento. Fale com o suporte.",
    );
  }

  const org = await getMinhaOrg();
  const email = await emailDoUsuario();
  if (!org || !email) voltarCom("/app/assinatura", "erro", "Faça login de novo.");

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("stripe_customer_id")
    .eq("org_id", org.id)
    .maybeSingle();

  let destino: string;
  try {
    destino = await checkoutAssinatura({
      orgId: org.id,
      email,
      customerId: (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id,
      plano: plano!,
      priceId: priceId!,
    });
  } catch (e) {
    voltarCom("/app/assinatura", "erro", (e as Error).message);
  }
  redirect(destino);
}

/* ------------------------------ subir de plano ---------------------------- */

/*
 * Pro → Agência, na assinatura que já existe.
 *
 * Só sobe. Descer é pelo suporte de propósito: um cliente com 10 sites
 * hospedados caindo para a cota de 3 cria uma pergunta que a tela não sabe
 * responder — e é justamente a conversa em que dá para segurar o cliente.
 */
export async function subirDePlano(alvoBruto: string): Promise<void> {
  const alvo = planoVendidoValido(alvoBruto);
  if (!alvo) voltarCom("/app/assinatura", "erro", "Plano inválido.");

  const org = await getMinhaOrg();
  if (!org) voltarCom("/app/assinatura", "erro", "Faça login de novo.");

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("plano, pago_ate, status, falhou_em, stripe_subscription_id")
    .eq("org_id", org.id)
    .maybeSingle();
  const assinatura = data as (AssinaturaRow & { stripe_subscription_id: string | null }) | null;

  const atual = planoVendidoValido(assinatura?.plano ?? "") ?? "agencia";
  if (!podeSubirPara(atual, alvo!)) {
    voltarCom("/app/assinatura", "erro", "Esta troca de plano precisa passar pelo suporte.");
  }
  if (!assinatura?.stripe_subscription_id) {
    voltarCom(
      "/app/assinatura",
      "erro",
      "Não encontramos sua assinatura no cartão. Fale com o suporte.",
    );
  }
  // Assinatura suspensa não sobe de plano: primeiro regulariza o que deve.
  if (!situacaoDaAssinatura(assinatura).liberado) {
    voltarCom(
      "/app/assinatura",
      "erro",
      "Regularize o pagamento em aberto antes de mudar de plano.",
    );
  }

  const precoAtual = priceIdDaStripe(atual);
  const precoNovo = priceIdDaStripe(alvo!);
  if (!precoAtual || !precoNovo) {
    voltarCom("/app/assinatura", "erro", "Este plano está indisponível no momento. Fale com o suporte.");
  }

  const r = await trocarPlanoDaAssinatura({
    subscriptionId: assinatura!.stripe_subscription_id!,
    precoAtual: precoAtual!,
    precoNovo: precoNovo!,
    orgId: org!.id,
    planoNovo: alvo!,
  });
  if (!r.ok) voltarCom("/app/assinatura", "erro", r.motivo);

  /*
   * Libera na hora, sem esperar o webhook.
   *
   * O webhook da fatura vai gravar o mesmo plano segundos depois — escrever
   * duas vezes o mesmo valor não faz mal. O que faria mal é o cliente pagar a
   * diferença e continuar vendo o plano antigo até o webhook chegar.
   */
  await admin
    .from("assinaturas")
    .update({ plano: alvo!, updated_at: new Date().toISOString() })
    .eq("org_id", org!.id);
  await admin
    .from("organizacoes")
    .update({ plano: alvo!, cota_mensal: cotaDoPlano(alvo!) })
    .eq("id", org!.id);

  /*
   * O crédito da diferença, agora.
   *
   * Trocar `cota_mensal` sozinho não aumenta o saldo: renovar_cota credita uma
   * vez a cada 30 dias, e a cota deste mês JÁ foi entregue quando ele era do
   * plano anterior. Sem esta parte, o cliente paga a diferença hoje e continua
   * com o crédito do plano velho até o mês virar — foi exatamente o que
   * aconteceu no primeiro upgrade real.
   *
   * A diferença inteira, e não a proporcional aos dias: mesquinhar dez dólares
   * com quem acabou de subir de plano é o pior momento possível para
   * economizar.
   */
  const diferenca = cotaDoPlano(alvo!) - cotaDoPlano(atual);
  if (diferenca > 0) {
    const { error } = await admin.rpc("creditar", {
      p_org: org!.id,
      p_valor: diferenca,
      p_tipo: "cota",
      p_descricao: `Crédito adicional pela mudança para o plano ${alvo === "agencia" ? "Agência" : "Pro"}`,
    });
    // Falhar aqui não desfaz o upgrade (ele já pagou): fica no log para acerto.
    if (error) console.error("[assinatura] falha ao creditar diferença:", error.message);
  }

  revalidatePath("/app/assinatura");
  revalidatePath("/app");
  revalidatePath("/app/conta");
  revalidatePath("/app/creditos");
  voltarCom(
    "/app/assinatura",
    "ok",
    "Plano alterado! A diferença proporcional deste mês foi cobrada no seu cartão, o crédito de IA já foi ajustado e tudo está liberado.",
  );
}

// Trocar cartão, ver faturas, cancelar — tudo no portal da Stripe.
export async function abrirPortal(): Promise<void> {
  const org = await getMinhaOrg();
  if (!org) voltarCom("/app/assinatura", "erro", "Organização não encontrada.");

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("stripe_customer_id")
    .eq("org_id", org.id)
    .maybeSingle();
  const customer = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customer) voltarCom("/app/assinatura", "erro", "Você ainda não tem assinatura ativa.");

  let destino: string;
  try {
    destino = await portalDoCliente(customer!);
  } catch (e) {
    voltarCom("/app/assinatura", "erro", (e as Error).message);
  }
  redirect(destino);
}

/* --------------------- Pix do mês que o cartão recusou -------------------- */

/*
 * Só existe quando o cartão falhou. Não é uma forma de pagar a assinatura por
 * escolha: é a saída para o cliente não ficar refém do banco dele.
 */
export async function pixDaMensalidade(): Promise<void> {
  const org = await getMinhaOrg();
  const email = await emailDoUsuario();
  if (!org || !email) voltarCom("/app/assinatura", "erro", "Faça login de novo.");
  if (!mpConfigurado()) voltarCom("/app/assinatura", "erro", await avisoSemPix());

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("plano, pago_ate, status, falhou_em")
    .eq("org_id", org!.id)
    .maybeSingle();
  const assinatura = data as AssinaturaRow | null;

  const situacao = situacaoDaAssinatura(assinatura);
  if (situacao.status !== "atrasada" && situacao.status !== "suspensa") {
    voltarCom("/app/assinatura", "erro", "Sua assinatura está em dia — não há nada a pagar agora.");
  }

  // O Pix cobra o valor do plano CONTRATADO — quem assinou Pro não pode
  // receber uma cobrança avulsa com o preço do Agência.
  const valorMes = precoCentavos(planoVendidoValido(assinatura?.plano ?? "") ?? "agencia");

  const periodo = periodoDe(new Date());

  // Já pagou este mês por qualquer caminho? Então não gera cobrança nova.
  const { count } = await admin
    .from("pagamentos")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org!.id)
    .eq("tipo", "assinatura")
    .eq("status", "pago")
    .eq("periodo", periodo);
  if ((count ?? 0) > 0) voltarCom("/app/assinatura", "erro", "Este mês já consta como pago.");

  // Reaproveita a cobrança pendente em vez de criar outra a cada clique.
  const { data: pendente } = await admin
    .from("cobrancas_pix")
    .select("id, expira_em")
    .eq("org_id", org!.id)
    .eq("periodo", periodo)
    .eq("status", "pendente")
    .maybeSingle();
  const atual = pendente as { id: string; expira_em: string | null } | null;
  if (atual && atual.expira_em && new Date(atual.expira_em) > new Date()) {
    voltarCom("/app/assinatura", "ok", "Você já tem um Pix aberto para este mês — use o código abaixo.");
  }

  try {
    const pix = await criarPix({
      valorCentavos: valorMes,
      descricao: `Mensalidade PáginaPro · ${periodo.slice(0, 7)}`,
      email: email!,
      referencia: `mensal:${org!.id}:${periodo}:${Date.now()}`,
      minutosParaExpirar: 60 * 24,
    });

    await admin.from("cobrancas_pix").insert({
      org_id: org!.id,
      periodo,
      valor_centavos: valorMes,
      mp_pagamento_id: pix.id,
      qr_code: pix.qrCode,
      qr_code_base64: pix.qrCodeBase64,
      expira_em: pix.expiraEm,
    });
  } catch (e) {
    voltarCom("/app/assinatura", "erro", `Não consegui gerar o Pix: ${(e as Error).message}`);
  }

  revalidatePath("/app/assinatura");
  redirect("/app/assinatura");
}

/* --------------------------- comprar crédito ------------------------------ */

export async function comprarCreditoCartao(dolares: number): Promise<void> {
  const org = await getMinhaOrg();
  const email = await emailDoUsuario();
  if (!org || !email) voltarCom("/app/creditos", "erro", "Faça login de novo.");

  const pacote = pacoteValido(dolares);
  if (!pacote) voltarCom("/app/creditos", "erro", "Pacote inválido.");

  let destino: string;
  try {
    destino = await checkoutCredito({
      orgId: org!.id,
      email: email!,
      dolares: pacote!.dolares,
      precoCentavos: pacote!.preco * 100,
      creditos: pacote!.dolares * MICRO,
    });
  } catch (e) {
    voltarCom("/app/creditos", "erro", (e as Error).message);
  }
  redirect(destino);
}

export type PixCreditoState =
  | { error: string }
  | { qrCode: string; qrCodeBase64: string; expiraEm: string | null }
  | undefined;

export async function comprarCreditoPix(dolares: number): Promise<PixCreditoState> {
  const org = await getMinhaOrg();
  const email = await emailDoUsuario();
  if (!org || !email) return { error: "Faça login de novo." };
  if (!mpConfigurado()) return { error: await avisoSemPix() };

  const pacote = pacoteValido(dolares);
  if (!pacote) return { error: "Pacote inválido." };

  try {
    const pix = await criarPix({
      valorCentavos: pacote.preco * 100,
      descricao: `US$ ${pacote.dolares} em créditos de IA`,
      email,
      referencia: `credito:${org.id}:${pacote.dolares * MICRO}:${Date.now()}`,
    });
    return { qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64, expiraEm: pix.expiraEm };
  } catch (e) {
    return { error: `Não consegui gerar o Pix: ${(e as Error).message}` };
  }
}
