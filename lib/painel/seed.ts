import "server-only";

import { createClient } from "@/lib/supabase/server";
import { defaultConfig } from "@/lib/blocks/registry";
import type { TemplateBloco } from "@/lib/templates/catalog";

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

// Insere blocos de um template (com config pré-preenchida) numa página.
export async function semearBlocosComConfig(
  paginaId: string,
  orgId: string,
  blocos: TemplateBloco[],
) {
  const supabase = await createClient();
  const rows = blocos.map((b, i) => ({
    org_id: orgId,
    pagina_id: paginaId,
    tipo: b.tipo,
    config: b.config,
    ordem: i + 1,
  }));
  await supabase.from("blocos").insert(rows);
}
