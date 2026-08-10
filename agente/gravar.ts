// Pontua as empresas coletadas e grava no Supabase. Compartilhado pelo
// comando manual e pelo serviço da fila.

import type { SupabaseClient } from "@supabase/supabase-js";

import { calcularPotencial, ehEnderecoSocial } from "../lib/prospeccao/score.ts";
import { analisarSite } from "../lib/prospeccao/site.ts";
import type { EmpresaEncontrada } from "../lib/prospeccao/tipos.ts";

export type Resumo = { gravadas: number; oportunidades: number; quentes: number };

export async function pontuarEGravar(
  supabase: SupabaseClient,
  orgId: string,
  nicho: string,
  local: string,
  empresas: EmpresaEncontrada[],
  log: (m: string) => void = () => {},
): Promise<Resumo> {
  if (empresas.length === 0) return { gravadas: 0, oportunidades: 0, quentes: 0 };

  log("conferindo os sites…");
  const analises = await Promise.all(
    empresas.map((e) =>
      e.website && !ehEnderecoSocial(e.website)
        ? analisarSite(e.website).catch(() => null)
        : Promise.resolve(null),
    ),
  );

  const linhas = empresas.map((e, i) => {
    const p = calcularPotencial(e, nicho, analises[i]);
    return {
      org_id: orgId,
      fonte: "google",
      fonte_id: e.fonte_id,
      nome: e.nome,
      categoria: e.categoria ?? null,
      endereco: e.endereco ?? null,
      telefone: e.telefone ?? null,
      website: e.website ?? null,
      nicho_busca: nicho,
      local_busca: local,
      situacao: p.situacao,
      pontuacao: p.pontuacao,
      eixos: p.eixos,
      motivos: p.motivos,
      avaliacoes: e.avaliacoes ?? null,
      nota_media: e.notaMedia ?? null,
      fonte_url: e.fonteUrl ?? null,
    };
  });

  // ignoreDuplicates: false atualiza os dados da empresa, mas o status do
  // funil (contactado/fechou) fica intacto — não está na lista de colunas.
  const { error } = await supabase
    .from("prospeccao")
    .upsert(linhas, { onConflict: "org_id,fonte,fonte_id", ignoreDuplicates: false });
  if (error) throw new Error(`Falha ao gravar: ${error.message}`);

  return {
    gravadas: linhas.length,
    oportunidades: linhas.filter((l) => l.situacao !== "site_moderno").length,
    quentes: linhas.filter((l) => l.pontuacao >= 75).length,
  };
}
