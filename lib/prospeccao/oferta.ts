import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * O que esta organização VENDE quando aborda um lead.
 *
 * 'site' é o produto original — a demonstração criada pela IA — e continua o
 * padrão de todo mundo. 'propria' é o modo Prospector: corretor de seguros,
 * vendedor de plano de saúde, representante — a máquina de prospecção é a
 * mesma, só muda o que a mensagem oferece.
 *
 * Centralizado aqui porque QUATRO lugares precisam da mesma resposta (o
 * escritor de mensagens, o classificador, o Fechador e o painel) — e se cada
 * um lesse a config do seu jeito, um dia um deles venderia a coisa errada.
 */

export type Oferta = {
  tipo: "site" | "propria";
  // Descrição curta do que se vende ("consórcio de imóveis"). Vazio no modo
  // site — lá o produto é fixo.
  resumo: string;
};

export const OFERTA_PADRAO: Oferta = { tipo: "site", resumo: "" };

export async function ofertaDaOrg(orgId: string): Promise<Oferta> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("prospeccao_config")
    .select("oferta_tipo, oferta_resumo")
    .eq("org_id", orgId)
    .maybeSingle();
  const cfg = data as { oferta_tipo: string | null; oferta_resumo: string | null } | null;
  // Coluna ainda não migrada ou config inexistente: modo site, como sempre foi.
  if (cfg?.oferta_tipo !== "propria") return OFERTA_PADRAO;
  return { tipo: "propria", resumo: (cfg.oferta_resumo ?? "").trim() };
}
