"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { defaultConfig } from "@/lib/blocks/registry";

export type BlocoState = { ok?: boolean; error?: string } | undefined;
export type BlocoLite = { id: string; tipo: string; config: Record<string, unknown>; oculto: boolean };

async function listar(paginaId: string): Promise<BlocoLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocos")
    .select("id, tipo, config, oculto")
    .eq("pagina_id", paginaId)
    .order("ordem", { ascending: true });
  return (data as BlocoLite[] | null) ?? [];
}

// Confere se a página pertence a um site da org do usuário e devolve os ids
// necessários. A RLS já bloqueia, mas validamos para revalidar o path certo.
async function contexto(paginaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("paginas")
    .select("id, org_id, site_id, slug, sites(slug)")
    .eq("id", paginaId)
    .maybeSingle();
  return data as
    | { id: string; org_id: string; site_id: string; slug: string; sites: { slug: string } }
    | null;
}

async function revalida(
  ctx: { id: string; slug: string; sites: { slug: string } },
  siteAdminId: string,
) {
  const siteSlug = ctx.sites.slug;
  revalidatePath(`/s/${siteSlug}`);
  if (ctx.slug) revalidatePath(`/s/${siteSlug}/${ctx.slug}`);
  revalidatePath(`/app/sites/${siteAdminId}/paginas/${ctx.id}/editor`);
}

export async function adicionarBloco(
  paginaId: string,
  siteAdminId: string,
  tipo: string,
): Promise<BlocoLite[]> {
  const ctx = await contexto(paginaId);
  if (!ctx) return [];
  const supabase = await createClient();
  const { data: max } = await supabase
    .from("blocos")
    .select("ordem")
    .eq("pagina_id", paginaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = ((max as { ordem: number } | null)?.ordem ?? 0) + 1;

  await supabase.from("blocos").insert({
    org_id: ctx.org_id,
    pagina_id: paginaId,
    tipo,
    config: defaultConfig(tipo),
    ordem,
  });
  await revalida({ ...ctx }, siteAdminId);
  return listar(paginaId);
}

export async function salvarBloco(
  blocoId: string,
  paginaId: string,
  siteAdminId: string,
  config: Record<string, unknown>,
): Promise<BlocoState> {
  const ctx = await contexto(paginaId);
  if (!ctx) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase.from("blocos").update({ config }).eq("id", blocoId);
  if (error) return { error: error.message };
  await revalida({ ...ctx }, siteAdminId);
  return { ok: true };
}

export async function excluirBloco(
  blocoId: string,
  paginaId: string,
  siteAdminId: string,
): Promise<BlocoLite[]> {
  const ctx = await contexto(paginaId);
  if (!ctx) return [];
  const supabase = await createClient();
  await supabase.from("blocos").delete().eq("id", blocoId);
  await revalida({ ...ctx }, siteAdminId);
  return listar(paginaId);
}

export async function duplicarBloco(
  blocoId: string,
  paginaId: string,
  siteAdminId: string,
): Promise<BlocoLite[]> {
  const ctx = await contexto(paginaId);
  if (!ctx) return [];
  const supabase = await createClient();
  const { data: orig } = await supabase.from("blocos").select("tipo, config, ordem").eq("id", blocoId).maybeSingle();
  if (!orig) return listar(paginaId);
  const o = orig as { tipo: string; config: Record<string, unknown>; ordem: number };
  // desloca os posteriores e insere logo após
  const { data: posteriores } = await supabase
    .from("blocos")
    .select("id, ordem")
    .eq("pagina_id", paginaId)
    .gt("ordem", o.ordem)
    .order("ordem", { ascending: true });
  for (const b of (posteriores as { id: string; ordem: number }[] | null) ?? []) {
    await supabase.from("blocos").update({ ordem: b.ordem + 1 }).eq("id", b.id);
  }
  await supabase.from("blocos").insert({
    org_id: ctx.org_id,
    pagina_id: paginaId,
    tipo: o.tipo,
    config: o.config,
    ordem: o.ordem + 1,
  });
  await revalida({ ...ctx }, siteAdminId);
  return listar(paginaId);
}

export async function alternarOculto(
  blocoId: string,
  oculto: boolean,
  paginaId: string,
  siteAdminId: string,
): Promise<BlocoLite[]> {
  const ctx = await contexto(paginaId);
  if (!ctx) return [];
  const supabase = await createClient();
  await supabase.from("blocos").update({ oculto }).eq("id", blocoId);
  await revalida({ ...ctx }, siteAdminId);
  return listar(paginaId);
}

export async function reordenarBlocos(
  paginaId: string,
  siteAdminId: string,
  idsOrdenados: string[],
) {
  const ctx = await contexto(paginaId);
  if (!ctx) return;
  const supabase = await createClient();
  await Promise.all(
    idsOrdenados.map((id, i) => supabase.from("blocos").update({ ordem: i + 1 }).eq("id", id)),
  );
  await revalida({ ...ctx }, siteAdminId);
}

export async function publicarPagina(paginaId: string, siteId: string, siteAdminId: string, publicar: boolean) {
  const ctx = await contexto(paginaId);
  if (!ctx) return;
  const supabase = await createClient();
  await supabase.from("paginas").update({ publicado: publicar }).eq("id", paginaId);
  if (publicar) await supabase.from("sites").update({ publicado: true }).eq("id", siteId);
  await revalida({ ...ctx }, siteAdminId);
}
