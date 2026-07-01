import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Artista,
  Comida,
  FaqItemRow,
  GaleriaItem,
  Patrocinador,
  ProgramacaoItem,
} from "@/lib/types";

// Unlike lib/queries.ts, these always hit Supabase (no fallback data) and
// return every row — including inactive artists — since the admin needs to
// see and manage the real state of the database.

export async function getArtistasAdmin(): Promise<Artista[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("artistas").select("*").order("ordem", { ascending: true });
  return (data as Artista[] | null) ?? [];
}

export async function getProgramacaoAdmin(): Promise<ProgramacaoItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programacao")
    .select("*")
    .order("ordem", { ascending: true });
  return (data as ProgramacaoItem[] | null) ?? [];
}

export async function getComidasAdmin(): Promise<Comida[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("comidas").select("*").order("ordem", { ascending: true });
  return (data as Comida[] | null) ?? [];
}

export async function getGaleriaAdmin(): Promise<GaleriaItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("galeria").select("*").order("ordem", { ascending: true });
  return (data as GaleriaItem[] | null) ?? [];
}

export async function getFaqAdmin(): Promise<FaqItemRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("faq").select("*").order("ordem", { ascending: true });
  return (data as FaqItemRow[] | null) ?? [];
}

export async function getPatrocinadoresAdmin(): Promise<Patrocinador[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patrocinadores")
    .select("*")
    .order("ordem", { ascending: true });
  return (data as Patrocinador[] | null) ?? [];
}
