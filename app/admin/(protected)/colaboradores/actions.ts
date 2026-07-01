"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaveState = { ok?: boolean; error?: string } | undefined;

// Garante que quem chama está autenticado no painel antes de mexer em usuários.
async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function addColaborador(
  _prevState: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const atual = await requireSession();
  if (!atual) return { error: "Sessão expirada. Entre novamente." };

  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || senha.length < 6) {
    return { error: "Informe um email válido e uma senha com pelo menos 6 caracteres." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/colaboradores");
  return { ok: true };
}

export async function removeColaborador(id: string) {
  const atual = await requireSession();
  if (!atual || atual.id === id) return; // não deixa remover a si mesmo

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
  revalidatePath("/admin/colaboradores");
}
