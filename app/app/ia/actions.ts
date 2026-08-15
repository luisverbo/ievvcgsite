"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { slugify } from "@/lib/format";
import { podeUsar, planoVigente, FREE_MAX_PAGINAS } from "@/lib/painel/permissoes";
import { ehAdmin } from "@/lib/painel/admin";
import { modeloValido, MEDIA_TYPES_IMAGEM } from "@/lib/ia/anthropic";
import { MODELO_PADRAO } from "@/lib/ia/modelos";
import { contaDaOrg, cobrarFixo, statusDaConta } from "@/lib/creditos/conta";
import { CUSTO_IMAGEM } from "@/lib/creditos/precos";
import { gerarImagemLanding, subirImagemIA } from "@/lib/ia/imagens";
import { listarImagensHtml, trocarImagemHtml, removerImagemHtml } from "@/lib/ia/html-imagens";

export type SiteIA = {
  id: string;
  org_id: string;
  titulo: string;
  slug: string;
  html: string;
  modelo: string;
  publicado: boolean;
  prospecto_id: string | null;
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

/*
 * O plano grátis é degustação: a página nasce pronta do primeiro pedido e
 * acabou. Este helper responde, para uma ação qualquer, se quem chama está
 * nessa condição — e as mensagens de bloqueio sempre apontam a saída (assinar),
 * nunca só a porta fechada.
 */
async function estaNoFree(orgId: string, planoContratado: string): Promise<boolean> {
  if (await ehAdmin()) return false;
  return (await planoVigente(orgId, planoContratado)) === "free";
}

export async function criarPaginaIA(
  _prev: NovaPaginaState,
  formData: FormData,
): Promise<NovaPaginaState> {
  if (!(await podeUsar("construtor"))) return { error: "Sem permissão." };
  const org = await getMinhaOrg();
  if (!org) return { error: "Organização não encontrada." };

  if (await estaNoFree(org.id, org.plano)) {
    const supabaseRls = await createClient();
    const { count } = await supabaseRls
      .from("sites_ia")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id);
    if ((count ?? 0) >= FREE_MAX_PAGINAS) {
      return {
        error:
          "No plano grátis você cria 1 página, para conhecer a ferramenta. Assine para criar quantas quiser — e liberar edição por chat, prospecção e domínio próprio.",
      };
    }
  }

  // Melhor barrar aqui do que deixar criar a página e falhar na primeira
  // mensagem do chat, com a tela já aberta.
  const conta = await statusDaConta(org.id);
  if (!conta.pronta) return { error: conta.aviso ?? "Conta de IA indisponível." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  if (titulo.length < 3) return { error: "Dê um nome com pelo menos 3 caracteres." };

  // Sufixo curto para o endereço nunca colidir com outra página.
  const base = slugify(titulo) || "pagina";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  /*
   * O modelo do formulário só vale para o admin. Para o cliente é sempre o
   * padrão — o seletor não aparece na tela dele, mas quem garante isso é aqui:
   * campo escondido no HTML é sugestão, não trava.
   */
  const modelo = (await ehAdmin())
    ? modeloValido(String(formData.get("modelo") ?? ""))
    : MODELO_PADRAO;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites_ia")
    .insert({ org_id: org.id, titulo, slug, modelo })
    .select("id")
    .single();

  if (error) return { error: error.message };
  redirect(`/app/ia/${(data as { id: string }).id}`);
}

export async function excluirPaginaIA(id: string) {
  if (!(await podeUsar("construtor"))) return;
  const supabase = await createClient();
  await supabase.from("sites_ia").delete().eq("id", id);
  revalidatePath("/app/ia");
}

export async function trocarModelo(id: string, modelo: string) {
  if (!(await podeUsar("construtor"))) return;
  // Trocar de modelo é do dono do sistema: é o que muda o custo por página.
  if (!(await ehAdmin())) return;
  const supabase = await createClient();
  await supabase
    .from("sites_ia")
    .update({ modelo: modeloValido(modelo) })
    .eq("id", id);
  revalidatePath(`/app/ia/${id}`);
}

export async function publicarPaginaIA(id: string, publicado: boolean) {
  if (!(await podeUsar("construtor"))) return { error: "Sem permissão." };
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

  revalidatePath(`/app/ia/${id}`);
  revalidatePath("/app/ia");
  return { ok: true };
}

// Volta a página para uma versão anterior. A versão restaurada vira a atual;
// as posteriores continuam guardadas (nada é apagado).
export async function restaurarVersao(id: string, versaoId: string) {
  if (!(await podeUsar("construtor"))) return { error: "Sem permissão." };
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
  revalidatePath(`/app/ia/${id}`);
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
  if (!(await podeUsar("construtor"))) return { error: "Sem permissão." };

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

  revalidatePath(`/app/ia/${siteIaId}`);
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
  if (!(await podeUsar("construtor"))) return { error: "Sem permissão." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("sites_ia")
    .select("id, org_id, html")
    .eq("id", siteIaId)
    .maybeSingle();
  const site = data as { id: string; org_id: string; html: string } | null;
  if (!site?.html) return { error: "Página não encontrada." };

  /*
   * Gerar imagem custa dinheiro de verdade; a degustação grátis para no
   * texto. Foto própria continua liberada (não custa nada e deixa a página
   * apresentável) — o bloqueio é só no que gasta.
   */
  const orgFree = await getMinhaOrg();
  if (orgFree && (await estaNoFree(orgFree.id, orgFree.plano))) {
    return {
      error:
        "Gerar imagens com IA faz parte dos planos pagos. No grátis, use o botão de enviar a sua própria foto — ou assine para liberar tudo.",
    };
  }

  // Imagem sai na chave da OpenAI do cliente, se ele tiver; senão na nossa,
  // descontando crédito. O texto e a imagem podem vir de contas diferentes.
  const conta = await contaDaOrg(site.org_id);
  if (!conta.openai) {
    return {
      error:
        "Para gerar imagens você precisa colar sua chave da OpenAI em Créditos — o Claude escreve a página, mas quem desenha é a OpenAI.",
    };
  }
  const qualidade = opcoes?.qualidade ?? "media";
  if (conta.fonte === "plataforma" && conta.saldo < CUSTO_IMAGEM[qualidade]) {
    return { error: "Crédito insuficiente para gerar esta imagem. Compre mais em Créditos." };
  }
  const key = conta.openai;

  const imagens = listarImagensHtml(site.html);
  const alvo = imagens[indice];
  if (!alvo) return { error: `Imagem ${indice + 1} não existe mais nesta versão.` };

  const prompt = opcoes?.prompt?.trim() || alvo.prompt;
  if (!prompt) return { error: "Esta imagem está sem descrição (data-ia-prompt vazio)." };

  try {
    const buf = await gerarImagemLanding(key, prompt, alvo.orientacao, qualidade);

    // Só depois de a imagem existir. Cobrar antes deixaria o cliente pagando
    // por uma geração que falhou.
    await cobrarFixo({
      conta,
      micro: CUSTO_IMAGEM[qualidade],
      descricao: `Imagem ${qualidade === "alta" ? "em alta qualidade" : "da página"}`,
      referenciaTipo: "site_ia",
      referenciaId: site.id,
    });

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

/*
 * Coloca uma foto REAL no lugar de uma das imagens da página.
 *
 * É o caminho que o cliente aprovando o site vai pedir: "põe a foto da minha
 * loja aqui". Melhor que passar pelo chat — troca só aquele espaço, não regera
 * a página, não gasta crédito e o enquadramento não muda.
 */
export async function enviarImagemPropria(
  siteIaId: string,
  indice: number,
  arquivo: { base64: string; media_type: string },
): Promise<ImagemIAResult> {
  if (!(await podeUsar("construtor"))) return { error: "Sem permissão." };
  if (!MEDIA_TYPES_IMAGEM.includes(arquivo.media_type)) {
    return { error: "Formato não aceito. Use JPG, PNG, WEBP ou GIF." };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("sites_ia")
    .select("id, org_id, html")
    .eq("id", siteIaId)
    .maybeSingle();
  const site = data as { id: string; org_id: string; html: string } | null;
  if (!site?.html) return { error: "Página não encontrada." };

  const imagens = listarImagensHtml(site.html);
  if (!imagens[indice]) return { error: `Imagem ${indice + 1} não existe mais nesta versão.` };

  const buf = Buffer.from(arquivo.base64, "base64");
  if (buf.byteLength > 10 * 1024 * 1024) return { error: "A foto passa de 10MB." };

  try {
    const ext = arquivo.media_type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    // Carimbo no nome: trocar a foto sem isso pegaria a antiga do cache do CDN.
    const url = await subirImagemIA(
      site.org_id,
      site.id,
      `propria-${indice}-${Date.now()}.${ext}`,
      buf,
      arquivo.media_type,
    );
    const html = trocarImagemHtml(site.html, indice, url);

    await supabase
      .from("sites_ia")
      .update({ html, updated_at: new Date().toISOString() })
      .eq("id", siteIaId);

    return { html, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao enviar a foto." };
  }
}

/*
 * Tira uma imagem da página.
 *
 * Serve para o caso real: o cliente mandou 10 fotos e o site tem 15 espaços —
 * ele não quer as 5 restantes desenhadas por IA. Sai na hora e sem custo.
 *
 * Sobra o buraco no layout, e é honesto dizer isso na tela: quem fecha o
 * espaço direito é a IA, num pedido depois.
 */
export async function removerImagemIA(
  siteIaId: string,
  indice: number,
): Promise<ImagemIAResult> {
  if (!(await podeUsar("construtor"))) return { error: "Sem permissão." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("sites_ia")
    .select("id, html")
    .eq("id", siteIaId)
    .maybeSingle();
  const site = data as { id: string; html: string } | null;
  if (!site?.html) return { error: "Página não encontrada." };

  const imagens = listarImagensHtml(site.html);
  if (!imagens[indice]) return { error: `Imagem ${indice + 1} não existe mais nesta versão.` };

  const html = removerImagemHtml(site.html, indice);
  const { error } = await supabase
    .from("sites_ia")
    .update({ html, updated_at: new Date().toISOString() })
    .eq("id", siteIaId);
  if (error) return { error: error.message };

  return { html };
}
