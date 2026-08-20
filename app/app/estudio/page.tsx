import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinhaOrg } from "@/lib/painel/queries";
import { ehAdmin } from "@/lib/painel/admin";
import { modeloDaTarefa } from "@/lib/estudio/llm";
import type { Formula } from "@/lib/estudio/dissecar";
import Estudio from "./Estudio";

export const maxDuration = 300;

/*
 * O Estúdio de Vídeos — ferramenta interna, SÓ ADMIN.
 *
 * Etapa 1: garimpo no YouTube com score de outlier + dissecação da fórmula.
 * Etapa 2 (depois): roteiro com a fórmula injetada + fila + render local
 * pelo MoneyPrinterTurbo na máquina do dono.
 */

export type AchadoRow = {
  id: string;
  fonte: "youtube" | "tiktok";
  url: string | null;
  titulo: string | null;
  canal: string | null;
  views: number | null;
  publicado_em: string | null;
  duracao_s: number | null;
  score_outlier: number | null;
  views_por_dia: number | null;
  thumbnail: string | null;
  transcricao: string | null;
  tema: string;
  created_at: string;
};

export type FormulaRow = {
  id: string;
  nome: string;
  tema: string | null;
  formula: Formula;
  achados: string[];
  modelo: string | null;
  created_at: string;
};

export type ProjetoRow = {
  id: string;
  titulo: string;
  tema: string | null;
  roteiro: string | null;
  termos: string[];
  status: "rascunho" | "roteiro_pronto" | "na_fila" | "gerando" | "pronto" | "erro";
  progresso: string | null;
  erro: string | null;
  formato_16x9: boolean;
  duracao_alvo_s: number;
  arquivo: string | null;
  arquivo_16x9: string | null;
  agente: string | null;
  created_at: string;
};

export default async function EstudioPage() {
  if (!(await ehAdmin())) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const admin = createAdminClient();
  const [{ data: achadosRaw }, { data: formulasRaw }, { data: projetosRaw }, mDissec, mRoteiro] = await Promise.all([
    admin
      .from("estudio_achados")
      .select("id, fonte, url, titulo, canal, views, publicado_em, duracao_s, score_outlier, views_por_dia, thumbnail, transcricao, tema, created_at")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("estudio_formulas")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("estudio_projetos")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(40),
    modeloDaTarefa("dissecacao"),
    modeloDaTarefa("roteiro"),
  ]);

  const temYoutubeKey = !!process.env.YOUTUBE_API_KEY;

  return (
    <div className="painel-wrap flex flex-col gap-6">
      <div className="anim-entrada">
        <Link href="/app" className="text-sm text-paper-dim hover:text-paper">
          ← Painel
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Estúdio de Vídeos 🎬</h1>
        <p className="mt-1 max-w-3xl text-sm text-paper-dim">
          Ferramenta sua, invisível para clientes. Garimpe o que está estourando no nicho, disseque
          a fórmula — e (na Etapa 2) gere o vídeo original na sua máquina.
        </p>
      </div>

      {!temYoutubeKey && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          ⚠️ Falta a <b>YOUTUBE_API_KEY</b> na Vercel. Crie em{" "}
          <b>console.cloud.google.com</b> → ative “YouTube Data API v3” → Credenciais → Chave de
          API. Sem ela o garimpo não roda (o resto da tela funciona).
        </div>
      )}

      <Estudio
        achados={(achadosRaw as AchadoRow[] | null) ?? []}
        formulas={(formulasRaw as FormulaRow[] | null) ?? []}
        projetos={(projetosRaw as ProjetoRow[] | null) ?? []}
        modeloDissecacao={`${mDissec.provedor}:${mDissec.modelo}`}
        modeloRoteiro={`${mRoteiro.provedor}:${mRoteiro.modelo}`}
      />
    </div>
  );
}
