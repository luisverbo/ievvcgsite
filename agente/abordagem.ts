/*
 * Rotina de abordagem por WhatsApp do agente.
 *
 * Roda dentro do serviço, entre uma busca e outra. Só envia o que está na
 * fila em modo 'auto' — o modo 'semi' é você quem manda, pelo painel.
 *
 * VÁRIAS LINHAS. Cada número de WhatsApp da conta é uma linha, e cada linha
 * é uma sessão (um navegador, um perfil em disco). Este agente cuida das
 * linhas que são dele — e pega para si as que o painel acabou de pedir para
 * conectar e ninguém segura ainda. Quem decide qual linha manda cada
 * mensagem é o SERVIDOR: aqui cada linha só pergunta "é minha vez?".
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
  lerRespostas,
  PERFIL_ZAP,
  perfilDaLinha,
  type EstadoZap,
} from "./whatsapp.ts";

type Sessao = { page: Page; fechar: () => Promise<void> };

// Uma linha como este agente a vê. A "principal" sem id é o servidor antigo,
// que não sabe de linhas: vale o perfil de sempre.
type Linha = {
  id: string | null;
  nome: string;
  principal: boolean;
  status: string;
  desconectar_pedido: boolean;
  ativa: boolean;
  /* Sem dono, ou dono calado há 15 min: dá para assumir. */
  livre?: boolean;
};

// Não vale perguntar o estado da abordagem a cada volta de 8s do serviço.
let proximaChecagemEm = 0;

/*
 * Servidor antigo (sem linhas) não tem cadência própria: aí o intervalo
 * entre mensagens é guardado aqui, como sempre foi. Com linhas, quem espera
 * o intervalo é o servidor — e esta variável fica em zero.
 */
let proximoEnvioEm = 0;

// A escuta tem relógio próprio POR LINHA: conferir a lista de conversas a
// cada volta seria movimento demais na conta — a cada ~2 minutos é ritmo de gente.
const proximaEscutaEm = new Map<string, number>();

// O aviso de "pausado" sai uma vez por pausa, não a cada 20 segundos.
let pausadoAvisado = false;

// Sessões vivas entre uma volta e outra, por linha: reabrir o navegador a
// cada mensagem seria lento e chamaria atenção.
const sessoes = new Map<string, Sessao>();

const chaveDe = (l: Linha) => l.id ?? "principal";
const perfilDe = (l: Linha) => (l.id && !l.principal ? perfilDaLinha(l.id) : PERFIL_ZAP);

async function existe(caminho: string): Promise<boolean> {
  return fs
    .stat(caminho)
    .then(() => true)
    .catch(() => false);
}

/*
 * Fecha os navegadores do WhatsApp de propósito, na saída do serviço.
 *
 * Sem isto o systemd mandava SIGTERM, o node ignorava, e 90 segundos depois
 * vinha o SIGKILL — que mata o node mas deixa o Chromium órfão SEGURANDO a
 * pasta do perfil. Na volta, o agente novo não conseguia abrir a sessão e
 * pedia QR: toda atualização derrubava o WhatsApp do cliente.
 */
export async function fecharSessaoZap(): Promise<void> {
  const abertas = [...sessoes.values()];
  sessoes.clear();
  await Promise.all(abertas.map((s) => s.fechar().catch(() => {})));
}

async function fecharSessao(chave: string): Promise<void> {
  const s = sessoes.get(chave);
  if (!s) return;
  sessoes.delete(chave);
  await s.fechar().catch(() => {});
}

export async function rodarAbordagem(headless: boolean, log: (m: string) => void): Promise<void> {
  const agoraMs = Date.now();
  // Ainda no intervalo entre mensagens (servidor antigo) ou na folga da
  // checagem: nada a fazer, e a fila de buscas segue normal.
  if (agoraMs < proximoEnvioEm && agoraMs < proximaChecagemEm) return;
  proximaChecagemEm = agoraMs + 20_000;

  const estado = await api.abordagemEstado();
  const { config: cfg, pendentes, aguardando = 0, resumoDevido = false, continuacoes = 0, pausado = false } = estado;

  /*
   * Envio pausado no painel: o agente não manda nada, mas segue ESCUTANDO e
   * conectando — quem pausou o disparo não quer ficar surdo para quem já
   * respondeu. O servidor também não entrega mensagem enquanto isso; este
   * aviso é para o log não ficar mudo e o dono entender por que nada sai.
   */
  if (pausado && !pausadoAvisado) {
    log("⏸️  envio pausado no painel — nenhuma mensagem sai até você retomar");
  }
  pausadoAvisado = pausado;

  /*
   * Quais linhas são minhas. Servidor com linhas: as que têm o meu id, mais
   * as que ninguém segura e o painel pediu para conectar (reivindico — quem
   * chega primeiro leva). A principal sem dono é minha se eu tiver o perfil
   * antigo em disco: é a máquina de sempre voltando depois da migração.
   * Servidor antigo: uma linha só, sem id, com o estado das colunas velhas.
   */
  let minhas: Linha[];
  if (estado.linhas) {
    minhas = [];
    const idsConhecidos = new Set<string>();
    for (const l of estado.linhas) {
      idsConhecidos.add(l.id);
      /*
       * Linha LIVRE (sem dono, ou com um dono que sumiu há 15 min) volta para
       * quem tem a sessão dela em disco. É o que conserta o caso mais chato:
       * o cliente baixa o agente de novo, o token novo vira outro registro, e
       * a linha ficava presa ao agente antigo — painel dizendo "conectado" e
       * nada saindo. Só reivindico o que eu realmente seguro (tenho o perfil)
       * ou o que está pedindo QR agora.
       */
      let minha = l.minha;
      if (!minha && (l.livre ?? l.agente_id === null)) {
        const querConectar = l.status === "aguardando_qr";
        const temPerfil = await existe(l.principal ? PERFIL_ZAP : perfilDaLinha(l.id));
        if (querConectar || temPerfil) {
          minha = await api.linhaReivindicar(l.id).catch(() => false);
          if (minha) log(`📱 ${l.nome}: passa a ser deste agente`);
        }
      }
      if (minha) minhas.push({ ...l });
    }
    // Linha apagada no painel: fecha a sessão e apaga o perfil dela.
    for (const chave of [...sessoes.keys()]) {
      if (chave !== "principal" && !idsConhecidos.has(chave)) {
        log(`linha ${chave.slice(0, 8)} foi removida no painel — fechando`);
        await fecharSessao(chave);
        await fs.rm(perfilDaLinha(chave), { recursive: true, force: true }).catch(() => {});
      }
    }
  } else {
    minhas = [
      {
        id: null,
        nome: "WhatsApp",
        principal: true,
        status: cfg.whatsapp_status,
        desconectar_pedido: cfg.desconectar_pedido,
        ativa: true,
      },
    ];
  }

  const comum = {
    headless,
    log,
    limite: cfg.limite_diario,
    intervaloMin: cfg.intervalo_min_s,
    intervaloMax: cfg.intervalo_max_s,
    pendentes,
    aguardando,
    continuacoes,
    servidorComLinhas: Boolean(estado.linhas),
  };
  // O resumo (ou aviso) do dono sai por UMA linha só — a primeira conectada.
  let resumoPendente = resumoDevido;

  for (const linha of minhas) {
    try {
      const resultado = await atenderLinha(linha, { ...comum, resumo: resumoPendente });
      if (resultado.mandouResumo) resumoPendente = false;
    } catch (e) {
      log(`⚠️  ${linha.nome}: ${(e as Error).message.slice(0, 160)}`);
    }
  }
}

type Comum = {
  headless: boolean;
  log: (m: string) => void;
  limite: number;
  intervaloMin: number;
  intervaloMax: number;
  pendentes: number;
  aguardando: number;
  continuacoes: number;
  resumo: boolean;
  servidorComLinhas: boolean;
};

async function atenderLinha(linha: Linha, c: Comum): Promise<{ mandouResumo: boolean }> {
  const { log } = c;
  const chave = chaveDe(linha);
  const perfil = perfilDe(linha);
  const rotulo = linha.nome;
  const nada = { mandouResumo: false };

  // Pedido de desconexão vem primeiro: apaga a sessão para poder entrar com
  // outro número.
  if (linha.desconectar_pedido) {
    log(`${rotulo}: desconectando o WhatsApp e apagando a sessão…`);
    await fecharSessao(chave);
    // Sem apagar o perfil, o WhatsApp entraria de novo com o mesmo número.
    await fs.rm(perfil, { recursive: true, force: true }).catch(() => {});
    await api.zapDesconectado(linha.id);
    return nada;
  }

  /*
   * Quatro razões para abrir o WhatsApp: o painel pediu conexão, existe
   * mensagem para ENVIAR, existe resposta para ESCUTAR (números abordados
   * ainda sem retorno) — ou é hora do RESUMO diário do dono. Escuta e resumo
   * só reabrem o navegador se a sessão já esteve conectada antes — sem
   * sessão salva, abrir mostraria um QR que ninguém pediu.
   */
  const pedidoConexao = linha.status === "aguardando_qr";
  const conectado = linha.status === "conectado";
  const escutar = c.aguardando > 0 && Date.now() >= (proximaEscutaEm.get(chave) ?? 0) && conectado;
  const resumo = c.resumo && conectado;
  const querEnviar = linha.ativa && (c.pendentes > 0 || c.continuacoes > 0);
  if (!pedidoConexao && !querEnviar && !escutar && !resumo) return nada;

  // Só um pedido de conexão, com a sessão já de pé: nada a fazer além de
  // confirmar no painel.
  if (pedidoConexao && sessoes.has(chave) && !querEnviar && !escutar && !resumo) {
    await api.zapEstado("conectado", "WhatsApp já está conectado.", null, linha.id);
    return nada;
  }

  // Sem sessão, sem perfil salvo e sem pedido: não é hora de abrir nada.
  if (!sessoes.has(chave) && !pedidoConexao && !(await existe(perfil))) return nada;

  // Abre (ou reaproveita) a sessão desta linha.
  let sessao = sessoes.get(chave);
  if (!sessao) {
    log(`${rotulo}: abrindo o WhatsApp Web…`);
    const { ctx, page } = await abrirWhatsapp(c.headless, perfil);
    sessao = { page, fechar: () => ctx.close() };
    sessoes.set(chave, sessao);

    const conectou = await aguardarConexao(
      page,
      async (qr, telaInteira) => {
        log(
          telaInteira
            ? `${rotulo}: não reconheci o QR — mandei a tela do WhatsApp para o painel`
            : `${rotulo}: QR gerado — leia no painel, em Prospecção › Abordagem`,
        );
        await api.zapEstado("aguardando_qr", undefined, qr, linha.id);
      },
      async (estado: EstadoZap, msg?: string) => {
        await api.zapEstado(estado, msg, estado === "conectado" ? null : undefined, linha.id);
      },
      log,
    );

    if (!conectou) {
      await fecharSessao(chave);
      return nada;
    }
  } else if (pedidoConexao) {
    // Sessão já estava aberta quando o painel pediu conexão.
    await api.zapEstado("conectado", "WhatsApp conectado.", null, linha.id);
  }

  /*
   * ESCUTA antes de enviar: quem já respondeu não pode esperar atrás da fila.
   * O relógio próprio (2 min) segura o ritmo; uma falha aqui não derruba o
   * envio — escutar é bônus, mandar é a obrigação.
   */
  if (escutar) {
    proximaEscutaEm.set(chave, Date.now() + 120_000);
    try {
      const numeros = await api.aguardandoResposta(linha.id);
      if (numeros.length > 0) {
        const respostas = await lerRespostas(sessao.page, numeros, log);
        for (const r of respostas) {
          const { classe } = await api.respostaRecebida(r.telefone, r.texto);
          log(`💬 ${r.telefone} respondeu${classe ? ` → ${classe}` : ""} — painel atualizado`);
        }
      }
    } catch (e) {
      log(`${rotulo}: escuta falhou (segue o baile): ${(e as Error).message}`);
    }
  }

  /*
   * O RESUMO do dia (ou um aviso do painel), se for a hora. Pedir o texto já
   * reserva a vez no servidor; se o envio falhar aqui, devolvemos a reserva
   * para a próxima volta tentar de novo.
   */
  let mandouResumo = false;
  if (resumo) {
    try {
      const r = await api.resumoPendente();
      if (r) {
        const env = await enviarMensagem(sessao.page, r.telefone, r.texto);
        if (env.ok) {
          mandouResumo = true;
          log(`📬 ${rotulo}: mensagem ao dono enviada`);
        } else {
          await api.resumoFalhou();
          log(`${rotulo}: mensagem ao dono não saiu (${env.motivo}) — tento de novo em instantes`);
        }
      }
    } catch (e) {
      log(`${rotulo}: resumo falhou (segue o baile): ${(e as Error).message}`);
    }
  }

  if (!querEnviar) return { mandouResumo };
  if (Date.now() < proximoEnvioEm) return { mandouResumo };

  /*
   * "É minha vez?" — o servidor responde com a mensagem, ou com o motivo de
   * esperar (vez de outra linha, dentro do intervalo, limite desta linha).
   * Motivo não é erro: é o revezamento funcionando.
   */
  const { mensagem: msg, motivo } = await api.proximaMensagem(linha.id);
  if (!msg) {
    if (motivo && motivo !== "fila vazia" && motivo !== "dentro do intervalo") {
      log(`${rotulo}: aguardando (${motivo})`);
    }
    return { mandouResumo };
  }

  const r = await enviarMensagem(sessao.page, msg.telefone, msg.texto);

  if (r.ok) {
    await api.fimMensagem({ id: msg.id, prospecto_id: msg.prospecto_id, ok: true, linha_id: linha.id });
    log(`✉️  ${rotulo}: enviada para ${msg.telefone}`);
  } else {
    await api.fimMensagem({
      id: msg.id,
      ok: false,
      semWhatsapp: r.semWhatsapp,
      erro: r.motivo,
      linha_id: linha.id,
      pararTudo: r.pararTudo,
    });
    log(`⚠️  ${rotulo}: ${msg.telefone}: ${r.motivo}`);

    if (r.pararTudo) {
      // Sessão caiu: derruba o navegador desta linha para reconectar (e
      // mostrar o QR de novo) na próxima volta. A mensagem voltou para a
      // fila no servidor — outra linha assume.
      await api.zapEstado("desconectado", r.motivo, null, linha.id);
      await fecharSessao(chave);
      return { mandouResumo };
    }
  }

  /*
   * Intervalo aleatório: cadência regular é o que denuncia robô. Com linhas,
   * quem espera é o servidor (cadência da conta, revezando entre as linhas);
   * sem linhas, o relógio fica aqui, como sempre.
   */
  if (!c.servidorComLinhas) {
    const s = c.intervaloMin + Math.random() * (c.intervaloMax - c.intervaloMin);
    proximoEnvioEm = Date.now() + s * 1000;
    proximaChecagemEm = proximoEnvioEm;
    log(`próxima mensagem em ${Math.round(s)}s (a fila de buscas segue normal)`);
  }
  return { mandouResumo };
}
