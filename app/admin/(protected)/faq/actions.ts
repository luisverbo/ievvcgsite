"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moveOrdem, nextOrdem } from "@/lib/admin/reorder";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function saveFaq(_prevState: SaveState, formData: FormData): Promise<SaveState> {
  const pergunta = str(formData, "pergunta");
  const resposta = str(formData, "resposta");
  if (!pergunta || !resposta) return { error: "Preencha a pergunta e a resposta." };

  const supabase = await createClient();
  const id = str(formData, "id");
  const payload = { pergunta, resposta };

  const { error } = id
    ? await supabase.from("faq").update(payload).eq("id", id)
    : await supabase.from("faq").insert({ ...payload, ordem: await nextOrdem("faq") });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/faq");
  return { ok: true };
}

export async function removeFaq(id: string) {
  const supabase = await createClient();
  await supabase.from("faq").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/faq");
}

export async function moveFaq(id: string, direction: "up" | "down") {
  await moveOrdem("faq", id, direction);
  revalidatePath("/");
  revalidatePath("/admin/faq");
}
