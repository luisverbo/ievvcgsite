"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "@/lib/painel/admin";
import { criarSiteComHome } from "@/lib/painel/sites";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/*
 * Claro ↔ escuro do painel Prospector.
 *
 * A preferência mora num COOKIE, não no navegador via JavaScript: assim o
 * servidor já entrega a página na cor certa. Guardado no localStorage, a
 * página nasceria clara e piscaria para escura a cada carregamento — que é
 * justamente o flash que machuca quem escolheu o escuro.
 */
export async function alternarTema() {
  const jar = await cookies();
  const atual = jar.get("pp_tema")?.value === "escuro" ? "escuro" : "claro";
  jar.set("pp_tema", atual === "escuro" ? "claro" : "escuro", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/app", "layout");
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
