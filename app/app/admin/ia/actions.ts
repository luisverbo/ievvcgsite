"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { slugify } from "@/lib/format";
import { ehAdmin } from "../actions";
import { modeloValido } from "@/lib/ia/anthropic";
import { getOpenAIKey } from "@/lib/ebooks/openai";
import { gerarImagemLanding, subirImagemIA } from "@/lib/ia/imagens";
import { listarImagensHtml, trocarImagemHtml } from "@/lib/ia/html-imagens";

export type SiteIA = {
  id: string;
  org_id: string;
  titulo: string;
  slug: string;
  html: string;
  modelo: string;
  publicado: boolean;
  facebook_pixel_id: string | null;
  codigo_head: string | null;
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
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const supabase = await createClient();

  // Publicar sem HTML deixaria um endereço no ar respondendo 404.
  if (publicado) {
    const { data } = await supabase.from("sites_ia").select("html").eq("id", id).maybeSingle();
    if (!(data as { html: string } | null)?.html) {
      return { error: "A página ainda está vazia — peça a primeira versão à IA antes de publicar." };
    }
  }

  const { error } = await supabase.from("sites_ia").update({ publicado }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/app/admin/ia/${id}`);
  revalidatePath("/app/admin/ia");
  return { ok: true };
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

/* -------------------------- pixel e tags de anúncio ----------------------- */
export type PixelState = { ok?: boolean; error?: string } | undefined;

// Guardado fora do HTML: dá para ligar o pixel numa página já pronta sem
// mexer no que a IA escreveu.
export async function salvarPixel(
  siteIaId: string,
  _prev: PixelState,
  formData: FormData,
): Promise<PixelState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };

  // O usuário costuma colar o script inteiro; extraímos só o ID numérico.
  const bruto = String(formData.get("facebook_pixel_id") ?? "");
  const doScript = /fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,20})['"]/.exec(bruto)?.[1];
  const pixel = (doScript ?? bruto.replace(/\D/g, "")) || null;
  if (pixel && (pixel.length < 6 || pixel.length > 20)) {
    return { error: "O ID do Pixel tem entre 6 e 20 dígitos. Confira no Gerenciador de Eventos." };
  }

  const codigo = String(formData.get("codigo_head") ?? "").trim().slice(0, 20_000) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites_ia")
    .update({ facebook_pixel_id: pixel, codigo_head: codigo })
    .eq("id", siteIaId);
  if (error) return { error: error.message };

  revalidatePath(`/app/admin/ia/${siteIaId}`);
  return { ok: true };
}

/* ------------------------------- imagens --------------------------------- */
export type ImagemIAResult = { html?: string; url?: string; error?: string };

// Gera a imagem que a IA marcou com data-ia-prompt e grava a URL no HTML.
// Uma por chamada (como no ebook): o navegador percorre a fila, e uma falha
// não derruba as outras.
export async function gerarImagemIA(
  siteIaId: string,
  indice: number,
  opcoes?: { prompt?: string; qualidade?: "media" | "alta" },
): Promise<ImagemIAResult> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const key = await getOpenAIKey();
  if (!key) return { error: "Configure a chave da OpenAI no painel admin (aba Ebooks)." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("sites_ia")
    .select("id, org_id, html")
    .eq("id", siteIaId)
    .maybeSingle();
  const site = data as { id: string; org_id: string; html: string } | null;
  if (!site?.html) return { error: "Página não encontrada." };

  const imagens = listarImagensHtml(site.html);
  const alvo = imagens[indice];
  if (!alvo) return { error: `Imagem ${indice + 1} não existe mais nesta versão.` };

  const prompt = opcoes?.prompt?.trim() || alvo.prompt;
  if (!prompt) return { error: "Esta imagem está sem descrição (data-ia-prompt vazio)." };

  try {
    const buf = await gerarImagemLanding(key, prompt, alvo.orientacao, opcoes?.qualidade ?? "media");
    // Timestamp no nome para trocar a imagem sem pegar cache antigo do CDN.
    const url = await subirImagemIA(site.org_id, site.id, `img-${indice}-${Date.now()}.png`, buf);
    const html = trocarImagemHtml(site.html, indice, url, opcoes?.prompt?.trim() || undefined);

    await supabase
      .from("sites_ia")
      .update({ html, updated_at: new Date().toISOString() })
      .eq("id", siteIaId);

    return { html, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao gerar a imagem." };
  }
}
