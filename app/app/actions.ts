"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "@/lib/painel/admin";
import { criarSiteComHome } from "@/lib/painel/sites";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type NovoSiteState = { error?: string } | undefined;

export async function criarSite(_prev: NovoSiteState, formData: FormData): Promise<NovoSiteState> {
  // Construtor por blocos é ferramenta interna; o cliente cria páginas na IA.
  if (!(await ehAdmin())) return { error: "Recurso indisponível." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Sessão expirada. Faça login novamente." };

  const nome = String(formData.get("nome") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const res = await criarSiteComHome(org.id, nome, slug);
  if (res.error) return { error: res.error };

  revalidatePath("/app");
  redirect(`/app/sites/${res.siteId}`);
}
