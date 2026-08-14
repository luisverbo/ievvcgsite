import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sitesDoPlano, planoVigente } from "@/lib/painel/permissoes";
import { ajustarSitesExtras } from "@/lib/pagamentos/stripe";

/*
 * Quantos sites uma organização pode manter hospedados — e quanto custa
 * passar disso.
 *
 * Teto = o que o plano inclui + extras pagos + extras de cortesia.
 */

export const PRECO_SITE_EXTRA_CENTAVOS = 2990;

export function precoExtraEmReais(): string {
  return (PRECO_SITE_EXTRA_CENTAVOS / 100).toFixed(2).replace(".", ",");
}

/*
 * O que conta como UM site.
 *
 * "clinica.com.br" e "www.clinica.com.br" são o mesmo site para qualquer
 * pessoa que não seja técnica — e o cliente precisa conectar os dois para o
 * site funcionar direito. Cobrar duas vezes por isso seria cobrar pelo nosso
 * detalhe de implementação. Então o "www." não conta.
 */
export function chaveDeCobranca(dominio: string): string {
  return dominio.replace(/^www\./, "");
}

export type Cota = {
  usados: number;
  /** O que o plano dá de graça. */
  incluidos: number;
  /** Extras cobrados na assinatura. */
  pagos: number;
  /** Extras liberados por você, sem cobrança. */
  cortesia: number;
  limite: number;
  livre: number;
  plano: string;
};

type OrgRow = { plano: string; sites_extras_pagos: number; sites_extras_cortesia: number };

/*
 * Retrato da cota agora.
 *
 * O plano considerado é o VIGENTE (já descontando assinatura suspensa), não o
 * contratado: quem está suspenso não deve poder conectar mais sites.
 */
export async function cotaDeHospedagem(orgId: string): Promise<Cota> {
  const admin = createAdminClient();

  const [{ data: orgRaw }, { data: domRaw }] = await Promise.all([
    admin
      .from("organizacoes")
      .select("plano, sites_extras_pagos, sites_extras_cortesia")
      .eq("id", orgId)
      .maybeSingle(),
    admin.from("dominios").select("dominio").eq("org_id", orgId),
  ]);

  const org = (orgRaw as OrgRow | null) ?? {
    plano: "free",
    sites_extras_pagos: 0,
    sites_extras_cortesia: 0,
  };
  const dominios = (domRaw as { dominio: string }[] | null) ?? [];

  const plano = await planoVigente(orgId, org.plano);
  const usados = new Set(dominios.map((d) => chaveDeCobranca(d.dominio))).size;
  const incluidos = sitesDoPlano(plano);
  const pagos = org.sites_extras_pagos ?? 0;
  const cortesia = org.sites_extras_cortesia ?? 0;
  const limite = incluidos + pagos + cortesia;

  return { usados, incluidos, pagos, cortesia, limite, livre: Math.max(0, limite - usados), plano };
}

export type ResultadoExtra = { ok: true } | { ok: false; motivo: string };

/*
 * Contrata mais um site extra na assinatura do cliente.
 *
 * A quantidade enviada à Stripe é ABSOLUTA ("passe a ter N extras"), nunca
 * relativa ("some 1"). É o que torna a operação segura de repetir: se a
 * gravação no nosso banco falhar depois de a Stripe aceitar, a próxima
 * tentativa manda o mesmo N — e mandar o mesmo N duas vezes não cobra duas
 * vezes, porque para a Stripe nada mudou.
 */
export async function contratarSiteExtra(orgId: string): Promise<ResultadoExtra> {
  const admin = createAdminClient();

  const { data: assRaw } = await admin
    .from("assinaturas")
    .select("stripe_subscription_id")
    .eq("org_id", orgId)
    .maybeSingle();
  const assinatura = assRaw as { stripe_subscription_id: string | null } | null;

  if (!assinatura?.stripe_subscription_id) {
    return {
      ok: false,
      motivo:
        "Sites extras são cobrados na sua assinatura do cartão, e não encontramos uma assinatura ativa. Assine primeiro em Assinatura, ou fale com o suporte.",
    };
  }

  const { data: orgRaw } = await admin
    .from("organizacoes")
    .select("sites_extras_pagos")
    .eq("id", orgId)
    .maybeSingle();
  const alvo = ((orgRaw as { sites_extras_pagos: number } | null)?.sites_extras_pagos ?? 0) + 1;

  const r = await ajustarSitesExtras(assinatura.stripe_subscription_id, alvo);
  if (!r.ok) return r;

  const { error } = await admin
    .from("organizacoes")
    .update({ sites_extras_pagos: alvo })
    .eq("id", orgId);
  if (error) return { ok: false, motivo: error.message };

  return { ok: true };
}

/*
 * Devolve extras que o cliente não usa mais.
 *
 * Roda quando um domínio é desconectado. Sem isto o cliente continuaria
 * pagando por um site que tirou do ar — o tipo de cobrança que ele descobre
 * três meses depois e vira pedido de estorno, e com razão.
 *
 * Cortesia nunca é devolvida: ela não custa nada a ele e é acordo seu.
 */
export async function devolverExtrasNaoUsados(orgId: string): Promise<void> {
  try {
    const cota = await cotaDeHospedagem(orgId);
    const necessarios = Math.max(0, cota.usados - cota.incluidos - cota.cortesia);
    if (necessarios >= cota.pagos) return;

    const admin = createAdminClient();
    const { data } = await admin
      .from("assinaturas")
      .select("stripe_subscription_id")
      .eq("org_id", orgId)
      .maybeSingle();
    const subId = (data as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id;
    if (!subId) return;

    const r = await ajustarSitesExtras(subId, necessarios);
    if (!r.ok) throw new Error(r.motivo);

    await admin.from("organizacoes").update({ sites_extras_pagos: necessarios }).eq("id", orgId);
  } catch (e) {
    // Não pode impedir a remoção do domínio: o cliente pediu para tirar do ar
    // e isso tem que acontecer. Fica no log para acerto manual.
    console.error("[cota] falha ao devolver sites extras:", (e as Error).message);
  }
}
