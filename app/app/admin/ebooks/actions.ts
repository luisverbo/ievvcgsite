"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "../actions";
import {
  gerarConteudoEbook,
  gerarImagemEbook,
  getOpenAIKey,
  salvarOpenAIKey,
  subirImagemEbook,
  type FormatoEbook,
  type PaginaEbook,
} from "@/lib/ebooks/openai";

export type EbookRow = {
  id: string;
  org_id: string;
  titulo: string;
  subtitulo: string | null;
  tema: string;
  formato: FormatoEbook;
  estilo: string;
  status: "gerando" | "pronto" | "erro";
  paginas: PaginaEbook[];
  created_at: string;
};

/* ------------------------------ chave OpenAI ------------------------------ */
export type ChaveState = { ok?: boolean; error?: string } | undefined;

export async function salvarChave(_prev: ChaveState, formData: FormData): Promise<ChaveState> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const valor = String(formData.get("openai_key") ?? "").trim();
  if (!valor.startsWith("sk-")) return { error: "A chave deve começar com sk-." };
  await salvarOpenAIKey(valor);
  revalidatePath("/app/admin");
  revalidatePath("/app/admin/ebooks");
  return { ok: true };
}

/* ----------------------------- criar o ebook ------------------------------ */
export type CriarEbookResult = { ebookId?: string; totalPaginas?: number; error?: string };

// Passo 1: gera o CONTEÚDO (títulos + textos + prompts de imagem) e salva o
// ebook. As imagens são geradas depois, uma a uma, pelo navegador chamando
// gerarImagemPagina — assim nenhuma chamada estoura o tempo do servidor.
export async function criarEbook(formData: FormData): Promise<CriarEbookResult> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  const key = await getOpenAIKey();
  if (!key) return { error: "Configure sua chave da OpenAI primeiro (campo acima)." };

  const tema = String(formData.get("tema") ?? "").trim();
  const formato = (String(formData.get("formato") ?? "a4") as FormatoEbook) || "a4";
  const estilo = String(formData.get("estilo") ?? "fotografico");
  const numPaginas = Math.min(20, Math.max(3, Number(formData.get("paginas")) || 8));
  if (tema.length < 10) return { error: "Descreva melhor o tema do ebook (mínimo 10 caracteres)." };

  let conteudo;
  try {
    conteudo = await gerarConteudoEbook(key, tema, numPaginas, formato, estilo);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao gerar o conteúdo." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ebooks")
    .insert({
      org_id: org.id,
      titulo: conteudo.titulo || tema,
      subtitulo: conteudo.subtitulo || null,
      tema,
      formato,
      estilo,
      status: "gerando",
      paginas: conteudo.paginas,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Falha ao salvar o ebook." };
  return { ebookId: (data as { id: string }).id, totalPaginas: conteudo.paginas.length };
}

/* --------------------------- imagens (uma a uma) -------------------------- */
export type ImagemResult = { ok?: boolean; url?: string; error?: string };

export async function gerarImagemPagina(ebookId: string, indice: number): Promise<ImagemResult> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const key = await getOpenAIKey();
  if (!key) return { error: "Chave da OpenAI não configurada." };

  const supabase = await createClient();
  const { data } = await supabase.from("ebooks").select("*").eq("id", ebookId).maybeSingle();
  const ebook = data as EbookRow | null;
  if (!ebook) return { error: "Ebook não encontrado." };

  const pagina = ebook.paginas[indice];
  if (!pagina) return { error: `Página ${indice} não existe.` };
  if (pagina.imagem_url) return { ok: true, url: pagina.imagem_url }; // já gerada

  try {
    const buf = await gerarImagemEbook(key, pagina.prompt_imagem, ebook.formato, ebook.estilo);
    const url = await subirImagemEbook(ebook.org_id, ebook.id, `pag-${indice}.png`, buf);

    const paginas = [...ebook.paginas];
    paginas[indice] = { ...pagina, imagem_url: url };
    const completas = paginas.every((p) => p.imagem_url);
    await supabase
      .from("ebooks")
      .update({ paginas, ...(completas ? { status: "pronto" } : {}) })
      .eq("id", ebookId);

    return { ok: true, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao gerar a imagem." };
  }
}

export async function marcarPronto(ebookId: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase.from("ebooks").update({ status: "pronto" }).eq("id", ebookId);
  revalidatePath("/app/admin/ebooks");
}

export async function excluirEbook(ebookId: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase.from("ebooks").delete().eq("id", ebookId);
  revalidatePath("/app/admin/ebooks");
}
