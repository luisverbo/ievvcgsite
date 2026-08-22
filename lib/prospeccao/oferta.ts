import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { orgPodeUsar } from "@/lib/painel/permissoes";

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
  const resumo = (cfg?.oferta_resumo ?? "").trim();

  /*
   * Quem não pode criar site não pode OFERECER site — nunca.
   *
   * O padrão histórico da config é 'site', e um cliente do plano Prospector
   * que nunca abrisse o card 🎯 sairia mandando o modelo que promete "uma
   * demonstração já criada"… que não existe no plano dele. A promessa falsa
   * seria feita em nome dele, no WhatsApp dele. Então o plano manda: sem
   * construtor, a oferta é sempre a própria, e as telas cobram o resumo.
   */
  if (!(await orgPodeUsar(orgId, "construtor"))) return { tipo: "propria", resumo };

  // Coluna ainda não migrada ou config inexistente: modo site, como sempre foi.
  if (cfg?.oferta_tipo !== "propria") return OFERTA_PADRAO;
  return { tipo: "propria", resumo };
}
