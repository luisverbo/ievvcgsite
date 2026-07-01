"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TEXTOS_PADRAO } from "@/lib/textos";
import { FALLBACK_CONFIG } from "@/lib/fallback-data";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function colStr(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
  return trimmed !== "" ? trimmed : fallback;
}

export async function saveTextos(_prevState: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await createClient();
  const id = formData.get("id");

  // Só guarda o que difere do padrão, para textos não editados continuarem
  // acompanhando ajustes futuros nos valores padrão.
  const textos: Record<string, string> = {};
  for (const key of Object.keys(TEXTOS_PADRAO)) {
    const value = formData.get(key);
    if (typeof value === "string") {
      const trimmed = value.replace(/\r\n/g, "\n").trim();
      if (trimmed !== "" && trimmed !== TEXTOS_PADRAO[key]) textos[key] = trimmed;
    }
  }

  // Campos "_" são colunas reais (parágrafo do Sobre e endereço).
  const payload = {
    textos,
    texto_sobre: colStr(formData, "_texto_sobre", FALLBACK_CONFIG.texto_sobre),
    endereco: colStr(formData, "_endereco", FALLBACK_CONFIG.endereco),
  };

  const { error } =
    typeof id === "string" && id !== ""
      ? await supabase.from("config_evento").update(payload).eq("id", id)
      : await supabase.from("config_evento").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/textos");
  return { ok: true };
}
