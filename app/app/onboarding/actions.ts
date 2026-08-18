"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

export type OnboardingState = { error?: string } | undefined;

/*
 * Cria a organização do usuário recém-cadastrado e o leva ao painel.
 *
 * A RPC criar_organizacao_com_site vem do produto antigo e cria também um
 * site por blocos — que o cliente nunca vê (o construtor por blocos é
 * ferramenta interna). Continuamos usando a RPC porque é ela que garante, num
 * passo só e com as permissões certas, organização + vínculo de membro; os
 * dados do site são derivados do nome, com sufixo para nunca colidir.
 */
export async function criarOrganizacao(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const nomeOrg = String(formData.get("nome_org") ?? "").trim();
  if (!nomeOrg) return { error: "Informe o nome da sua empresa ou projeto." };
  if (nomeOrg.length < 2) return { error: "O nome precisa ter pelo menos 2 caracteres." };

  const base = slugify(nomeOrg) || "espaco";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const supabase = await createClient();
  const { error } = await supabase.rpc("criar_organizacao_com_site", {
    nome_org: nomeOrg,
    nome_site: nomeOrg,
    slug_site: slug,
  });

  if (error) {
    // Colisão de slug é loteria perdida duas vezes — pedir para tentar de
    // novo resolve sem expor o detalhe técnico.
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { error: "Algo colidiu ao criar seu espaço. Tente de novo." };
    }
    return { error: error.message };
  }

  /*
   * Quem chegou aqui vindo do preço da landing tem `de=/assinar/<plano>`:
   * agora que a organização existe, ele volta direto para o pagamento. Só
   * caminhos internos passam — o campo vem do formulário.
   */
  const bruto = formData.get("de");
  const de = typeof bruto === "string" && bruto.startsWith("/assinar") ? bruto : "/app";
  redirect(de);
}
