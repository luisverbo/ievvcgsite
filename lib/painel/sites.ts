import "server-only";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { semearBlocos, semearBlocosComConfig } from "./seed";
import { HOME_INICIAL } from "@/lib/blocks/registry";
import type { TemplateBloco } from "@/lib/templates/catalog";
import type { Tema } from "@/lib/types";

export type CriarSiteResult = { siteId?: string; paginaId?: string; error?: string };

// Cria um site novo dentro de uma org existente, já com uma página inicial
// semeada (blocos padrão ou os de um template). Reaproveitado pelo botão
// "Novo site" do painel e pela galeria de templates.
export async function criarSiteComHome(
  orgId: string,
  nome: string,
  slugBruto: string,
  opts?: { blocos?: TemplateBloco[]; tema?: Tema },
): Promise<CriarSiteResult> {
  const nomeTrim = nome.trim();
  const slug = slugify(slugBruto || nomeTrim);
  if (!nomeTrim) return { error: "Informe o nome do site." };
  if (slug.length < 3) return { error: "O endereço precisa ter pelo menos 3 caracteres." };

  const supabase = await createClient();
  const { data: novo, error } = await supabase
    .from("sites")
    .insert({ org_id: orgId, nome: nomeTrim, slug, ...(opts?.tema ? { tema: opts.tema } : {}) })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Esse endereço já está em uso. Tente outro." };
    // Violação de RLS (slug reservado) ou de check constraint (formato inválido).
    if (error.code === "42501" || error.message.includes("row-level")) {
      return { error: "Esse endereço não está disponível. Tente outro." };
    }
    if (error.code === "23514") return { error: "Use apenas letras, números e hífens no endereço." };
    return { error: error.message };
  }
  const siteId = (novo as { id: string }).id;

  const { data: home, error: eHome } = await supabase
    .from("paginas")
    .insert({ org_id: orgId, site_id: siteId, slug: "", titulo: "Página inicial", ordem: 1 })
    .select("id")
    .single();
  if (eHome || !home) return { siteId, error: eHome?.message };
  const paginaId = (home as { id: string }).id;

  if (opts?.blocos && opts.blocos.length > 0) {
    await semearBlocosComConfig(paginaId, orgId, opts.blocos);
  } else {
    await semearBlocos(paginaId, orgId, HOME_INICIAL);
  }
  return { siteId, paginaId };
}
