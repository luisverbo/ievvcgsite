import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { conversarComIA, ErroIA, modeloValido } from "./anthropic";
import { SYSTEM_CONSTRUTOR, promptInicial } from "./prompt";
import { contaDaOrg, cobrar, podeGastar } from "@/lib/creditos/conta";

/*
 * Gera uma página de IA SEM ninguém olhando — o caminho do Fechador.
 *
 * É o mesmo motor do chat do construtor (mesmo system, mesmo prompt inicial,
 * mesma cobrança), só que sem streaming e sem tela: quem chama é o servidor,
 * quando um lead responde. O resultado fica idêntico ao de uma primeira
 * geração feita à mão — inclusive o histórico: a conversa aparece no chat do
 * construtor como se o dono tivesse pedido, para ele poder CONTINUAR dali
 * ("troca a cor do topo") sem nenhum caso especial.
 *
 * Publica sozinha no fim: o link vai por WhatsApp em seguida, e mandar link
 * de página despublicada seria mandar um 404.
 */

export type ResultadoGeracao =
  | { ok: true; custo: number }
  | { ok: false; motivo: string };

export async function gerarPaginaAutomatica(
  orgId: string,
  siteIaId: string,
  briefing: string,
): Promise<ResultadoGeracao> {
  const admin = createAdminClient();

  const { data: siteRaw } = await admin
    .from("sites_ia")
    .select("id, org_id, html, modelo")
    .eq("id", siteIaId)
    .eq("org_id", orgId)
    .maybeSingle();
  const site = siteRaw as { id: string; org_id: string; html: string | null; modelo: string } | null;
  if (!site) return { ok: false, motivo: "Página não encontrada." };
  // Já tem conteúdo: não regera por cima do trabalho de alguém.
  if (site.html) return { ok: true, custo: 0 };

  const conta = await contaDaOrg(orgId);
  const permissao = podeGastar(conta);
  if (!permissao.ok) return { ok: false, motivo: permissao.motivo };

  const pedido = promptInicial(briefing);
  await admin.from("sites_ia_mensagens").insert({
    site_ia_id: siteIaId,
    org_id: orgId,
    papel: "user",
    conteudo: briefing,
  });

  try {
    const resposta = await conversarComIA({
      key: conta.anthropic!,
      modelo: modeloValido(site.modelo),
      system: SYSTEM_CONSTRUTOR,
      mensagens: [{ papel: "user", conteudo: pedido }],
    });

    const custo = await cobrar({
      conta,
      modelo: modeloValido(site.modelo),
      uso: resposta.uso,
      descricao: "Site automático (Fechador)",
      referenciaTipo: "site_ia",
      referenciaId: siteIaId,
    });

    if (!resposta.html) {
      return { ok: false, motivo: "A IA não devolveu o HTML da página." };
    }

    const agora = new Date().toISOString();
    await Promise.all([
      admin.from("sites_ia_versoes").insert({
        site_ia_id: siteIaId,
        org_id: orgId,
        html: resposta.html,
        resumo: resposta.resumo.slice(0, 500),
      }),
      admin
        .from("sites_ia")
        .update({ html: resposta.html, publicado: true, updated_at: agora })
        .eq("id", siteIaId),
      admin.from("sites_ia_mensagens").insert({
        site_ia_id: siteIaId,
        org_id: orgId,
        papel: "assistant",
        conteudo: resposta.resumo,
      }),
    ]);

    return { ok: true, custo };
  } catch (e) {
    // Tokens da recusa/corte já foram cobrados pela Anthropic — o débito vale.
    if (e instanceof ErroIA) {
      await cobrar({
        conta,
        modelo: modeloValido(site.modelo),
        uso: e.uso,
        descricao: "Site automático interrompido",
        referenciaTipo: "site_ia",
        referenciaId: siteIaId,
      });
    }
    return { ok: false, motivo: e instanceof Error ? e.message : "Falha ao gerar a página." };
  }
}
