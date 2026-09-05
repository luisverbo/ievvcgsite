import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_VENDAS, PAGINA_VENDAS, type QualLanding } from "@/lib/vendas-metricas";

/*
 * As etapas do funil que acontecem FORA da landing.
 *
 * O pixel e as métricas da página contam até o clique em "assinar". Depois
 * disso a pessoa passa por cadastro → onboarding → Stripe → volta, e cada
 * um desses degraus é um lugar onde ela some sem deixar rastro. Sem contar
 * isso, a gente troca uma copy boa achando que o problema é a página quando
 * o problema era o cadastro.
 *
 * Cada degrau entra como um "click" com rótulo "Funil · …" nos MESMOS
 * eventos da landing — assim aparece no relatório de métricas que já existe,
 * na lista de botões, sem tela nova. A leitura é direta: 300 visitas, 40
 * cliques no preço, 25 contas criadas, 18 chegaram ao pagamento, 9 compras.
 *
 * Nunca lança: é medição, e medição não pode derrubar o cadastro nem o
 * webhook que ela mede.
 */

export type EtapaFunil = "Criou conta" | "Chegou ao pagamento" | "Começou o teste" | "Comprou";

export async function registrarFunil(
  qual: QualLanding,
  etapa: EtapaFunil,
  path: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("analytics_eventos").insert({
      org_id: ORG_VENDAS,
      site_id: PAGINA_VENDAS[qual],
      tipo: "click",
      rotulo: `Funil · ${etapa}`,
      path,
      origem: "Servidor",
    });
  } catch {
    // Medição não derruba nada.
  }
}

/* De qual landing é este plano — o Prospector tem funil próprio. */
export function landingDoPlano(plano: string | null | undefined): QualLanding {
  return plano === "prospector" || plano === "teste" ? "prospector" : "principal";
}
