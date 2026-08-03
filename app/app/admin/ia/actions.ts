"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { slugify } from "@/lib/format";
import { ehAdmin } from "../actions";
import { modeloValido } from "@/lib/ia/anthropic";

export type SiteIA = {
  id: string;
  org_id: string;
  titulo: string;
  slug: string;
  html: string;
  modelo: string;
  publicado: boolean;
  created_at: string;
  updated_at: string;
};

export type MensagemRow = {
  id: string;
  papel: "user" | "assistant";
  conteudo: string;
  anexos: { tipo: "imagem" | "pdf"; nome: string }[];
  created_at: string;
};

export type VersaoRow = { id: string; resumo: string | null; created_at: string };

export type NovaPaginaState = { error?: string } | undefined;

export async function criarPaginaIA(
  _prev: NovaPaginaState,
  formData: FormData,
): Promise<NovaPaginaState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (titulo.length < 3) return { error: "Dê um nome com pelo menos 3 caracteres." };

  // Sufixo curto para o endereço nunca colidir com outra página.
  const base = slugify(titulo) || "pagina";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites_ia")
    .insert({
      org_id: org.id,
      titulo,
      slug,
      modelo: modeloValido(String(formData.get("modelo") ?? "")),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  redirect(`/app/admin/ia/${(data as { id: string }).id}`);
}

export async function excluirPaginaIA(id: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase.from("sites_ia").delete().eq("id", id);
  revalidatePath("/app/admin/ia");
}

export async function trocarModelo(id: string, modelo: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase
    .from("sites_ia")
    .update({ modelo: modeloValido(modelo) })
    .eq("id", id);
  revalidatePath(`/app/admin/ia/${id}`);
}

export async function publicarPaginaIA(id: string, publicado: boolean) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase.from("sites_ia").update({ publicado }).eq("id", id);
  revalidatePath(`/app/admin/ia/${id}`);
  revalidatePath("/app/admin/ia");
}

// Volta a página para uma versão anterior. A versão restaurada vira a atual;
// as posteriores continuam guardadas (nada é apagado).
export async function restaurarVersao(id: string, versaoId: string) {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites_ia_versoes")
    .select("html")
    .eq("id", versaoId)
    .eq("site_ia_id", id)
    .maybeSingle();
  const html = (data as { html: string } | null)?.html;
  if (!html) return { error: "Versão não encontrada." };

  await supabase
    .from("sites_ia")
    .update({ html, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/app/admin/ia/${id}`);
  return { html };
}
