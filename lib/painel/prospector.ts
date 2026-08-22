import "server-only";

import { ehAdmin } from "./admin";
import { getMinhaOrg } from "./queries";
import { planoVigente } from "./permissoes";

/*
 * "Estou dentro do Prospector?" — a pergunta que muda a CARA do painel.
 *
 * Para quem assina só a prospecção, o painel é OUTRO produto: identidade da
 * landing (claro, cores do Google), menu enxuto, nada de crédito de IA nem
 * criador de páginas. Mesmo código, outra roupa — e esta função é o
 * interruptor único; espalhar `plano === "prospector"` pelas telas é como se
 * perde o controle do que aparece para quem.
 *
 * O admin nunca entra no modo: ele precisa ver o produto completo.
 */
export async function modoProspector(): Promise<boolean> {
  if (await ehAdmin()) return false;
  const org = await getMinhaOrg();
  if (!org) return false;
  return (await planoVigente(org.id, org.plano)) === "prospector";
}
