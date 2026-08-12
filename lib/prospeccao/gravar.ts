import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { calcularPotencial, ehEnderecoSocial } from "./score";
import { analisarSite } from "./site";
import type { EmpresaEncontrada } from "./tipos";

/*
 * Pontua as empresas que o agente encontrou e grava.
 *
 * Mora no servidor, e não no agente, de propósito: a nota é a régua que decide
 * quem vale a pena abordar. Se rodasse na máquina do cliente, cada um teria a
 * régua da versão que instalou — e um cliente com o agente velho veria notas
 * diferentes das do painel, sem ninguém entender por quê.
 */

export type Resumo = { gravadas: number; oportunidades: number; quentes: number };

export async function pontuarEGravar(
  orgId: string,
  nicho: string,
  local: string,
  empresas: EmpresaEncontrada[],
): Promise<Resumo> {
  if (!Array.isArray(empresas) || empresas.length === 0) {
    return { gravadas: 0, oportunidades: 0, quentes: 0 };
  }

  // Só analisa site que existe e não é rede social.
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
  const admin = createAdminClient();
  const { error } = await admin
    .from("prospeccao")
    .upsert(linhas, { onConflict: "org_id,fonte,fonte_id", ignoreDuplicates: false });
  if (error) throw new Error(`Falha ao gravar: ${error.message}`);

  return {
    gravadas: linhas.length,
    oportunidades: linhas.filter((l) => l.situacao !== "site_moderno").length,
    quentes: linhas.filter((l) => l.pontuacao >= 75).length,
  };
}
