import "server-only";

import { getMinhaOrg } from "./queries";
import { ehAdmin } from "./admin";

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
 */
export async function podeUsar(recurso: Recurso): Promise<boolean> {
  if (await ehAdmin()) return true;
  const org = await getMinhaOrg();
  return planoLibera(org?.plano, recurso);
}
