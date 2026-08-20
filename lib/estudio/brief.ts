import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/*
 * O que não muda de vídeo para vídeo.
 *
 * Quem assiste e o que você pede no fim são quase sempre os mesmos — pedir
 * isso a cada roteiro seria formulário chato de preencher e, pior, ninguém
 * preenche: fica em branco, o modelo escreve no vácuo e o roteiro sai
 * genérico. Então isso vira AJUSTE, escrito uma vez, e o formulário de cada
 * vídeo só pergunta o que de fato muda: o assunto e o ângulo.
 */

export type BriefPadrao = { publico: string; cta: string };

const CHAVES = { publico: "estudio_publico", cta: "estudio_cta" } as const;

export async function briefPadrao(): Promise<BriefPadrao> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("config_sistema")
    .select("chave, valor")
    .in("chave", [CHAVES.publico, CHAVES.cta]);

  const linhas = (data ?? []) as { chave: string; valor: string }[];
  const achar = (c: string) => linhas.find((l) => l.chave === c)?.valor?.trim() ?? "";
  return { publico: achar(CHAVES.publico), cta: achar(CHAVES.cta) };
}

export async function salvarBriefPadrao(b: BriefPadrao): Promise<string | null> {
  const admin = createAdminClient();
  const { error } = await admin.from("config_sistema").upsert(
    [
      { chave: CHAVES.publico, valor: b.publico.trim().slice(0, 400) },
      { chave: CHAVES.cta, valor: b.cta.trim().slice(0, 400) },
    ],
    { onConflict: "chave" },
  );
  return error ? error.message : null;
}
