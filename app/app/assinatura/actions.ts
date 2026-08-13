"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { checkoutAssinatura, checkoutCredito, portalDoCliente } from "@/lib/pagamentos/stripe";
import { criarPix, mpConfigurado, motivoIndisponivel } from "@/lib/pagamentos/mercadopago";
import { ehAdmin } from "@/lib/painel/admin";
import { situacaoDaAssinatura, periodoDe, type AssinaturaRow } from "@/lib/pagamentos/estado";
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

const PRECO_MENSAL_CENTAVOS = Number(process.env.PRECO_MENSAL_CENTAVOS) || 30_000; // R$300

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

export async function assinar(): Promise<void> {
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
    });
  } catch (e) {
    voltarCom("/app/assinatura", "erro", (e as Error).message);
  }
  redirect(destino);
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
      valorCentavos: PRECO_MENSAL_CENTAVOS,
      descricao: `Mensalidade PáginaPro · ${periodo.slice(0, 7)}`,
      email: email!,
      referencia: `mensal:${org!.id}:${periodo}:${Date.now()}`,
      minutosParaExpirar: 60 * 24,
    });

    await admin.from("cobrancas_pix").insert({
      org_id: org!.id,
      periodo,
      valor_centavos: PRECO_MENSAL_CENTAVOS,
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
