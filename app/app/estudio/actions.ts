"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "@/lib/painel/admin";
import { garimparYoutube, transcricaoDoYoutube, oembedTiktok } from "@/lib/estudio/youtube";
import { dissecar, type EntradaDissecacao, type Formula } from "@/lib/estudio/dissecar";
import { escreverRoteiro } from "@/lib/estudio/roteiro";
import { salvarModeloDaTarefa, type TarefaLLM } from "@/lib/estudio/llm";

/*
 * Ferramenta interna: TODA action daqui exige admin. As tabelas do Estúdio
 * não têm política de RLS de propósito (só o service role encosta), então o
 * gate ehAdmin() nestas actions É a segurança — não remova.
 */

export type EstadoEstudio = { ok?: string; error?: string } | undefined;

async function admDono(): Promise<{ admin: ReturnType<typeof createAdminClient>; orgId: string } | null> {
  if (!(await ehAdmin())) return null;
  const org = await getMinhaOrg();
  if (!org) return null;
  return { admin: createAdminClient(), orgId: org.id };
}

/* -------------------------------- garimpo --------------------------------- */

export async function garimpar(_prev: EstadoEstudio, formData: FormData): Promise<EstadoEstudio> {
  const ctx = await admDono();
  if (!ctx) return { error: "Sem permissão." };

  const tema = String(formData.get("tema") ?? "").trim();
  if (tema.length < 3) return { error: "Diga o tema — ex.: “criação de sites”, “renda extra”." };

  const minViews = Math.max(0, Number(formData.get("min_views")) || 0);
  const periodoDias = Math.max(0, Number(formData.get("periodo")) || 0) || undefined;
  const duracao = String(formData.get("duracao")) === "curto" ? ("curto" as const) : ("qualquer" as const);

  let achados;
  try {
    achados = await garimparYoutube({ tema, minViews, periodoDias, duracao });
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (achados.length === 0) {
    return { error: "Nada encontrado com esses filtros — tente afrouxar o mínimo de views ou o período." };
  }

  const linhas = achados.map((a) => ({
    org_id: ctx.orgId,
    fonte: "youtube",
    video_id: a.video_id,
    url: a.url,
    titulo: a.titulo,
    canal: a.canal,
    canal_id: a.canal_id,
    views: a.views,
    likes: a.likes,
    comentarios: a.comentarios,
    publicado_em: a.publicado_em,
    duracao_s: a.duracao_s,
    canal_media_views: a.canal_media_views,
    score_outlier: a.score_outlier,
    views_por_dia: a.views_por_dia,
    thumbnail: a.thumbnail,
    tema,
  }));
  // Repetir a pesquisa atualiza os números do que já existia.
  const { error } = await ctx.admin
    .from("estudio_achados")
    .upsert(linhas, { onConflict: "org_id,fonte,video_id" });
  if (error) return { error: error.message };

  revalidatePath("/app/estudio");
  return { ok: `${achados.length} vídeos garimpados — ordenados pelo score de outlier.` };
}

export async function colarTiktok(_prev: EstadoEstudio, formData: FormData): Promise<EstadoEstudio> {
  const ctx = await admDono();
  if (!ctx) return { error: "Sem permissão." };

  const url = String(formData.get("url") ?? "").trim();
  const tema = String(formData.get("tema") ?? "").trim() || "tiktok";
  const transcricao = String(formData.get("transcricao") ?? "").trim().slice(0, 12_000) || null;

  const dados = await oembedTiktok(url);
  if (!dados) return { error: "Não consegui ler essa URL do TikTok — confira o link." };

  const { error } = await ctx.admin.from("estudio_achados").upsert(
    {
      org_id: ctx.orgId,
      fonte: "tiktok",
      video_id: url.split("?")[0].slice(-64),
      url,
      titulo: dados.titulo,
      canal: dados.canal,
      thumbnail: dados.thumbnail,
      transcricao,
      tema,
    },
    { onConflict: "org_id,fonte,video_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/app/estudio");
  return { ok: `TikTok de @${dados.canal} adicionado ao tema “${tema}”.` };
}

export async function excluirAchado(id: string) {
  const ctx = await admDono();
  if (!ctx) return;
  await ctx.admin.from("estudio_achados").delete().eq("id", id).eq("org_id", ctx.orgId);
  revalidatePath("/app/estudio");
}

/* ------------------------------- dissecação ------------------------------- */

export async function dissecarSelecionados(
  _prev: EstadoEstudio,
  formData: FormData,
): Promise<EstadoEstudio> {
  const ctx = await admDono();
  if (!ctx) return { error: "Sem permissão." };

  const ids = formData.getAll("achado").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Marque pelo menos um vídeo para dissecar." };
  if (ids.length > 5) return { error: "Até 5 vídeos por fórmula — mais que isso vira média rasa." };

  const { data: raw } = await ctx.admin
    .from("estudio_achados")
    .select("*")
    .eq("org_id", ctx.orgId)
    .in("id", ids);
  const achados = (raw as (EntradaDissecacao & { id: string; video_id: string; fonte: string; tema: string })[] | null) ?? [];
  if (achados.length === 0) return { error: "Vídeos não encontrados." };

  /*
   * Busca as transcrições que faltam AGORA (melhor esforço, uma a uma) e
   * grava — a próxima dissecação dos mesmos vídeos já não paga esse tempo.
   */
  for (const a of achados) {
    if (a.transcricao || a.fonte !== "youtube") continue;
    const t = await transcricaoDoYoutube(a.video_id);
    if (t) {
      a.transcricao = t;
      await ctx.admin.from("estudio_achados").update({ transcricao: t }).eq("id", a.id);
    }
  }

  const tema = achados[0].tema;
  let resultado;
  try {
    resultado = await dissecar(achados, tema);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const comTranscricao = achados.filter((a) => a.transcricao).length;
  const { error } = await ctx.admin.from("estudio_formulas").insert({
    org_id: ctx.orgId,
    nome: `${tema} — ${new Date().toLocaleDateString("pt-BR")}`,
    tema,
    formula: resultado.formula,
    achados: achados.map((a) => a.id),
    modelo: resultado.modelo,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/estudio");
  return {
    ok: `Fórmula extraída de ${achados.length} vídeo${achados.length > 1 ? "s" : ""} (${comTranscricao} com transcrição) e salva.`,
  };
}

export async function excluirFormula(id: string) {
  const ctx = await admDono();
  if (!ctx) return;
  await ctx.admin.from("estudio_formulas").delete().eq("id", id).eq("org_id", ctx.orgId);
  revalidatePath("/app/estudio");
}

/* -------------------------------- projetos --------------------------------- */

export async function criarRoteiro(_prev: EstadoEstudio, formData: FormData): Promise<EstadoEstudio> {
  const ctx = await admDono();
  if (!ctx) return { error: "Sem permissão." };

  const formulaId = String(formData.get("formula_id") ?? "");
  const assunto = String(formData.get("assunto") ?? "").trim();
  const duracao = Math.min(180, Math.max(15, Number(formData.get("duracao")) || 60));
  const dezesseisPorNove = String(formData.get("formato_16x9") ?? "") === "1";
  if (assunto.length < 5) return { error: "Diga sobre o que é o vídeo novo." };

  const { data: fRaw } = await ctx.admin
    .from("estudio_formulas")
    .select("id, formula, tema")
    .eq("id", formulaId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  const f = fRaw as { id: string; formula: Formula; tema: string | null } | null;
  if (!f) return { error: "Fórmula não encontrada." };

  let r;
  try {
    r = await escreverRoteiro(assunto, f.formula, duracao);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await ctx.admin.from("estudio_projetos").insert({
    org_id: ctx.orgId,
    titulo: r.titulo,
    tema: f.tema,
    formula_id: f.id,
    roteiro: r.roteiro,
    termos: r.termos,
    status: "roteiro_pronto",
    formato_16x9: dezesseisPorNove,
    duracao_alvo_s: duracao,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/estudio");
  return { ok: `Roteiro pronto: “${r.titulo}”. Revise abaixo e aprove para gerar.` };
}

/*
 * Aprovar É colocar na fila. A porta única de revisão que o dono pediu: daqui
 * em diante quem trabalha é a máquina dele.
 */
export async function aprovarProjeto(_prev: EstadoEstudio, formData: FormData): Promise<EstadoEstudio> {
  const ctx = await admDono();
  if (!ctx) return { error: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const roteiro = String(formData.get("roteiro") ?? "").trim();
  const termos = String(formData.get("termos") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
  if (roteiro.length < 60) return { error: "Roteiro curto demais." };
  if (termos.length === 0) return { error: "Escreva ao menos um termo de busca (em inglês)." };

  const { error } = await ctx.admin
    .from("estudio_projetos")
    .update({
      roteiro,
      termos,
      status: "na_fila",
      erro: null,
      progresso: "aguardando o computador com o Estúdio ligado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .in("status", ["roteiro_pronto", "erro"]);
  if (error) return { error: error.message };

  revalidatePath("/app/estudio");
  return { ok: "Na fila! O vídeo começa assim que o computador com o MoneyPrinterTurbo estiver ligado." };
}

export async function voltarParaEdicao(id: string) {
  const ctx = await admDono();
  if (!ctx) return;
  // Só quem ainda não começou volta — não se cancela render pela metade.
  await ctx.admin
    .from("estudio_projetos")
    .update({ status: "roteiro_pronto", progresso: null })
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .eq("status", "na_fila");
  revalidatePath("/app/estudio");
}

export async function excluirProjeto(id: string) {
  const ctx = await admDono();
  if (!ctx) return;
  await ctx.admin.from("estudio_projetos").delete().eq("id", id).eq("org_id", ctx.orgId);
  revalidatePath("/app/estudio");
}

/* ------------------------------ config de LLM ------------------------------ */

export async function salvarModelos(_prev: EstadoEstudio, formData: FormData): Promise<EstadoEstudio> {
  if (!(await ehAdmin())) return { error: "Sem permissão." };
  for (const tarefa of ["dissecacao", "roteiro"] as TarefaLLM[]) {
    const valor = String(formData.get(`modelo_${tarefa}`) ?? "");
    const erro = await salvarModeloDaTarefa(tarefa, valor);
    if (erro) return { error: `${tarefa}: ${erro}` };
  }
  revalidatePath("/app/estudio");
  return { ok: "Modelos salvos." };
}
