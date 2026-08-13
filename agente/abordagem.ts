/*
 * Rotina de abordagem por WhatsApp do agente.
 *
 * Roda dentro do serviço, entre uma busca e outra. Só envia o que está na
 * fila em modo 'auto' — o modo 'semi' é você quem manda, pelo painel.
 *
 * A sessão do WhatsApp é do dono do agente: cada cliente conecta o número
 * dele, na máquina dele. Ninguém compartilha número com ninguém.
 */

import type { Page } from "playwright";
import fs from "node:fs/promises";

import * as api from "./api.ts";
import {
  abrirWhatsapp,
  aguardarConexao,
  enviarMensagem,
  PERFIL_ZAP,
  type EstadoZap,
} from "./whatsapp.ts";

/*
 * UMA mensagem por chamada, e o relógio guardado aqui fora.
 *
 * Antes esta rotina ficava num laço próprio: mandava, esperava sete minutos,
 * mandava de novo. Enquanto isso o agente não olhava a fila de buscas — com
 * vinte mensagens pendentes, uma pesquisa do Google esperava horas para ser
 * atendida, e o painel dizia que nenhum agente tinha pegado tarefa.
 *
 * Agora ela sai depois de cada envio e o serviço volta a checar a fila. O
 * intervalo entre mensagens continua igual: quem controla é este carimbo.
 */
let proximoEnvioEm = 0;

// Sessão viva entre uma volta e outra do serviço: reabrir o navegador a cada
// mensagem seria lento e chamaria atenção.
let sessao: { page: Page; fechar: () => Promise<void> } | null = null;

// Não vale perguntar o estado da abordagem a cada volta de 8s do serviço.
let proximaChecagemEm = 0;

export async function rodarAbordagem(headless: boolean, log: (m: string) => void): Promise<void> {
  const agoraMs = Date.now();
  // Ainda no intervalo entre mensagens: nada a fazer, e a fila de buscas
  // continua sendo atendida normalmente pelo serviço.
  if (agoraMs < proximoEnvioEm && agoraMs < proximaChecagemEm) return;
  proximaChecagemEm = agoraMs + 20_000;

  const { config: cfg, enviadasHoje, pendentes } = await api.abordagemEstado();

  // Pedido de desconexão vem primeiro: apaga a sessão para poder entrar com
  // outro número.
  if (cfg.desconectar_pedido) {
    log("desconectando o WhatsApp e apagando a sessão…");
    if (sessao) {
      await sessao.fechar().catch(() => {});
      sessao = null;
    }
    // Sem apagar o perfil, o WhatsApp entraria de novo com o mesmo número.
    await fs.rm(PERFIL_ZAP, { recursive: true, force: true }).catch(() => {});
    await api.zapDesconectado();
    return;
  }

  // Duas razões para abrir o WhatsApp: o painel pediu conexão (status
  // 'aguardando_qr') ou existe mensagem esperando na fila.
  const pedidoConexao = cfg.whatsapp_status === "aguardando_qr";
  if (!pedidoConexao && pendentes === 0) return;

  // Só um pedido de conexão, com a sessão já de pé: nada a fazer além de
  // confirmar no painel.
  if (pedidoConexao && sessao && pendentes === 0) {
    await api.zapEstado("conectado", "WhatsApp já está conectado.", null);
    return;
  }

  // O limite só bloqueia envio; um pedido de conexão passa, senão você não
  // conseguiria reconectar depois de bater a cota do dia.
  if (!pedidoConexao && enviadasHoje >= cfg.limite_diario) {
    log(`limite diário atingido (${enviadasHoje}/${cfg.limite_diario}) — abordagem pausada até amanhã`);
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
        await api.zapEstado("aguardando_qr", undefined, qr);
      },
      async (estado: EstadoZap, msg?: string) => {
        await api.zapEstado(estado, msg, estado === "conectado" ? null : undefined);
      },
      log,
    );

    if (!conectou) {
      await sessao.fechar().catch(() => {});
      sessao = null;
      return;
    }
  } else if (pedidoConexao) {
    // Sessão já estava aberta quando o painel pediu conexão.
    await api.zapEstado("conectado", "WhatsApp conectado.", null);
  }

  // Era só para conectar — sem mensagem na fila, o trabalho acaba aqui.
  if (pendentes === 0) return;

  // Ainda dentro do intervalo da mensagem anterior.
  if (Date.now() < proximoEnvioEm) return;

  const msg = await api.proximaMensagem();
  if (!msg) return;

  const r = await enviarMensagem(sessao.page, msg.telefone, msg.texto);

  if (r.ok) {
    await api.fimMensagem({ id: msg.id, prospecto_id: msg.prospecto_id, ok: true });
    log(`✉️  enviada para ${msg.telefone} (${enviadasHoje + 1}/${cfg.limite_diario} hoje)`);
  } else {
    await api.fimMensagem({ id: msg.id, ok: false, semWhatsapp: r.semWhatsapp, erro: r.motivo });
    log(`⚠️  ${msg.telefone}: ${r.motivo}`);

    if (r.pararTudo) {
      // Sessão caiu: derruba o navegador para reconectar (e mostrar o QR de
      // novo) na próxima volta, em vez de insistir e queimar o número.
      await api.zapEstado("desconectado", r.motivo, null);
      await sessao.fechar().catch(() => {});
      sessao = null;
      return;
    }
  }

  // Intervalo aleatório: cadência regular é o que denuncia robô.
  const s = cfg.intervalo_min_s + Math.random() * (cfg.intervalo_max_s - cfg.intervalo_min_s);
  proximoEnvioEm = Date.now() + s * 1000;
  proximaChecagemEm = proximoEnvioEm;
  log(`próxima mensagem em ${Math.round(s)}s (a fila de buscas segue normal)`);
}
