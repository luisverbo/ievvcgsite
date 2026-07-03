"use server";

import { createClient } from "@/lib/supabase/server";

export type LeadState = { ok?: boolean; error?: string } | undefined;

// Grava um lead vindo de um formulário de página publicada. RLS permite
// insert público (anon); os campos "_site"/"_org" identificam o dono.
export async function enviarLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const siteId = String(formData.get("_site") ?? "");
  const orgId = String(formData.get("_org") ?? "");
  const paginaId = String(formData.get("_pagina") ?? "");
  const origem = String(formData.get("_origem") ?? "") || null;
  if (!siteId || !orgId) return { error: "Formulário inválido." };

  // Coleta os campos do formulário (prefixo campo_).
  const dados: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("campo_") && typeof value === "string") {
      dados[key.slice("campo_".length)] = value.trim();
    }
  }
  if (Object.values(dados).every((v) => v === "")) {
    return { error: "Preencha os campos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    org_id: orgId,
    site_id: siteId,
    pagina_id: paginaId || null,
    dados,
    origem,
  });

  if (error) return { error: "Não foi possível enviar. Tente novamente." };
  return { ok: true };
}
