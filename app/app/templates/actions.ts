"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATES_POR_ID } from "@/lib/templates/catalog";
import { slugify } from "@/lib/format";

export async function usarTemplate(formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const siteId = String(formData.get("site_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim() || "Página sem título";
  const slugBruto = String(formData.get("slug") ?? "").trim();

  const template = TEMPLATES_POR_ID.get(templateId);
  if (!template || !siteId) return;

  const slug = slugify(slugBruto || titulo);

  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select("org_id, tema")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return;
  const orgId = (site as { org_id: string }).org_id;
  const temaAtual = (site as { tema: Record<string, unknown> | null }).tema;

  const { data: max } = await supabase
    .from("paginas")
    .select("ordem")
    .eq("site_id", siteId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordemPagina = ((max as { ordem: number } | null)?.ordem ?? 0) + 1;

  const { data: nova, error } = await supabase
    .from("paginas")
    .insert({ org_id: orgId, site_id: siteId, slug, titulo, ordem: ordemPagina })
    .select("id")
    .single();

  if (error || !nova) return;
  const paginaId = (nova as { id: string }).id;

  const rows = template.blocos.map((b, i) => ({
    org_id: orgId,
    pagina_id: paginaId,
    tipo: b.tipo,
    config: b.config,
    ordem: i + 1,
  }));
  await supabase.from("blocos").insert(rows);

  // Aplica a identidade visual do template só se o site ainda não tem tema
  // próprio (para não sobrescrever a personalização de quem já mexeu).
  const semTema = !temaAtual || Object.keys(temaAtual).length === 0;
  if (template.tema && semTema) {
    await supabase.from("sites").update({ tema: template.tema }).eq("id", siteId);
  }

  revalidatePath(`/app/sites/${siteId}`);
  redirect(`/app/sites/${siteId}/paginas/${paginaId}/editor`);
}
