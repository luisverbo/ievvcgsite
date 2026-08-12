"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import { gerarToken, hashDoToken } from "@/lib/agente/token";

/*
 * O token só aparece UMA vez, no momento em que é criado.
 *
 * Guardamos apenas o hash — nem nós conseguimos ler o token depois. Se o
 * cliente perder, gera outro; é mais seguro que ter o segredo guardado em
 * claro esperando um vazamento.
 */
export type TokenState = { token?: string; error?: string } | undefined;

export async function criarToken(_prev: TokenState, formData: FormData): Promise<TokenState> {
  if (!(await podeUsar("prospeccao"))) {
    return { error: "A prospecção faz parte do plano Agência." };
  }
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const nome = String(formData.get("nome") ?? "").trim().slice(0, 60) || "Meu computador";

  const admin = createAdminClient();
  const { count } = await admin
    .from("agentes")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);
  // Um por máquina é o uso normal; o teto evita token esquecido acumulando.
  if ((count ?? 0) >= 5) {
    return { error: "Você já tem 5 agentes. Apague um antes de criar outro." };
  }

  const token = gerarToken();
  const { error } = await admin.from("agentes").insert({
    org_id: org.id,
    nome,
    token_hash: hashDoToken(token),
    token_final: token.slice(-4),
  });
  if (error) return { error: error.message };

  revalidatePath("/app/prospeccao/agente");
  return { token };
}

export async function apagarAgente(id: string) {
  if (!(await podeUsar("prospeccao"))) return;
  const org = await getMinhaOrg();
  if (!org) return;
  const admin = createAdminClient();
  // O filtro por org é a garantia: apagar agente dos outros seria desligar o
  // sistema de um cliente pelo id.
  await admin.from("agentes").delete().eq("id", id).eq("org_id", org.id);
  revalidatePath("/app/prospeccao/agente");
}
