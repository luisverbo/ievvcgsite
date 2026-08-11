/*
 * Rotina de abordagem por WhatsApp do agente.
 *
 * Roda dentro do serviço, entre uma busca e outra. Só envia o que está na
 * fila em modo 'auto' — o modo 'semi' é você quem manda, pelo painel.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "playwright";

import fs from "node:fs/promises";

import {
  abrirWhatsapp,
  aguardarConexao,
  enviarMensagem,
  PERFIL_ZAP,
  type EstadoZap,
} from "./whatsapp.ts";

type Config = {
  org_id: string;
  limite_diario: number;
  intervalo_min_s: number;
  intervalo_max_s: number;
  whatsapp_status: EstadoZap;
};

type Pendente = {
  id: string;
  org_id: string;
  prospecto_id: string;
  telefone: string;
  texto: string;
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const agora = () => new Date().toISOString();

// Sessão viva entre uma volta e outra do serviço: reabrir o navegador a cada
// mensagem seria lento e chamaria atenção.
let sessao: { page: Page; fechar: () => Promise<void> } | null = null;

async function gravarEstado(
  supabase: SupabaseClient,
  orgId: string,
  estado: EstadoZap,
  msg?: string,
  qr?: string | null,
) {
  await supabase.from("prospeccao_config").upsert(
    {
      org_id: orgId,
      whatsapp_status: estado,
      whatsapp_mensagem: msg ?? null,
      ...(qr !== undefined ? { whatsapp_qr: qr } : {}),
      whatsapp_em: agora(),
    },
    { onConflict: "org_id" },
  );
}

// Quantas já saíram hoje, para respeitar o limite diário.
async function enviadasHoje(supabase: SupabaseClient, orgId: string): Promise<number> {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("prospeccao_mensagens")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "enviada")
    .gte("enviada_em", inicioDia.toISOString());
  return count ?? 0;
}

export async function rodarAbordagem(
  supabase: SupabaseClient,
  headless: boolean,
  log: (m: string) => void,
): Promise<void> {
  // Pedido de desconexão vem primeiro: apaga a sessão para poder entrar com
  // outro número.
  const { data: sairRaw } = await supabase
    .from("prospeccao_config")
    .select("org_id")
    .eq("desconectar_pedido", true)
    .limit(1)
    .maybeSingle();

  if (sairRaw) {
    const orgSaida = (sairRaw as { org_id: string }).org_id;
    log("desconectando o WhatsApp e apagando a sessão…");
    if (sessao) {
      await sessao.fechar().catch(() => {});
      sessao = null;
    }
    // Sem apagar o perfil, o WhatsApp entraria de novo com o mesmo número.
    await fs.rm(PERFIL_ZAP, { recursive: true, force: true }).catch(() => {});
    await supabase
      .from("prospeccao_config")
      .update({
        desconectar_pedido: false,
        whatsapp_status: "desconectado",
        whatsapp_qr: null,
        whatsapp_mensagem: "Desconectado. Clique em Conectar para entrar com outro número.",
        whatsapp_em: agora(),
      })
      .eq("org_id", orgSaida);
    return;
  }

  // Duas razões para abrir o WhatsApp: o painel pediu conexão (status
  // 'aguardando_qr') ou existe mensagem esperando na fila.
  const { data: pedidoRaw } = await supabase
    .from("prospeccao_config")
    .select("org_id, limite_diario, intervalo_min_s, intervalo_max_s, whatsapp_status")
    .eq("whatsapp_status", "aguardando_qr")
    .limit(1)
    .maybeSingle();
  const pedido = pedidoRaw as Config | null;

  const { data: pendRaw } = await supabase
    .from("prospeccao_mensagens")
    .select("id, org_id, prospecto_id, telefone, texto")
    .eq("status", "pendente")
    .eq("modo", "auto")
    .order("created_at")
    .limit(1);
  const primeira = (pendRaw as Pendente[] | null)?.[0];

  const orgId = pedido?.org_id ?? primeira?.org_id;
  if (!orgId) return; // nada a conectar nem a enviar

  let cfg = pedido;
  if (!cfg) {
    const { data: cfgRaw } = await supabase
      .from("prospeccao_config")
      .select("org_id, limite_diario, intervalo_min_s, intervalo_max_s, whatsapp_status")
      .eq("org_id", orgId)
      .maybeSingle();
    cfg = (cfgRaw as Config | null) ?? {
      org_id: orgId,
      limite_diario: 20,
      intervalo_min_s: 45,
      intervalo_max_s: 150,
      whatsapp_status: "desconectado",
    };
  }

  // Só um pedido de conexão, com a sessão já de pé: nada a fazer além de
  // confirmar no painel.
  if (pedido && sessao && !primeira) {
    await gravarEstado(supabase, cfg.org_id, "conectado", "WhatsApp já está conectado.", null);
    return;
  }

  const jaHoje = await enviadasHoje(supabase, cfg.org_id);
  // O limite só bloqueia envio; um pedido de conexão passa, senão você não
  // conseguiria reconectar depois de bater a cota do dia.
  if (!pedido && jaHoje >= cfg.limite_diario) {
    log(`limite diário atingido (${jaHoje}/${cfg.limite_diario}) — abordagem pausada até amanhã`);
    return;
  }

  // Abre (ou reaproveita) a sessão do WhatsApp.
  if (!sessao) {
    log("abrindo o WhatsApp Web…");
    const { ctx, page } = await abrirWhatsapp(headless);
    sessao = { page, fechar: () => ctx.close() };

    const conectou = await aguardarConexao(
      page,
      async (qr, telaInteira) => {
        log(
          telaInteira
            ? "não reconheci o QR — mandei a tela do WhatsApp para o painel"
            : "QR gerado — leia no painel, em Prospecção › Abordagem",
        );
        await supabase
          .from("prospeccao_config")
          .upsert({ org_id: cfg.org_id, whatsapp_qr: qr }, { onConflict: "org_id" });
      },
      async (estado, msg) => {
        await gravarEstado(supabase, cfg.org_id, estado, msg, estado === "conectado" ? null : undefined);
      },
      log,
    );

    if (!conectou) {
      await sessao.fechar().catch(() => {});
      sessao = null;
      return;
    }
  } else if (pedido) {
    // Sessão já estava aberta quando o painel pediu conexão.
    await gravarEstado(supabase, cfg.org_id, "conectado", "WhatsApp conectado.", null);
  }

  // Era só para conectar — sem mensagem na fila, o trabalho acaba aqui.
  if (!primeira) return;

  const page = sessao.page;
  let enviadas = jaHoje;

  for (;;) {
    if (enviadas >= cfg.limite_diario) {
      log(`limite diário atingido (${enviadas}/${cfg.limite_diario})`);
      break;
    }

    const { data } = await supabase
      .from("prospeccao_mensagens")
      .select("id, org_id, prospecto_id, telefone, texto")
      .eq("status", "pendente")
      .eq("modo", "auto")
      .eq("org_id", cfg.org_id)
      .order("created_at")
      .limit(1);
    const msg = (data as Pendente[] | null)?.[0];
    if (!msg) break;

    const r = await enviarMensagem(page, msg.telefone, msg.texto);

    if (r.ok) {
      enviadas++;
      await supabase
        .from("prospeccao_mensagens")
        .update({ status: "enviada", enviada_em: agora(), agente: process.env.AGENTE_NOME || "agente" })
        .eq("id", msg.id);
      await supabase
        .from("prospeccao")
        .update({ status: "contactado", contactado_em: agora() })
        .eq("id", msg.prospecto_id);
      log(`✉️  enviada para ${msg.telefone} (${enviadas}/${cfg.limite_diario} hoje)`);
    } else {
      await supabase
        .from("prospeccao_mensagens")
        .update({ status: r.semWhatsapp ? "sem_whatsapp" : "erro", erro: r.motivo })
        .eq("id", msg.id);
      log(`⚠️  ${msg.telefone}: ${r.motivo}`);

      if (r.pararTudo) {
        // Sessão caiu: derruba o navegador para reconectar (e mostrar o QR de
        // novo) na próxima volta, em vez de insistir e queimar o número.
        await gravarEstado(supabase, cfg.org_id, "desconectado", r.motivo, null);
        await sessao.fechar().catch(() => {});
        sessao = null;
        return;
      }
    }

    // Intervalo aleatório: cadência regular é o que denuncia robô.
    const s = cfg.intervalo_min_s + Math.random() * (cfg.intervalo_max_s - cfg.intervalo_min_s);
    log(`aguardando ${Math.round(s)}s até a próxima`);
    await espera(s * 1000);
  }
}
