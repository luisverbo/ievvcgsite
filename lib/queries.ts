import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Artista,
  Comida,
  ConfigEvento,
  FaqItemRow,
  GaleriaItem,
  Patrocinador,
  ProgramacaoItem,
} from "@/lib/types";
import {
  FALLBACK_ARTISTAS,
  FALLBACK_COMIDAS,
  FALLBACK_CONFIG,
  FALLBACK_FAQ,
  FALLBACK_PATROCINADORES,
  FALLBACK_PROGRAMACAO,
} from "@/lib/fallback-data";

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export async function getConfigEvento(): Promise<ConfigEvento> {
  if (!isSupabaseConfigured) return FALLBACK_CONFIG;
  const supabase = await createClient();
  const { data } = await supabase.from("config_evento").select("*").limit(1).maybeSingle();
  if (!data) return FALLBACK_CONFIG;
  // Preenche campos que podem não existir em bancos criados antes das
  // migrações mais recentes, para o site não quebrar enquanto o SQL não roda.
  const row = data as Partial<ConfigEvento>;
  return {
    ...FALLBACK_CONFIG,
    ...row,
    tema: row.tema ?? {},
    textos: row.textos ?? {},
  } as ConfigEvento;
}

export async function getArtistas(): Promise<Artista[]> {
  if (!isSupabaseConfigured) return FALLBACK_ARTISTAS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("artistas")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  return data && data.length > 0 ? (data as Artista[]) : FALLBACK_ARTISTAS;
}

export async function getProgramacao(): Promise<ProgramacaoItem[]> {
  if (!isSupabaseConfigured) return FALLBACK_PROGRAMACAO;
  const supabase = await createClient();
  const { data } = await supabase.from("programacao").select("*").order("ordem", { ascending: true });
  return data && data.length > 0 ? (data as ProgramacaoItem[]) : FALLBACK_PROGRAMACAO;
}

export async function getComidas(): Promise<Comida[]> {
  if (!isSupabaseConfigured) return FALLBACK_COMIDAS;
  const supabase = await createClient();
  const { data } = await supabase.from("comidas").select("*").order("ordem", { ascending: true });
  return data && data.length > 0 ? (data as Comida[]) : FALLBACK_COMIDAS;
}

export async function getGaleria(): Promise<GaleriaItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("galeria").select("*").order("ordem", { ascending: true });
  return (data as GaleriaItem[] | null) ?? [];
}

export async function getFaq(): Promise<FaqItemRow[]> {
  if (!isSupabaseConfigured) return FALLBACK_FAQ;
  const supabase = await createClient();
  const { data } = await supabase.from("faq").select("*").order("ordem", { ascending: true });
  return data && data.length > 0 ? (data as FaqItemRow[]) : FALLBACK_FAQ;
}

export async function getPatrocinadores(): Promise<Patrocinador[]> {
  if (!isSupabaseConfigured) return FALLBACK_PATROCINADORES;
  const supabase = await createClient();
  const { data } = await supabase
    .from("patrocinadores")
    .select("*")
    .order("ordem", { ascending: true });
  return data && data.length > 0 ? (data as Patrocinador[]) : FALLBACK_PATROCINADORES;
}
