/*
 * Métricas das SUAS páginas de venda (/ e /prospector).
 *
 * A ideia aqui é não construir nada novo: o sistema de métricas dos sites de
 * cliente já mede visita, origem, clique em botão, tempo, rolagem e mapa de
 * calor de saída — e a tela que mostra isso já existe. O que faltava era
 * dizer QUEM são as landings, já que elas não são sites de cliente e não têm
 * linha em sites_ia nem em sites.
 *
 * A resposta é este par de identificadores fixos. Eles ocupam as colunas
 * org_id/site_id de analytics_eventos como qualquer outro site, e por isso a
 * agregação e a tela funcionam sem nenhuma adaptação.
 *
 * Não são segredo — vão no fonte da landing, como a chave anônima. O que
 * protege é a política do banco: com este par só se pode INSERIR evento, e
 * ler exige o service role (ou seja, o Admin).
 */

export const ORG_VENDAS = "00000000-0000-4000-8000-000000000001";

export const PAGINA_VENDAS = {
  principal: "00000000-0000-4000-8000-000000000010",
  prospector: "00000000-0000-4000-8000-000000000011",
} as const;

export type QualLanding = keyof typeof PAGINA_VENDAS;

export const NOME_LANDING: Record<string, { nome: string; caminho: string }> = {
  [PAGINA_VENDAS.principal]: { nome: "Landing PáginaPro", caminho: "/" },
  [PAGINA_VENDAS.prospector]: { nome: "Landing Prospector", caminho: "/prospector" },
};

/* É uma das nossas landings? Usado para liberar o beacon e a leitura. */
export function ehPaginaDeVendas(siteId: string, orgId?: string): boolean {
  if (orgId && orgId !== ORG_VENDAS) return false;
  return Object.values(PAGINA_VENDAS).some((id) => id === siteId);
}
