import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { funcaoLigada } from "@/lib/painel/flags";
import { gerarPaginaAutomatica } from "@/lib/ia/gerarAuto";
import { montarBriefingDoProspecto } from "./briefing";
import { slugify } from "@/lib/format";
import type { ProspectoRow } from "./tipos";

/*
 * O Fechador: o lead respondeu com interesse → o site dele nasce e a mensagem
 * com o link entra na fila de envio.
 *
 * A entrega reaproveita o carteiro que já existe: a mensagem de fechamento é
 * uma linha em prospeccao_mensagens (tipo 'fechamento'), e o MESMO agente que
 * manda a abordagem manda o link — com o mesmo ritmo humano e o mesmo limite
 * diário. Nível 'preparar' entra como modo 'semi' (aparece em "Prontas para
 * você enviar", o humano dá o clique); nível 'fechar' entra como 'auto'.
 *
 * Ordem das travas, da mais barata para a mais cara:
 *   interruptor do dono → nível do cliente → já tem fechamento? → teto do mês
 * — só então o dinheiro é gasto.
 */

export const CUSTO_ESTIMADO_SITE_MICRO = 550_000; // ~US$0,55, o mesmo da tela

const MENSAGEM_PADRAO =
  "Que bom! 😊 Preparei uma prévia rápida para a {empresa}, já com as fotos de vocês: {link}\n\nDá uma olhada e me diz o que achou — qualquer ajuste é rápido de fazer.";

function montarMensagemFechamento(modelo: string | null, empresa: string, link: string): string {
  return (modelo?.trim() || MENSAGEM_PADRAO)
    .replaceAll("{empresa}", empresa)
    .replaceAll("{link}", link);
}

type ConfigFechador = {
  fechador_nivel: "desligado" | "avisar" | "preparar" | "fechar";
  fechador_teto_micro: number;
  fechador_gasto_micro: number;
  fechador_mes: string | null;
  fechador_msg_modelo: string | null;
  fechador_autorizado_em: string | null;
};

export async function dispararFechador(orgId: string, prospectoId: string): Promise<void> {
  try {
    if (!(await funcaoLigada("fechador"))) return;

    const admin = createAdminClient();
    const { data: cfgRaw } = await admin
      .from("prospeccao_config")
      .select(
        "fechador_nivel, fechador_teto_micro, fechador_gasto_micro, fechador_mes, fechador_msg_modelo, fechador_autorizado_em",
      )
      .eq("org_id", orgId)
      .maybeSingle();
    const cfg = cfgRaw as ConfigFechador | null;
    if (!cfg) return;

    const nivel = cfg.fechador_nivel;
    if (nivel === "desligado" || nivel === "avisar") return;
    // 'fechar' sem o de acordo datado não fecha nada: mandar mensagem sozinho
    // no WhatsApp de alguém exige um sim explícito, não um select esquecido.
    if (nivel === "fechar" && !cfg.fechador_autorizado_em) return;

    // Um fechamento por prospecto, para sempre — robô não martela lead.
    const { count: jaTem } = await admin
      .from("prospeccao_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("prospecto_id", prospectoId)
      .eq("tipo", "fechamento");
    if ((jaTem ?? 0) > 0) return;

    const { data: pRaw } = await admin
      .from("prospeccao")
      .select("*")
      .eq("id", prospectoId)
      .eq("org_id", orgId)
      .maybeSingle();
    const p = pRaw as ProspectoRow | null;
    if (!p || p.nao_perturbar) return;
    const telefone = (p.telefone ?? "").replace(/\D/g, "");
    if (!telefone) return;

    /*
     * O teto do mês. Zera na virada e conta o gasto ANTES de gastar, pela
     * estimativa — reservar primeiro e acertar depois evita que duas respostas
     * no mesmo minuto estourem o teto juntas.
     */
    const mesAtual = new Date().toISOString().slice(0, 8) + "01";
    let gasto = cfg.fechador_gasto_micro ?? 0;
    if (cfg.fechador_mes !== mesAtual) gasto = 0;
    if (gasto + CUSTO_ESTIMADO_SITE_MICRO > (cfg.fechador_teto_micro ?? 0)) {
      await admin
        .from("prospeccao")
        .update({
          anotacao:
            "🔥 Respondeu com interesse, mas o teto mensal do Fechador foi atingido — gere o site pelo botão quando quiser.",
        })
        .eq("id", prospectoId);
      return;
    }
    await admin
      .from("prospeccao_config")
      .update({ fechador_gasto_micro: gasto + CUSTO_ESTIMADO_SITE_MICRO, fechador_mes: mesAtual })
      .eq("org_id", orgId);

    // A página: reaproveita a existente ou cria uma nova já vinculada.
    let siteId = p.site_ia_id;
    let slug: string | null = null;
    if (siteId) {
      const { data: s } = await admin
        .from("sites_ia")
        .select("id, slug")
        .eq("id", siteId)
        .maybeSingle();
      slug = (s as { slug: string } | null)?.slug ?? null;
    }
    if (!siteId || !slug) {
      const novoSlug = `${slugify(p.nome) || "site"}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: nova } = await admin
        .from("sites_ia")
        .insert({ org_id: orgId, titulo: p.nome, slug: novoSlug, prospecto_id: p.id })
        .select("id, slug")
        .single();
      const criada = nova as { id: string; slug: string } | null;
      if (!criada) return;
      siteId = criada.id;
      slug = criada.slug;
      await admin.from("prospeccao").update({ site_ia_id: siteId }).eq("id", p.id);
    }

    const r = await gerarPaginaAutomatica(orgId, siteId, montarBriefingDoProspecto(p));
    if (!r.ok) {
      // Devolve a reserva e deixa o recado — o humano gera pelo botão.
      await admin
        .from("prospeccao_config")
        .update({ fechador_gasto_micro: gasto, fechador_mes: mesAtual })
        .eq("org_id", orgId);
      await admin
        .from("prospeccao")
        .update({ anotacao: `🔥 Respondeu com interesse! (site automático falhou: ${r.motivo})` })
        .eq("id", prospectoId);
      return;
    }
    // Acerta a reserva pelo custo real.
    await admin
      .from("prospeccao_config")
      .update({ fechador_gasto_micro: gasto + r.custo, fechador_mes: mesAtual })
      .eq("org_id", orgId);

    /*
     * O link enviado é ÚNICO deste lead (/p/codigo) — é o que liga o
     * Termômetro: toda abertura daquele endereço é dele. O código nasce uma
     * vez e não muda; se a coluna ainda não existir (migração pendente), cai
     * no endereço interno comum, sem medir mas sem quebrar o envio.
     */
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    let link = `${base}/ia/${slug}`;
    let codigo = (p as { link_codigo?: string | null }).link_codigo ?? null;
    if (!codigo) {
      codigo = Math.random().toString(36).slice(2, 10);
      const { error: eCod } = await admin
        .from("prospeccao")
        .update({ link_codigo: codigo })
        .eq("id", p.id);
      if (eCod) codigo = null;
    }
    if (codigo) link = `${base}/p/${codigo}`;
    const texto = montarMensagemFechamento(cfg.fechador_msg_modelo, p.nome, link);

    const { error } = await admin.from("prospeccao_mensagens").insert({
      org_id: orgId,
      prospecto_id: prospectoId,
      telefone,
      texto,
      tipo: "fechamento",
      modo: nivel === "fechar" ? "auto" : "semi",
      status: "pendente",
    });
    // 23505 = outro gatilho chegou primeiro. Um fechamento só, então tudo certo.
    if (error && error.code !== "23505") {
      console.error("[fechador] falha ao enfileirar:", error.message);
    }
  } catch (e) {
    // O Fechador é bônus em cima da escuta: falhar aqui não pode derrubar a
    // gravação da resposta, que já aconteceu.
    console.error("[fechador]", (e as Error).message);
  }
}
