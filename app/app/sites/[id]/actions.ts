"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { PRESETS_TEMA } from "@/lib/theme";
import type { Tema } from "@/lib/types";

export type SaveState = { ok?: boolean; error?: string } | undefined;

export async function salvarSite(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? ""));
  if (!id) return { error: "Site inválido." };
  if (!nome) return { error: "Informe o nome do site." };
  if (slug.length < 3) return { error: "O endereço precisa ter pelo menos 3 caracteres." };

  // Tema: preset escolhido vira o jsonb do site (Fase 1 adiciona ajuste fino).
  const presetKey = String(formData.get("tema_preset") ?? "");
  let tema: Tema | undefined;
  if (presetKey && PRESETS_TEMA[presetKey]) {
    tema = presetKey === "padrao" ? {} : { cores: PRESETS_TEMA[presetKey].cores };
  }

  const whatsapp = String(formData.get("whatsapp_numero") ?? "").trim() || null;
  const pixel = String(formData.get("facebook_pixel_id") ?? "").replace(/\D/g, "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({
      nome,
      slug,
      publicado: formData.get("publicado") === "on",
      whatsapp_numero: whatsapp,
      facebook_pixel_id: pixel,
      ...(tema !== undefined ? { tema } : {}),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Esse endereço já está em uso." };
    return { error: error.message };
  }

  revalidatePath(`/app/sites/${id}`);
  revalidatePath(`/s/${slug}`);
  return { ok: true };
}

// Exclui o site inteiro (páginas, blocos, leads e métricas caem em cascata
// pelas foreign keys "on delete cascade"). Confirmação é feita no cliente.
export async function excluirSite(id: string) {
  const supabase = await createClient();
  const { data: site } = await supabase.from("sites").select("slug").eq("id", id).maybeSingle();
  await supabase.from("sites").delete().eq("id", id);
  revalidatePath("/app");
  if (site) revalidatePath(`/s/${(site as { slug: string }).slug}`);
  redirect("/app");
}
