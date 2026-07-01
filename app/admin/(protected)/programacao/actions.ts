"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moveOrdem, nextOrdem } from "@/lib/admin/reorder";

export type SaveState = { ok?: boolean; error?: string } | undefined;

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function saveProgramacao(
  _prevState: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const dia = str(formData, "dia");
  const horario = str(formData, "horario");
  const descricao = str(formData, "descricao");
  if (!dia || !horario || !descricao) {
    return { error: "Preencha dia, horário e descrição." };
  }

  const supabase = await createClient();
  const id = str(formData, "id");
  const payload = { dia, horario, descricao };

  const { error } = id
    ? await supabase.from("programacao").update(payload).eq("id", id)
    : await supabase.from("programacao").insert({
        ...payload,
        ordem: await nextOrdem("programacao", { column: "dia", value: dia }),
      });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/programacao");
  return { ok: true };
}

export async function removeProgramacao(id: string) {
  const supabase = await createClient();
  await supabase.from("programacao").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/programacao");
}

export async function moveProgramacao(id: string, dia: string, direction: "up" | "down") {
  await moveOrdem("programacao", id, direction, { column: "dia", value: dia });
  revalidatePath("/");
  revalidatePath("/admin/programacao");
}
