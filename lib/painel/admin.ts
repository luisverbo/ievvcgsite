import "server-only";

import { createClient } from "@/lib/supabase/server";

/*
 * Só o email definido em ADMIN_EMAIL pode usar as ações de dono do sistema.
 *
 * Mora aqui, e não junto das ações do admin, porque as permissões de plano
 * precisam consultá-lo — e um arquivo "use server" importando outro que o
 * importa de volta é um ciclo esperando para quebrar.
 */
export async function ehAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() === adminEmail;
}
