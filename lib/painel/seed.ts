import "server-only";

import { createClient } from "@/lib/supabase/server";
import { defaultConfig } from "@/lib/blocks/registry";

// Insere uma lista de blocos (por tipo) numa página, com os configs padrão.
export async function semearBlocos(paginaId: string, orgId: string, tipos: string[]) {
  const supabase = await createClient();
  const rows = tipos.map((tipo, i) => ({
    org_id: orgId,
    pagina_id: paginaId,
    tipo,
    config: defaultConfig(tipo),
    ordem: i + 1,
  }));
  await supabase.from("blocos").insert(rows);
}
