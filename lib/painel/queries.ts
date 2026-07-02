import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Organizacao, Pagina, Site } from "@/lib/types";

// Organização do usuário logado (MVP: uma org por usuário; a estrutura já
// suporta várias — aqui pegamos a primeira).
export async function getMinhaOrg(): Promise<Organizacao | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizacoes")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Organizacao | null) ?? null;
}

export async function getSites(orgId: string): Promise<Site[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  return (data as Site[] | null) ?? [];
}

export async function getSite(id: string): Promise<Site | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
  return (data as Site | null) ?? null;
}

export async function getPaginas(siteId: string): Promise<Pagina[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("paginas")
    .select("*")
    .eq("site_id", siteId)
    .order("ordem", { ascending: true });
  return (data as Pagina[] | null) ?? [];
}
