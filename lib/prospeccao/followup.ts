import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { funcaoLigada } from "@/lib/painel/flags";
import { montarMensagem, MODELO_FOLLOWUP_PADRAO, type DadosEmpresa } from "./mensagem";
import type { ProspectoRow } from "./tipos";

/*
 * Follow-up automático: a segunda (e ÚNICA) mensagem para quem ficou em
 * silêncio.
 *
 * A maior parte das vendas não morre no "não" — morre no esquecimento. Uma
 * segunda mensagem alguns dias depois recupera uma parte real desses leads,
 * porque a primeira chegou num dia corrido e afundou na lista.
 *
 * O que este arquivo NUNCA faz, e é o que separa follow-up de perseguição:
 *   - segunda insistência: um follow-up por prospecto, garantido por índice;
 *   - falar com quem respondeu qualquer coisa (aí quem conduz é o humano);
 *   - falar com quem pediu para não receber (nao_perturbar);
 *   - mandar antes do prazo que o cliente escolheu.
 *
 * A entrega é a mesma de sempre: uma linha em prospeccao_mensagens, no mesmo
 * modo (auto/semi) da abordagem que a originou, com o mesmo ritmo humano e o
 * mesmo limite diário. Este módulo só decide QUEM e O QUE.
 */

// Uma varredura por hora, por conta: o agente pergunta o estado a cada 20s.
const INTERVALO_VARREDURA_MS = 60 * 60_000;

type ConfigFollowup = {
  followup_ligado: boolean;
  followup_dias: number;
  followup_msg_modelo: string | null;
  followup_rodou_em: string | null;
  remetente_nome: string | null;
};

/*
 * Enfileira os follow-ups vencidos. Devolve quantos entraram.
 *
 * Chamada de dentro do estado do agente: barata quando não é hora (uma
 * leitura de config) e silenciosa em qualquer falha — follow-up é bônus,
 * não pode atrapalhar o envio que já está andando.
 */
export async function prepararFollowups(orgId: string): Promise<number> {
  try {
    if (!(await funcaoLigada("followup"))) return 0;

    const admin = createAdminClient();
    const { data: cfgRaw, error: cfgErr } = await admin
      .from("prospeccao_config")
      .select("followup_ligado, followup_dias, followup_msg_modelo, followup_rodou_em, remetente_nome")
      .eq("org_id", orgId)
      .maybeSingle();
    // Erro aqui = migração pendente. A função simplesmente ainda não existe.
    if (cfgErr || !cfgRaw) return 0;
    const cfg = cfgRaw as ConfigFollowup;
    if (!cfg.followup_ligado) return 0;

    const agora = Date.now();
    if (cfg.followup_rodou_em && agora - new Date(cfg.followup_rodou_em).getTime() < INTERVALO_VARREDURA_MS) {
      return 0;
    }
    // Marca a varredura ANTES de trabalhar: dois agentes da mesma conta não
    // varrem juntos, e uma falha no meio não gera enxurrada de tentativas.
    const { data: vez } = await admin
      .from("prospeccao_config")
      .update({ followup_rodou_em: new Date().toISOString() })
      .eq("org_id", orgId)
      .or(
        cfg.followup_rodou_em
          ? `followup_rodou_em.is.null,followup_rodou_em.eq.${cfg.followup_rodou_em}`
          : "followup_rodou_em.is.null",
      )
      .select("org_id");
    if (!vez || vez.length === 0) return 0;

    const dias = Math.min(30, Math.max(1, cfg.followup_dias ?? 4));
    const corte = new Date(agora - dias * 86_400_000).toISOString();

    /*
     * Candidatos: abordagens entregues, sem resposta, vencidas. O teto de 30
     * dias evita ressuscitar lead de dois meses atrás no dia em que o cliente
     * ligar a função — mensagem assim chega como "quem é você?".
     */
    const { data: abordagensRaw } = await admin
      .from("prospeccao_mensagens")
      .select("prospecto_id, telefone, modo")
      .eq("org_id", orgId)
      .eq("tipo", "abordagem")
      .eq("status", "enviada")
      .is("resposta_em", null)
      .lte("enviada_em", corte)
      .gte("enviada_em", new Date(agora - 30 * 86_400_000).toISOString())
      .limit(200);
    const abordagens =
      (abordagensRaw as { prospecto_id: string; telefone: string; modo: string }[] | null) ?? [];
    if (abordagens.length === 0) return 0;

    const ids = [...new Set(abordagens.map((a) => a.prospecto_id))];

    // Quem já tem follow-up sai da lista (o índice é a rede; isto evita
    // 200 inserts condenados a colidir).
    const { data: jaRaw } = await admin
      .from("prospeccao_mensagens")
      .select("prospecto_id")
      .eq("org_id", orgId)
      .eq("tipo", "followup")
      .in("prospecto_id", ids);
    const jaTem = new Set(((jaRaw as { prospecto_id: string }[] | null) ?? []).map((l) => l.prospecto_id));

    const { data: prospRaw } = await admin
      .from("prospeccao")
      .select("*")
      .eq("org_id", orgId)
      .in("id", ids.filter((id) => !jaTem.has(id)));
    const prospectos = (prospRaw as ProspectoRow[] | null) ?? [];
    const porId = new Map(prospectos.map((p) => [p.id, p]));

    const modelo = cfg.followup_msg_modelo?.trim() || MODELO_FOLLOWUP_PADRAO;
    const remetente = (cfg.remetente_nome ?? "").trim();

    const linhas: Record<string, unknown>[] = [];
    for (const a of abordagens) {
      if (jaTem.has(a.prospecto_id)) continue;
      const p = porId.get(a.prospecto_id);
      // Opt-out e "já conversou" são travas de servidor, não de tela.
      if (!p || p.nao_perturbar) continue;
      if (p.status === "respondeu" || p.status === "fechou" || p.status === "descartado") continue;

      linhas.push({
        org_id: orgId,
        prospecto_id: p.id,
        telefone: a.telefone,
        // A chave do sorteio muda ("fu::"), então o follow-up não repete as
        // mesmas escolhas de [a|b] da primeira mensagem — pareceria cópia.
        texto: montarMensagem(modelo, p as DadosEmpresa, `fu::${p.id}`, remetente),
        tipo: "followup",
        modo: a.modo === "semi" ? "semi" : "auto",
        status: "pendente",
      });
      // Um mesmo prospecto não pode entrar duas vezes no mesmo lote.
      jaTem.add(a.prospecto_id);
    }
    if (linhas.length === 0) return 0;

    const { error } = await admin.from("prospeccao_mensagens").insert(linhas);
    // 23505 = o índice pegou uma corrida. Exatamente o que ele existe para fazer.
    if (error && error.code !== "23505") {
      console.error("[followup] falha ao enfileirar:", error.message);
      return 0;
    }
    return linhas.length;
  } catch (e) {
    console.error("[followup]", (e as Error).message);
    return 0;
  }
}
