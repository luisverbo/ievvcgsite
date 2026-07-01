"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moveOrdem, nextOrdem } from "@/lib/admin/reorder";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function saveArtista(_prevState: SaveState, formData: FormData): Promise<SaveState> {
  const nome = str(formData, "nome");
  if (!nome) return { error: "Informe o nome do artista." };

  const supabase = await createClient();
  const id = str(formData, "id");

  const payload = {
    nome,
    estilo: str(formData, "estilo") ?? "",
    pais: str(formData, "pais") ?? "",
    descricao: str(formData, "descricao") ?? "",
    // URLs já vêm prontas (upload direto do navegador para o Storage).
    foto_url: str(formData, "foto_url"),
    video_url: str(formData, "video_url"),
    ativo: formData.get("ativo") === "on",
  };

  const { error } = id
    ? await supabase.from("artistas").update(payload).eq("id", id)
    : await supabase.from("artistas").insert({ ...payload, ordem: await nextOrdem("artistas") });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/lineup");
  return { ok: true };
}

export async function removeArtista(id: string) {
  const supabase = await createClient();
  await supabase.from("artistas").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/lineup");
}

export async function moveArtista(id: string, direction: "up" | "down") {
  await moveOrdem("artistas", id, direction);
  revalidatePath("/");
  revalidatePath("/admin/lineup");
}
