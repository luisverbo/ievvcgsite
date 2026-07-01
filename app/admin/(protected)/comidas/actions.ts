"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moveOrdem, nextOrdem } from "@/lib/admin/reorder";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function saveComida(_prevState: SaveState, formData: FormData): Promise<SaveState> {
  const pais = str(formData, "pais");
  const prato = str(formData, "prato");
  if (!pais || !prato) return { error: "Preencha o país e o prato." };

  const supabase = await createClient();
  const id = str(formData, "id");
  const payload = { pais, prato, emoji: str(formData, "emoji") ?? "🍽️" };

  const { error } = id
    ? await supabase.from("comidas").update(payload).eq("id", id)
    : await supabase.from("comidas").insert({ ...payload, ordem: await nextOrdem("comidas") });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/comidas");
  return { ok: true };
}

export async function removeComida(id: string) {
  const supabase = await createClient();
  await supabase.from("comidas").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/comidas");
}

export async function moveComida(id: string, direction: "up" | "down") {
  await moveOrdem("comidas", id, direction);
  revalidatePath("/");
  revalidatePath("/admin/comidas");
}
