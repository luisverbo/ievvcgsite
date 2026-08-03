"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { semearBlocosComConfig } from "@/lib/painel/seed";
import { LANDING_PAGINAS, LANDING_TEMA } from "@/lib/templates/paginapro-landing";
import { salvarAnthropicKey } from "@/lib/ia/anthropic";

// Só o email definido em ADMIN_EMAIL pode usar as ações de dono do sistema.
export async function ehAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() === adminEmail;
}

export async function alterarPlano(orgId: string, novoPlano: "free" | "pro") {
  if (!(await ehAdmin())) return;
  const admin = createAdminClient();
  await admin.from("organizacoes").update({ plano: novoPlano }).eq("id", orgId);
  revalidatePath("/app/admin");
}

/* ---------------------------- chave da Anthropic --------------------------- */
export type ChaveIAState = { ok?: boolean; error?: string } | undefined;

export async function salvarChaveAnthropic(
  _prev: ChaveIAState,
  formData: FormData,
): Promise<ChaveIAState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const valor = String(formData.get("anthropic_key") ?? "").trim();
  if (!valor.startsWith("sk-ant-")) return { error: "A chave da Anthropic começa com sk-ant-." };
  await salvarAnthropicKey(valor);
  revalidatePath("/app/admin");
  return { ok: true };
}

export type LandingState = { error?: string } | undefined;

// Cria o site de marketing do próprio PáginaPro na conta do dono, com as 3
// páginas prontas (principal, teste grátis e oferta do Básico) — tudo
// editável depois no editor visual, como qualquer site.
export async function criarLandingPaginaPro(): Promise<LandingState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const supabase = await createClient();
  const { data: novoSite, error } = await supabase
    .from("sites")
    .insert({
      org_id: org.id,
      nome: "PáginaPro",
      slug: "paginapro",
      tema: LANDING_TEMA,
      publicado: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um site com o endereço 'paginapro'. Exclua-o antes de recriar." };
    }
    return { error: error.message };
  }
  const siteId = (novoSite as { id: string }).id;

  for (const [i, pagina] of LANDING_PAGINAS.entries()) {
    const { data: nova } = await supabase
      .from("paginas")
      .insert({
        org_id: org.id,
        site_id: siteId,
        slug: pagina.slug,
        titulo: pagina.titulo,
        ordem: i + 1,
        publicado: true,
      })
      .select("id")
      .single();
    if (nova) {
      await semearBlocosComConfig((nova as { id: string }).id, org.id, pagina.blocos);
    }
  }

  revalidatePath("/app");
  redirect(`/app/sites/${siteId}`);
}
