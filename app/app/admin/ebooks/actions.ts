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
  MODELOS_TEXTO,
  type FormatoEbook,
  type PaginaEbook,
  type QualidadeImagem,
} from "@/lib/ebooks/openai";
import { modeloValido } from "@/lib/ia/modelos";
import { getAnthropicKey } from "@/lib/ia/anthropic";
import { gerarImagemLanding, subirImagemIA } from "@/lib/ia/imagens";
import { listarImagensHtml, trocarImagemHtml } from "@/lib/ia/html-imagens";

export type EbookRow = {
  id: string;
  org_id: string;
  titulo: string;
  subtitulo: string | null;
  tema: string;
  formato: FormatoEbook;
  estilo: string;
  modelo_texto?: string;
  qualidade_imagem?: QualidadeImagem;
  status: "gerando" | "pronto" | "erro";
  paginas: PaginaEbook[];
  created_at: string;
  // Motor novo (Claude escreve o HTML diagramado). Ebooks antigos ficam em
  // 'openai' e continuam abrindo no leitor de sempre.
  motor?: "openai" | "claude";
  html?: string | null;
  modelo_ia?: string | null;
  paginas_alvo?: number;
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
  const modeloBruto = String(formData.get("modelo_texto") ?? "gpt-4o");
  const modelo = MODELOS_TEXTO[modeloBruto] ? modeloBruto : "gpt-4o";
  const qualidade: QualidadeImagem =
    String(formData.get("qualidade_imagem")) === "alta" ? "alta" : "media";
  const numPaginas = Math.min(20, Math.max(3, Number(formData.get("paginas")) || 8));
  if (tema.length < 10) return { error: "Descreva melhor o tema do ebook (mínimo 10 caracteres)." };

  let conteudo;
  try {
    conteudo = await gerarConteudoEbook(key, tema, numPaginas, formato, estilo, modelo);
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
      modelo_texto: modelo,
      qualidade_imagem: qualidade,
      status: "gerando",
      paginas: conteudo.paginas,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Falha ao salvar o ebook." };
  return { ebookId: (data as { id: string }).id, totalPaginas: conteudo.paginas.length };
}

/* ------------------------- ebook escrito pela Claude ---------------------- */
export type NovoEbookIAResult = { ebookId?: string; error?: string };

// Só cria o registro; quem escreve é a rota /api/ia/ebook (em streaming).
export async function criarEbookIA(formData: FormData): Promise<NovoEbookIAResult> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  // Checa a chave ANTES de criar o registro: sem ela nada é gerado, e um
  // ebook vazio ficaria na lista sem explicação.
  if (!(await getAnthropicKey())) {
    return {
      error:
        "Falta a chave da Anthropic. Vá em Admin 👑 → card “Construtor de páginas com IA”, cole a chave (sk-ant-…) e volte aqui.",
    };
  }

  const tema = String(formData.get("tema") ?? "").trim();
  if (tema.length < 10) return { error: "Descreva melhor o tema do ebook (mínimo 10 caracteres)." };

  const formato = (String(formData.get("formato") ?? "a4") as FormatoEbook) || "a4";
  // Teto de 24: acima disso a diagramação não cabe no tempo da função e a
  // geração morre no meio, sem salvar nada.
  const numPaginas = Math.min(24, Math.max(4, Number(formData.get("paginas")) || 12));
  const qualidade: QualidadeImagem =
    String(formData.get("qualidade_imagem")) === "alta" ? "alta" : "media";
  const modeloIA = modeloValido(String(formData.get("modelo_ia") ?? ""));

  // Título provisório: a capa que a IA escrever manda no visual; este nome só
  // organiza a lista até o autor renomear.
  const titulo = tema.slice(0, 60);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ebooks")
    .insert({
      org_id: org.id,
      titulo,
      tema,
      formato,
      estilo: String(formData.get("estilo") ?? "fotografico"),
      motor: "claude",
      modelo_ia: modeloIA,
      paginas_alvo: numPaginas,
      qualidade_imagem: qualidade,
      status: "gerando",
      paginas: [],
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Falha ao criar o ebook." };
  return { ebookId: (data as { id: string }).id };
}

export type ImagemEbookIAResult = { html?: string; url?: string; error?: string };

// Gera uma imagem marcada com data-ia-prompt no HTML do ebook.
export async function gerarImagemEbookIA(
  ebookId: string,
  indice: number,
  opcoes?: { prompt?: string },
): Promise<ImagemEbookIAResult> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const key = await getOpenAIKey();
  if (!key) return { error: "Configure sua chave da OpenAI (campo no topo desta página)." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("ebooks")
    .select("id, org_id, html, qualidade_imagem")
    .eq("id", ebookId)
    .maybeSingle();
  const ebook = data as {
    id: string;
    org_id: string;
    html: string | null;
    qualidade_imagem?: QualidadeImagem;
  } | null;
  if (!ebook?.html) return { error: "Ebook não encontrado." };

  const alvo = listarImagensHtml(ebook.html)[indice];
  if (!alvo) return { error: `Imagem ${indice + 1} não existe mais nesta versão.` };
  const prompt = opcoes?.prompt?.trim() || alvo.prompt;
  if (!prompt) return { error: "Esta imagem está sem descrição." };

  try {
    const buf = await gerarImagemLanding(
      key,
      prompt,
      alvo.orientacao,
      ebook.qualidade_imagem ?? "media",
    );
    const url = await subirImagemIA(ebook.org_id, ebook.id, `pg-${indice}-${Date.now()}.png`, buf);
    const html = trocarImagemHtml(ebook.html, indice, url, opcoes?.prompt?.trim() || undefined);
    await supabase.from("ebooks").update({ html }).eq("id", ebookId);
    return { html, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao gerar a imagem." };
  }
}

export async function renomearEbook(ebookId: string, titulo: string) {
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase
    .from("ebooks")
    .update({ titulo: titulo.trim().slice(0, 120) || "Ebook" })
    .eq("id", ebookId);
  revalidatePath("/app/admin/ebooks");
}

/* --------------------------- imagens (uma a uma) -------------------------- */
export type ImagemResult = { ok?: boolean; url?: string; error?: string };

// Gera (ou regenera) a imagem de uma página. `opcoes.prompt` troca a direção
// de arte; `opcoes.forcar` regenera mesmo que já exista imagem.
export async function gerarImagemPagina(
  ebookId: string,
  indice: number,
  opcoes?: { prompt?: string; forcar?: boolean },
): Promise<ImagemResult> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  const key = await getOpenAIKey();
  if (!key) return { error: "Chave da OpenAI não configurada." };

  const supabase = await createClient();
  const { data } = await supabase.from("ebooks").select("*").eq("id", ebookId).maybeSingle();
  const ebook = data as EbookRow | null;
  if (!ebook) return { error: "Ebook não encontrado." };

  const pagina = ebook.paginas[indice];
  if (!pagina) return { error: `Página ${indice} não existe.` };
  if (pagina.imagem_url && !opcoes?.forcar) return { ok: true, url: pagina.imagem_url };

  const promptImagem = opcoes?.prompt?.trim() || pagina.prompt_imagem;

  try {
    const buf = await gerarImagemEbook(
      key,
      promptImagem,
      ebook.formato,
      ebook.estilo,
      ebook.qualidade_imagem ?? "media",
    );
    // Nome com timestamp para trocar a imagem sem pegar cache antigo do CDN.
    const url = await subirImagemEbook(ebook.org_id, ebook.id, `pag-${indice}-${Date.now()}.png`, buf);

    const paginas = [...ebook.paginas];
    paginas[indice] = { ...pagina, prompt_imagem: promptImagem, imagem_url: url };
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
