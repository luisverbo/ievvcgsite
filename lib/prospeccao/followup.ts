import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { funcaoLigada } from "@/lib/painel/flags";
import {
  montarMensagem,
  MODELO_FOLLOWUP_PADRAO,
  MODELO_FOLLOWUP_PROPRIA,
  type DadosEmpresa,
} from "./mensagem";
import { ofertaDaOrg } from "./oferta";
import type { ProspectoRow } from "./tipos";

/*
 * Remarketing automático: até TRÊS mensagens para quem ficou em silêncio,
 * nos prazos que o dono escolher (a 2ª e a 3ª nascem desligadas).
 *
 * A maior parte das vendas não morre no "não" — morre no esquecimento. Uma
 * mensagem alguns dias depois recupera uma parte real desses leads, porque a
 * primeira chegou num dia corrido e afundou na lista. E o padrão de mercado
 * é claro: a maioria dos fechamentos vem depois do segundo contato.
 *
 * O que este arquivo NUNCA faz, e é o que separa remarketing de perseguição:
 *   - repetir uma etapa: uma mensagem por etapa por prospecto, via índice;
 *   - falar com quem respondeu qualquer coisa (aí quem conduz é o humano);
 *   - falar com quem pediu para não receber (nao_perturbar);
 *   - mandar antes do prazo que o cliente escolheu, nem ressuscitar conversa
 *     com mais de 30 dias desde o último toque.
 *
 * A entrega é a mesma de sempre: uma linha em prospeccao_mensagens, no mesmo
 * modo (auto/semi) da mensagem que a originou, com o mesmo ritmo humano e o
 * mesmo limite diário. Este módulo só decide QUEM e O QUE.
 */

// Uma varredura por hora, por conta: o agente pergunta o estado a cada 20s.
const INTERVALO_VARREDURA_MS = 60 * 60_000;

type ConfigFollowup = {
  followup_ligado: boolean;
  followup_dias: number;
  followup_dias_2: number | null;
  followup_dias_3: number | null;
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
    // select * de propósito: pedir followup_dias_2 pelo nome quebraria a
    // varredura INTEIRA de quem ainda não rodou a migração da cadência —
    // e a etapa 1, que já funcionava, pararia junto.
    const { data: cfgRaw, error: cfgErr } = await admin
      .from("prospeccao_config")
      .select("*")
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

    // No modo Prospector o modelo padrão fala da oferta própria, não do site
    // que não existe. Modelo escrito pelo dono continua mandando nos dois.
    const oferta = await ofertaDaOrg(orgId);
    const padrao = oferta.tipo === "propria" ? MODELO_FOLLOWUP_PROPRIA : MODELO_FOLLOWUP_PADRAO;
    const modelo = cfg.followup_msg_modelo?.trim() || padrao;
    const remetente = (cfg.remetente_nome ?? "").trim();
    const extras = { oferta: oferta.resumo || "o que eu tinha comentado" };

    /*
     * A cadência: cada etapa conta os dias A PARTIR DO TOQUE ANTERIOR —
     * a 1ª depois da abordagem, a 2ª depois da 1ª, a 3ª depois da 2ª. Etapa
     * com 0 dia está desligada, e desligar uma desliga as seguintes (não
     * existe "pular direto para a terceira insistência").
     */
    const etapas = [
      { n: 1, dias: Math.min(30, Math.max(1, cfg.followup_dias ?? 4)) },
      { n: 2, dias: Math.min(30, Math.max(0, cfg.followup_dias_2 ?? 0)) },
      { n: 3, dias: Math.min(30, Math.max(0, cfg.followup_dias_3 ?? 0)) },
    ];

    let total = 0;
    for (const etapa of etapas) {
      if (etapa.n > 1 && etapa.dias === 0) break;
      const corte = new Date(agora - etapa.dias * 86_400_000).toISOString();

      /*
       * Candidatos: o TOQUE ANTERIOR entregue, sem resposta, vencido. O teto
       * de 30 dias evita ressuscitar lead de dois meses atrás no dia em que o
       * cliente ligar a função — mensagem assim chega como "quem é você?".
       */
      let q = admin
        .from("prospeccao_mensagens")
        .select("prospecto_id, telefone, modo")
        .eq("org_id", orgId)
        .eq("status", "enviada")
        .is("resposta_em", null)
        .lte("enviada_em", corte)
        .gte("enviada_em", new Date(agora - 30 * 86_400_000).toISOString())
        .limit(200);
      q =
        etapa.n === 1
          ? q.eq("tipo", "abordagem")
          : q.eq("tipo", "followup").eq("etapa", etapa.n - 1);
      const { data: anterioresRaw } = await q;
      const anteriores =
        (anterioresRaw as { prospecto_id: string; telefone: string; modo: string }[] | null) ?? [];
      if (anteriores.length === 0) continue;

      const ids = [...new Set(anteriores.map((a) => a.prospecto_id))];

      // Quem já tem ESTA etapa sai da lista (o índice é a rede; isto evita
      // 200 inserts condenados a colidir).
      const { data: jaRaw } = await admin
        .from("prospeccao_mensagens")
        .select("prospecto_id")
        .eq("org_id", orgId)
        .eq("tipo", "followup")
        .eq("etapa", etapa.n)
        .in("prospecto_id", ids);
      const jaTem = new Set(
        ((jaRaw as { prospecto_id: string }[] | null) ?? []).map((l) => l.prospecto_id),
      );

      const { data: prospRaw } = await admin
        .from("prospeccao")
        .select("*")
        .eq("org_id", orgId)
        .in("id", ids.filter((id) => !jaTem.has(id)));
      const prospectos = (prospRaw as ProspectoRow[] | null) ?? [];
      const porId = new Map(prospectos.map((p) => [p.id, p]));

      const linhas: Record<string, unknown>[] = [];
      for (const a of anteriores) {
        if (jaTem.has(a.prospecto_id)) continue;
        const p = porId.get(a.prospecto_id);
        // Opt-out e "já conversou" são travas de servidor, não de tela.
        if (!p || p.nao_perturbar) continue;
        if (p.status === "respondeu" || p.status === "fechou" || p.status === "descartado") continue;

        linhas.push({
          org_id: orgId,
          prospecto_id: p.id,
          telefone: a.telefone,
          // A chave do sorteio muda por etapa ("fu2::"), então cada toque não
          // repete as mesmas escolhas de [a|b] do anterior — pareceria cópia.
          texto: montarMensagem(modelo, p as DadosEmpresa, `fu${etapa.n}::${p.id}`, remetente, extras),
          tipo: "followup",
          etapa: etapa.n,
          modo: a.modo === "semi" ? "semi" : "auto",
          status: "pendente",
        });
        // Um mesmo prospecto não pode entrar duas vezes no mesmo lote.
        jaTem.add(a.prospecto_id);
      }
      if (linhas.length === 0) continue;

      let { error } = await admin.from("prospeccao_mensagens").insert(linhas);
      /*
       * Migração da cadência ainda não rodou? A coluna `etapa` não existe e o
       * insert falha inteiro. A etapa 1 não pode parar por isso — ela já
       * funcionava antes da cadência. Tira o campo e insere como antes; as
       * etapas 2 e 3 ficam para depois do SQL, o que é o comportamento certo.
       */
      if (error && etapa.n === 1 && /etapa/.test(error.message)) {
        for (const l of linhas) delete l.etapa;
        ({ error } = await admin.from("prospeccao_mensagens").insert(linhas));
      }
      // 23505 = o índice pegou uma corrida. Exatamente o que ele existe para fazer.
      if (error && error.code !== "23505") {
        console.error(`[followup] etapa ${etapa.n} falhou ao enfileirar:`, error.message);
        continue;
      }
      if (!error) total += linhas.length;
    }
    return total;
  } catch (e) {
    console.error("[followup]", (e as Error).message);
    return 0;
  }
}
