import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { situacaoDaAssinatura, type AssinaturaRow } from "@/lib/pagamentos/estado";

/*
 * O site hospedado deve responder agora?
 *
 * Roda em TODA visita a domínio de cliente, então mora sozinho aqui, sem
 * arrastar a SDK da Stripe nem a camada de permissões do painel para dentro
 * do caminho do visitante.
 *
 * A regra é deliberadamente conservadora: só derruba quando existe uma
 * assinatura e ela está suspensa ou cancelada.
 *
 * Por que não olhar o plano da organização: uma organização pode estar em
 * "free" e ter site no ar de propósito — cortesia sua, cliente antigo, o seu
 * próprio site de demonstração conectado pelo Admin. Nenhum desses deveria
 * cair. Já um cliente que assinou e parou de pagar SEMPRE tem linha em
 * `assinaturas`, com status. É essa linha que decide.
 *
 * Os 7 dias de tolerância vêm de graça: `situacaoDaAssinatura` mantém
 * `liberado: true` durante o prazo, e o painel avisa que ele está correndo.
 */
export async function hospedagemAtiva(orgId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("plano, pago_ate, status, falhou_em")
    .eq("org_id", orgId)
    .maybeSingle();

  const assinatura = data as AssinaturaRow | null;
  if (!assinatura) return true;

  return situacaoDaAssinatura(assinatura).liberado;
}
