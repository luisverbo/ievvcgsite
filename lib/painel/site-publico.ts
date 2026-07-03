import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Bloco, Pagina, Site } from "@/lib/types";

// cache(): layout e página compartilham o mesmo resultado dentro da requisição.
export const getSitePorSlug = cache(async (slug: string): Promise<Site | null> => {
  const supabase = await createClient();
  // RLS: visitante enxerga só publicado; membro logado enxerga o próprio site
  // em rascunho (vira preview natural no editor).
  const { data } = await supabase.from("sites").select("*").eq("slug", slug).maybeSingle();
  return (data as Site | null) ?? null;
});

export async function getPaginaComBlocos(
  siteId: string,
  slug: string,
): Promise<{ pagina: Pagina; blocos: Bloco[] } | null> {
  const supabase = await createClient();
  const { data: pagina } = await supabase
    .from("paginas")
    .select("*")
    .eq("site_id", siteId)
    .eq("slug", slug)
    .maybeSingle();
  if (!pagina) return null;

  const { data: blocos } = await supabase
    .from("blocos")
    .select("*")
    .eq("pagina_id", (pagina as Pagina).id)
    .eq("oculto", false)
    .order("ordem", { ascending: true });

  return { pagina: pagina as Pagina, blocos: (blocos as Bloco[] | null) ?? [] };
}
