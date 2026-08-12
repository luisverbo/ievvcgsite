import "server-only";

import { getMinhaOrg } from "./queries";
import { ehAdmin } from "./admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";

/*
 * Quem pode usar o quê.
 *
 * Toda a regra de plano mora aqui. Mudar preço ou pacote é mexer nesta tabela
 * e mais nada — espalhar `if (plano === 'pro')` pelas telas é como se perde o
 * controle de quem tem direito a quê.
 *
 * Ferramenta interna (ebook, painel de admin) NÃO entra aqui: ela não é do
 * produto, é sua. Continua atrás do ehAdmin().
 */

export type Recurso =
  // Construtor de páginas com IA. O freio é o crédito, não o plano — é ele que
  // faz a compra de crédito acontecer.
  | "construtor"
  // Prospecção no Google + WhatsApp. Exige o agente instalado na máquina do
  // cliente, então é só do plano completo.
  | "prospeccao"
  // Hospedar com domínio próprio.
  | "hospedagem";

/*
 * `cota` é o crédito de IA que entra todo mês, em microdólares.
 *
 * Referência para calibrar: uma página cheia custa ~US$1,06 no Fable 5 e
 * ~US$0,51 no Opus 5. US$15 no plano Agência dá umas 14 páginas por mês antes
 * de o cliente precisar comprar crédito — e é o que sobra de margem nos R$300.
 */
export const PLANOS: Record<string, { rotulo: string; recursos: Recurso[]; cota: number }> = {
  free: { rotulo: "Grátis", recursos: ["construtor"], cota: 1_000_000 },
  pro: { rotulo: "Pro", recursos: ["construtor", "hospedagem"], cota: 5_000_000 },
  agencia: {
    rotulo: "Agência",
    recursos: ["construtor", "prospeccao", "hospedagem"],
    cota: 15_000_000,
  },
};

export function cotaDoPlano(plano: string | null | undefined): number {
  return PLANOS[plano ?? "free"]?.cota ?? 0;
}

export function planoLibera(plano: string | null | undefined, recurso: Recurso): boolean {
  return PLANOS[plano ?? "free"]?.recursos.includes(recurso) ?? false;
}

/*
 * Checagem do usuário logado. O dono do sistema passa em tudo — sem isso você
 * teria que se colocar num plano para usar o próprio produto.
 *
 * Assinatura suspensa cai para o plano grátis. Não é o mesmo que perder a
 * conta: o painel abre, os dados continuam lá e voltar é pagar. Durante a
 * tolerância de 7 dias nada muda — quem está atrasado continua com tudo.
 */
export async function podeUsar(recurso: Recurso): Promise<boolean> {
  if (await ehAdmin()) return true;
  const org = await getMinhaOrg();
  if (!org) return false;
  return planoLibera(await planoVigente(org.id, org.plano), recurso);
}

/*
 * O plano que vale AGORA, já considerando a assinatura.
 *
 * O campo `plano` da organização diz o que foi contratado; a assinatura diz se
 * está pago. Quem manda no acesso é o segundo.
 */
export async function planoVigente(orgId: string, planoContratado: string): Promise<string> {
  if (planoContratado === "free") return "free";

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("plano, pago_ate, status, falhou_em")
    .eq("org_id", orgId)
    .maybeSingle();

  const assinatura = data as AssinaturaRow | null;
  // Sem linha de assinatura = plano liberado na mão por você, no Admin.
  // Nesse caso o contratado vale — senão você não conseguiria dar cortesia.
  if (!assinatura) return planoContratado;

  return situacaoDaAssinatura(assinatura).liberado ? planoContratado : "free";
}
