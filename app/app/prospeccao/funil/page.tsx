import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMinhaOrg } from "@/lib/painel/queries";
import { podeUsar } from "@/lib/painel/permissoes";
import type { ProspectoRow } from "@/lib/prospeccao/tipos";
import Funil, { type LeadFunil } from "./Funil";

/*
 * O Funil — a prospecção em forma de CRM.
 *
 * A lista responde "quem eu abordo agora?"; o funil responde "onde cada
 * conversa ESTÁ?". São perguntas diferentes, e vendedor faz as duas todo
 * dia — por isso são duas telas sobre os mesmos dados, não uma tela com
 * dois modos espremidos.
 *
 * O quadro é leve de propósito: os cards carregam só o que decide uma ação
 * (nome, reputação, etiqueta, a última resposta) e o arrastar chama a mesma
 * mudarStatus dos botões da lista — nenhuma regra nova, só outra vista.
 */

export const dynamic = "force-dynamic";

export default async function FunilPage() {
  if (!(await podeUsar("prospeccao"))) notFound();
  const org = await getMinhaOrg();
  if (!org) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("prospeccao")
    .select("id, nome, telefone, categoria, avaliacoes, nota_media, etiqueta, status, local_busca, lembrete_em")
    .eq("org_id", org.id)
    .order("updated_at", { ascending: false })
    .limit(400);
  const lista = (data as Pick<
    ProspectoRow,
    "id" | "nome" | "telefone" | "categoria" | "avaliacoes" | "nota_media" | "etiqueta" | "status" | "local_busca" | "lembrete_em"
  >[] | null) ?? [];

  // A última resposta de cada lead — é o que diz o próximo passo no card.
  const respostas = new Map<string, string>();
  if (lista.length > 0) {
    const { data: respRaw } = await supabase
      .from("prospeccao_mensagens")
      .select("prospecto_id, resposta_texto, resposta_em")
      .eq("org_id", org.id)
      .not("resposta_em", "is", null)
      .in("prospecto_id", lista.map((p) => p.id))
      .order("resposta_em", { ascending: false });
    for (const r of (respRaw as { prospecto_id: string; resposta_texto: string | null }[] | null) ?? []) {
      if (r.resposta_texto && !respostas.has(r.prospecto_id)) {
        respostas.set(r.prospecto_id, r.resposta_texto);
      }
    }
  }

  // Respostas rápidas — os botões de copiar nos cards de quem respondeu.
  let respostasRapidas: { t: string; x: string }[] = [];
  {
    const { data: cfgRR } = await supabase
      .from("prospeccao_config")
      .select("respostas_rapidas")
      .eq("org_id", org.id)
      .maybeSingle();
    const bruto = (cfgRR as { respostas_rapidas: { t: string; x: string }[] | null } | null)
      ?.respostas_rapidas;
    if (Array.isArray(bruto)) respostasRapidas = bruto.filter((r) => r?.t && r?.x);
  }

  const leads: LeadFunil[] = lista.map((p) => ({
    id: p.id,
    nome: p.nome,
    telefone: p.telefone,
    categoria: p.categoria,
    avaliacoes: p.avaliacoes,
    nota: p.nota_media,
    etiqueta: p.etiqueta ?? null,
    status: p.status,
    local: p.local_busca,
    lembrete: p.lembrete_em ?? null,
    resposta: respostas.get(p.id) ?? null,
  }));

  return (
    <div className="painel-wrap flex flex-col gap-5 !max-w-none">
      <div className="anim-entrada flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/prospeccao" className="text-sm text-paper-dim hover:text-paper">
            ← Prospecção
          </Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Funil 🗂️</h1>
          <p className="mt-1 text-sm text-paper-dim">
            Arraste os cards entre as colunas — ou toque num card para movê-lo. O quadro e a
            lista mostram as mesmas empresas.
          </p>
        </div>
        <Link
          href="/app/prospeccao"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-paper-dim transition hover:border-brand-2 hover:text-brand-2"
        >
          📋 Ver como lista
        </Link>
      </div>

      <Funil leads={leads} respostasRapidas={respostasRapidas} />
    </div>
  );
}
