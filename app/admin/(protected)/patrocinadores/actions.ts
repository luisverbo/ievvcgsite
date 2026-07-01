"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moveOrdem, nextOrdem } from "@/lib/admin/reorder";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function savePatrocinador(
  _prevState: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const nome = str(formData, "nome");
  if (!nome) return { error: "Informe o nome do patrocinador." };

  const supabase = await createClient();
  const id = str(formData, "id");

  const payload = {
    nome,
    logo_url: str(formData, "logo_url"),
    link_url: str(formData, "link_url"),
  };

  const { error } = id
    ? await supabase.from("patrocinadores").update(payload).eq("id", id)
    : await supabase
        .from("patrocinadores")
        .insert({ ...payload, ordem: await nextOrdem("patrocinadores") });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/patrocinadores");
  return { ok: true };
}

export async function removePatrocinador(id: string) {
  const supabase = await createClient();
  await supabase.from("patrocinadores").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/patrocinadores");
}

export async function movePatrocinador(id: string, direction: "up" | "down") {
  await moveOrdem("patrocinadores", id, direction);
  revalidatePath("/");
  revalidatePath("/admin/patrocinadores");
}
