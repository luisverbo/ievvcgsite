"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveMediaUrl } from "@/lib/admin/upload";
import { moveOrdem, nextOrdem } from "@/lib/admin/reorder";

export type SaveState = { ok?: boolean; error?: string } | undefined;

export async function addGaleriaFoto(
  _prevState: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const imagem_url = await resolveMediaUrl(formData, "imagem_arquivo", "imagem_url", "galeria");
  if (!imagem_url) return { error: "Envie uma foto ou cole um link de imagem." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("galeria")
    .insert({ imagem_url, ordem: await nextOrdem("galeria") });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/galeria");
  return { ok: true };
}

export async function removeGaleriaFoto(id: string) {
  const supabase = await createClient();
  await supabase.from("galeria").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/galeria");
}

export async function moveGaleriaFoto(id: string, direction: "up" | "down") {
  await moveOrdem("galeria", id, direction);
  revalidatePath("/");
  revalidatePath("/admin/galeria");
}
