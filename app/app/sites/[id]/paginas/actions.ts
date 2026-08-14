"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ehAdmin } from "@/lib/painel/admin";
import { slugify } from "@/lib/format";
import { semearBlocos } from "@/lib/painel/seed";
import type { Tema } from "@/lib/types";

// Todas as ações daqui são do construtor por blocos — ferramenta interna.
// A tela já não existe para o cliente; a ação se defende sozinha porque server
// action é endereço público.

export type PaginaState = { error?: string } | undefined;

export async function criarPagina(_prev: PaginaState, formData: FormData): Promise<PaginaState> {
  if (!(await ehAdmin())) return { error: "Recurso indisponível." };
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

// Cores/fontes só desta página. null = volta a herdar do site.
export async function salvarTemaPagina(
  paginaId: string,
  siteAdminId: string,
  tema: Tema | null,
) {
  if (!(await ehAdmin())) return { error: "Recurso indisponível." };
  const supabase = await createClient();
  const { data: pagina } = await supabase
    .from("paginas")
    .select("slug, sites(slug)")
    .eq("id", paginaId)
    .maybeSingle();
  const { error } = await supabase.from("paginas").update({ tema }).eq("id", paginaId);
  if (error) return { error: error.message };

  const ctx = pagina as { slug: string; sites: { slug: string } } | null;
  if (ctx) {
    revalidatePath(`/s/${ctx.sites.slug}`);
    if (ctx.slug) revalidatePath(`/s/${ctx.sites.slug}/${ctx.slug}`);
  }
  revalidatePath(`/app/sites/${siteAdminId}/paginas/${paginaId}/editor`);
  return { ok: true };
}

// Duplica a página com todos os blocos (config, ordem e visibilidade).
// A cópia nasce como rascunho, para você revisar antes de publicar.
export async function duplicarPagina(paginaId: string, siteId: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  const { data: orig } = await supabase
    .from("paginas")
    .select("org_id, titulo, slug, descricao_seo, og_image_url")
    .eq("id", paginaId)
    .maybeSingle();
  if (!orig) return;
  const o = orig as {
    org_id: string;
    titulo: string;
    slug: string;
    descricao_seo: string | null;
    og_image_url: string | null;
  };

  // Slug livre: "sobre" → "sobre-copia", "sobre-copia-2"… (a home tem slug "")
  const base = slugify(`${o.slug || o.titulo} copia`) || "pagina-copia";
  const { data: existentes } = await supabase.from("paginas").select("slug").eq("site_id", siteId);
  const usados = new Set(((existentes as { slug: string }[] | null) ?? []).map((p) => p.slug));
  let slug = base;
  for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;

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
    .insert({
      org_id: o.org_id,
      site_id: siteId,
      slug,
      titulo: `${o.titulo} (cópia)`,
      descricao_seo: o.descricao_seo,
      og_image_url: o.og_image_url,
      ordem,
      publicado: false,
    })
    .select("id")
    .single();
  if (error || !nova) return;
  const novaId = (nova as { id: string }).id;

  const { data: blocos } = await supabase
    .from("blocos")
    .select("tipo, config, ordem, oculto")
    .eq("pagina_id", paginaId)
    .order("ordem", { ascending: true });

  const rows = ((blocos as { tipo: string; config: unknown; ordem: number; oculto: boolean }[] | null) ?? []).map(
    (b) => ({ org_id: o.org_id, pagina_id: novaId, tipo: b.tipo, config: b.config, ordem: b.ordem, oculto: b.oculto }),
  );
  if (rows.length > 0) await supabase.from("blocos").insert(rows);

  revalidatePath(`/app/sites/${siteId}`);
  redirect(`/app/sites/${siteId}/paginas/${novaId}/editor`);
}

export async function excluirPagina(paginaId: string, siteId: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  // não deixa excluir a home (slug '')
  const { data } = await supabase.from("paginas").select("slug").eq("id", paginaId).maybeSingle();
  if ((data as { slug: string } | null)?.slug === "") return;
  await supabase.from("paginas").delete().eq("id", paginaId);
  revalidatePath(`/app/sites/${siteId}`);
}
