"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Só o email definido em ADMIN_EMAIL pode usar as ações de dono do sistema.
export async function ehAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() === adminEmail;
}

export async function alterarPlano(orgId: string, novoPlano: "free" | "pro") {
  if (!(await ehAdmin())) return;
  const admin = createAdminClient();
  await admin.from("organizacoes").update({ plano: novoPlano }).eq("id", orgId);
  revalidatePath("/app/admin");
}
