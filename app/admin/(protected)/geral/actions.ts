"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function saveConfigEvento(
  _prevState: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const supabase = await createClient();

  const id = str(formData, "id");
  const dataEvento = str(formData, "data_evento");
  const precoIngresso = str(formData, "preco_ingresso");

  const payload = {
    titulo_hero: str(formData, "titulo_hero") ?? "FESTA DAS NAÇÕES",
    subtitulo_hero: str(formData, "subtitulo_hero") ?? "",
    video_hero_url: str(formData, "video_hero_url"),
    texto_sobre: str(formData, "texto_sobre") ?? "",
    // datetime-local has no timezone; treat it as America/Sao_Paulo (fixed UTC-3).
    data_evento: dataEvento ? new Date(`${dataEvento}:00-03:00`).toISOString() : undefined,
    preco_ingresso: precoIngresso ? Number(precoIngresso) : undefined,
    link_compra: str(formData, "link_compra"),
    endereco: str(formData, "endereco") ?? "",
    telefone: str(formData, "telefone"),
    email: str(formData, "email"),
    instagram_url: str(formData, "instagram_url"),
    facebook_url: str(formData, "facebook_url"),
    site_url: str(formData, "site_url"),
    whatsapp_numero: str(formData, "whatsapp_numero"),
    botao_lineup_texto: str(formData, "botao_lineup_texto") ?? "Ver line-up",
    botao_lineup_visivel: formData.get("botao_lineup_visivel") === "on",
  };

  const { error } = id
    ? await supabase.from("config_evento").update(payload).eq("id", id)
    : await supabase.from("config_evento").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
