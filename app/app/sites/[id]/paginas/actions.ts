"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { semearBlocos } from "@/lib/painel/seed";

export type PaginaState = { error?: string } | undefined;

export async function criarPagina(_prev: PaginaState, formData: FormData): Promise<PaginaState> {
  const siteId = String(formData.get("site_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || titulo);
  if (!siteId || !titulo) return { error: "Informe o nome da página." };
  if (slug.length < 2) return { error: "O endereço da página é muito curto." };

  const supabase = await createClient();
  const { data: site } = await supabase.from("sites").select("org_id").eq("id", siteId).maybeSingle();
  if (!site) return { error: "Site não encontrado." };
  const orgId = (site as { org_id: string }).org_id;

  const { data: max } = await supabase
    .from("paginas")
    .select("ordem")
    .eq("site_id", siteId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = ((max as { ordem: number } | null)?.ordem ?? 0) + 1;

  const { data: nova, error } = await supabase
    .from("paginas")
    .insert({ org_id: orgId, site_id: siteId, slug, titulo, ordem })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Já existe uma página com esse endereço." };
    return { error: error.message };
  }

  const novaId = (nova as { id: string }).id;
  await semearBlocos(novaId, orgId, ["hero", "cta"]);
  revalidatePath(`/app/sites/${siteId}`);
  redirect(`/app/sites/${siteId}/paginas/${novaId}/editor`);
}

export async function excluirPagina(paginaId: string, siteId: string) {
  const supabase = await createClient();
  // não deixa excluir a home (slug '')
  const { data } = await supabase.from("paginas").select("slug").eq("id", paginaId).maybeSingle();
  if ((data as { slug: string } | null)?.slug === "") return;
  await supabase.from("paginas").delete().eq("id", paginaId);
  revalidatePath(`/app/sites/${siteId}`);
}
