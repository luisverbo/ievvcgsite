import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  MODELO_APRESENTACAO,
  MODELO_APRESENTACAO_PROPRIA,
  montarMensagem,
  type DadosEmpresa,
} from "./mensagem";
import { ofertaDaOrg } from "./oferta";
import type { ProspectoRow } from "./tipos";

/*
 * O segundo passo do modo gancho: a APRESENTAÇÃO.
 *
 * O gancho ("oi, falo com alguém da Padaria X?") saiu pela fila normal. O
 * lead respondeu qualquer coisa, a escuta do agente trouxe a resposta, e
 * este módulo coloca a apresentação na fila — no mesmo modo (auto/semi) do
 * gancho, com o mesmo ritmo humano do agente. Quem decide o QUANDO é o
 * agente; aqui é só o QUE.
 *
 * Uma por prospecto, para sempre (índice parcial no banco): responder ao
 * gancho três vezes não gera três apresentações.
 */

type ConfigApresentacao = {
  remetente_nome: string | null;
  apresentacao_msg_modelo: string | null;
};

// Regra de ouro do modo gancho, para quem lê a fila: a apresentação não
// conta como contato novo no limite diário. É continuação.
export const TIPO_APRESENTACAO = "apresentacao";

export async function enfileirarApresentacao(
  orgId: string,
  prospectoId: string,
  telefone: string,
  modo: "auto" | "semi",
): Promise<boolean> {
  try {
    const admin = createAdminClient();

    // select * de propósito: pedir apresentacao_msg_modelo pelo nome falharia
    // inteiro em quem ainda não rodou a migração — e aí nem o padrão sairia.
    const [{ data: cfgRaw }, { data: pRaw }, oferta] = await Promise.all([
      admin.from("prospeccao_config").select("*").eq("org_id", orgId).maybeSingle(),
      admin.from("prospeccao").select("*").eq("id", prospectoId).eq("org_id", orgId).maybeSingle(),
      ofertaDaOrg(orgId),
    ]);
    const cfg = (cfgRaw ?? {}) as Partial<ConfigApresentacao>;
    const p = pRaw as ProspectoRow | null;
    // Opt-out é trava de servidor: mesmo que a tela erre, esta linha não.
    if (!p || p.nao_perturbar) return false;

    const padrao = oferta.tipo === "propria" ? MODELO_APRESENTACAO_PROPRIA : MODELO_APRESENTACAO;
    const modelo = cfg.apresentacao_msg_modelo?.trim() || padrao;
    const remetente = (cfg.remetente_nome ?? "").trim();
    const extras = { oferta: oferta.resumo || "o meu trabalho" };

    const { error } = await admin.from("prospeccao_mensagens").insert({
      org_id: orgId,
      prospecto_id: p.id,
      telefone,
      // Chave própria ("ap::"): a apresentação não repete as escolhas de
      // [a|b] do gancho — duas mensagens seguidas com o mesmo sorteio soam
      // como texto de máquina.
      texto: montarMensagem(modelo, p as DadosEmpresa, `ap::${p.id}`, remetente, extras),
      tipo: TIPO_APRESENTACAO,
      modo,
      status: "pendente",
    });
    // 23505 = já existe uma apresentação para este lead. Exatamente o que o
    // índice existe para fazer; não é erro.
    if (error && error.code !== "23505") {
      console.error("[gancho] apresentação não enfileirada:", error.message);
      return false;
    }
    return !error;
  } catch (e) {
    console.error("[gancho]", (e as Error).message);
    return false;
  }
}
