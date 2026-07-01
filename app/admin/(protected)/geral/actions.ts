"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CORES_PADRAO, FONTES_TITULO, FONTES_TEXTO, type CorKey } from "@/lib/theme";
import type { Tema, TemaCores } from "@/lib/types";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function buildTema(formData: FormData): Tema {
  const tema: Tema = {};

  if (formData.get("resetar_cores") !== "on") {
    const cores: TemaCores = {};
    for (const key of Object.keys(CORES_PADRAO) as CorKey[]) {
      const valor = str(formData, `cor_${key}`)?.toLowerCase();
      // Só grava o que difere do padrão, para o tema continuar acompanhando
      // ajustes futuros nas cores padrão do site.
      if (valor && /^#[0-9a-f]{6}$/.test(valor) && valor !== CORES_PADRAO[key]) {
        cores[key] = valor;
      }
    }
    if (Object.keys(cores).length > 0) tema.cores = cores;
  }

  const fonteTitulo = str(formData, "fonte_titulo");
  if (fonteTitulo && FONTES_TITULO[fonteTitulo]) tema.fonte_titulo = fonteTitulo;

  const fonteTexto = str(formData, "fonte_texto");
  if (fonteTexto && FONTES_TEXTO[fonteTexto]) tema.fonte_texto = fonteTexto;

  return tema;
}

export async function saveConfigEvento(
  _prevState: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const supabase = await createClient();

  const id = str(formData, "id");
  const dataEvento = str(formData, "data_evento");
  const precoIngresso = str(formData, "preco_ingresso");
  const logoUrl = formData.get("remover_logo") === "on" ? null : str(formData, "logo_url");

  const payload = {
    titulo_hero: str(formData, "titulo_hero") ?? "FESTA DAS NAÇÕES",
    subtitulo_hero: str(formData, "subtitulo_hero") ?? "",
    video_hero_url: str(formData, "video_hero_url"),
    // texto_sobre e endereco são editados na aba "Textos" (não mexemos aqui
    // para não sobrescrever com valores antigos).
    // datetime-local has no timezone; treat it as America/Sao_Paulo (fixed UTC-3).
    data_evento: dataEvento ? new Date(`${dataEvento}:00-03:00`).toISOString() : undefined,
    preco_ingresso: precoIngresso ? Number(precoIngresso) : undefined,
    link_compra: str(formData, "link_compra"),
    telefone: str(formData, "telefone"),
    email: str(formData, "email"),
    instagram_url: str(formData, "instagram_url"),
    facebook_url: str(formData, "facebook_url"),
    site_url: str(formData, "site_url"),
    whatsapp_numero: str(formData, "whatsapp_numero"),
    botao_lineup_texto: str(formData, "botao_lineup_texto") ?? "Ver line-up",
    botao_lineup_visivel: formData.get("botao_lineup_visivel") === "on",
    logo_url: logoUrl,
    tema: buildTema(formData),
    facebook_pixel_id: str(formData, "facebook_pixel_id")?.replace(/\D/g, "") || null,
  };

  const { error } = id
    ? await supabase.from("config_evento").update(payload).eq("id", id)
    : await supabase.from("config_evento").insert(payload);

  if (error) {
    return { error: error.message };
  }

  // "layout" porque o tema (cores/fontes) é aplicado no layout raiz
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  return { ok: true };
}
