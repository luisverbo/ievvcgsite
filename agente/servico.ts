/*
 * Serviço do agente: fica olhando a fila de tarefas e executa.
 *
 * Roda na sua VPS ou no seu computador — é o mesmo código. Ele NUNCA recebe
 * conexão de fora: só pergunta ao painel se há trabalho. Por isso não precisa
 * de porta aberta, IP fixo nem domínio.
 *
 *   npm run servico
 */

import os from "node:os";

import * as api from "./api.ts";
import { coletarDoGoogle } from "./coletor.ts";
import { rodarAbordagem, fecharSessaoZap } from "./abordagem.ts";
import { capturarInstagramDoProspecto } from "./capturaIg.ts";
import { capturarEspelhoDoProspecto } from "./espelho.ts";
import { rodarEstudio, estudioLigado } from "./estudio.ts";
import { versaoLocal, aplicarAtualizacao, instaladoPorGit, CODIGO_REINICIAR } from "./versao.ts";
import { normalizarFiltros, resumoFiltros, temFiltro } from "../lib/prospeccao/filtros.ts";

const AGENTE = process.env.AGENTE_NOME || os.hostname();
const INTERVALO_MS = Math.max(3000, Number(process.env.AGENTE_INTERVALO_MS) || 8000);
const PAUSA_MS = Math.max(800, Number(process.env.AGENTE_PAUSA_MS) || 2500);
// Na VPS não há tela: headless é o padrão. Em casa, AGENTE_HEADLESS=false
// deixa você assistir o navegador trabalhando.
const HEADLESS = process.env.AGENTE_HEADLESS !== "false";

/*
 * Modo estúdio: esta instância SÓ renderiza vídeo.
 *
 * Existe para o caso real de duas máquinas: a VPS cuida do WhatsApp e da
 * prospecção 24h, e o PC — que é onde o MoneyPrinterTurbo está instalado —
 * atende só a fila de vídeo. Sem isto, um segundo agente na mesma conta
 * abriria outro WhatsApp e disputaria as buscas com a VPS.
 */
const SOMENTE_ESTUDIO = process.env.SOMENTE_ESTUDIO === "1";

/*
 * Ritmo do Instagram.
 *
 * Leitura anônima aguenta pouca coisa: uma rajada de dez perfis em dois
 * minutos derruba o acesso na hora. Então o agente espera de 1,5 a 4 minutos
 * entre um perfil e outro, e se levar o bloqueio fica três horas sem tocar em
 * tarefa de Instagram — as buscas do Google continuam normalmente nesse tempo.
 */
const IG_PAUSA_MIN_S = 90;
const IG_PAUSA_MAX_S = 240;
const IG_CASTIGO_MS = 3 * 3_600_000;
let igLiberadoEm = 0;

const igEmDescanso = () => Date.now() < igLiberadoEm;
const faltaIg = () => Math.ceil((igLiberadoEm - Date.now()) / 60_000);

const hora = () => new Date().toLocaleTimeString("pt-BR");
const log = (msg: string) => console.log(`[${hora()}] ${msg}`);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/*
 * Saída limpa. `systemctl restart` manda SIGTERM; sem tratar, o node ignora,
 * leva SIGKILL 90s depois e deixa o Chromium órfão segurando a pasta da
 * sessão do WhatsApp — na volta o agente pedia QR de novo. Fechar o
 * navegador aqui é o que faz uma atualização não custar a sessão.
 */
let encerrando = false;

async function encerrar(sinal: string) {
  if (encerrando) return;
  encerrando = true;
  log(`recebi ${sinal} — fechando o navegador e saindo`);
  // Teto próprio: se o navegador travar, saímos assim mesmo. Melhor sair
  // rápido e sem sessão presa do que esperar o SIGKILL.
  await Promise.race([
    fecharSessaoZap().catch(() => {}),
    new Promise((r) => setTimeout(r, 8000)),
  ]);
  log("agente encerrado.");
  process.exit(0);
}

process.on("SIGTERM", () => void encerrar("SIGTERM"));
process.on("SIGINT", () => void encerrar("SIGINT"));

/*
 * Versão e atualização pelo painel.
 *
 * A cada 5 minutos (e no arranque) o agente diz ao painel qual versão está
 * rodando e pergunta se o dono clicou em Atualizar. Se clicou: aplica, fecha
 * o WhatsApp com cuidado e sai com o código de "me religue" — o systemd na
 * VPS e o LIGAR-AGENTE no Windows/Mac sobem o agente novo em segundos.
 *
 * Falha aqui nunca derruba o serviço: atualizar é bônus, prospectar é a
 * obrigação. Um erro vira uma linha no log e a próxima checagem tenta de novo.
 */
const VERSAO_A_CADA_MS = 5 * 60_000;
let proximaChecagemVersaoEm = 0;

async function talvezAtualizar(): Promise<void> {
  if (Date.now() < proximaChecagemVersaoEm || encerrando) return;
  proximaChecagemVersaoEm = Date.now() + VERSAO_A_CADA_MS;
  try {
    const local = versaoLocal();
    const r = await api.versao(local);
    if (!r.atualizar) return;

    log(`🔄 o painel pediu atualização (${instaladoPorGit() ? "git" : "zip"})…`);
    const mudou = await aplicarAtualizacao(api.pacote, (m) => log(`   ${m}`));
    if (!mudou) return;

    encerrando = true;
    log("reiniciando para carregar a versão nova…");
    await Promise.race([fecharSessaoZap().catch(() => {}), new Promise((r) => setTimeout(r, 8000))]);
    process.exit(CODIGO_REINICIAR);
  } catch (e) {
    log(`⚠️  atualização: ${(e as Error).message.slice(0, 200)}`);
  }
}

if (!api.configurado()) {
  console.error(`\n❌ ${api.faltaConfig()}\n`);
  console.error("   Pegue os dois valores no painel, em Prospecção › Meu agente.\n");
  process.exit(1);
}

async function executar(t: api.Tarefa) {
  // Print do site atual do lead (o "hoje" da comparação hoje × amanhã).
  // Sem trava de ritmo: é o site do próprio lead, não uma rede social.
  if (t.tipo === "espelho") {
    if (!t.prospecto_id) throw new Error("Tarefa de espelho sem empresa.");
    log(`▶ tarefa ${t.id.slice(0, 8)} — espelho (print do site atual)`);
    const r = await capturarEspelhoDoProspecto(t.prospecto_id, HEADLESS, (m) => log(`   ${m}`));
    await api.fimTarefa(t.id, {
      status: r.ok ? "concluida" : "erro",
      erro: r.ok ? null : r.resumo,
      progresso: r.ok ? 1 : 0,
    });
    log(r.ok ? `✅ ${r.resumo}` : `⚠️  ${r.resumo}`);
    return;
  }

  // Captura de Instagram é tarefa curta, de uma empresa só; a busca é o
  // trabalho longo. Separadas aqui para não misturar os dois fluxos.
  if (t.tipo === "instagram") {
    if (!t.prospecto_id) throw new Error("Tarefa de Instagram sem empresa.");
    log(`▶ tarefa ${t.id.slice(0, 8)} — Instagram`);

    const r = await capturarInstagramDoProspecto(t.prospecto_id, HEADLESS, (m) => log(`   ${m}`));

    if (r.status === "bloqueado") {
      // Insistir depois de um bloqueio só piora: o Instagram estende a
      // restrição. Melhor sumir por umas horas.
      igLiberadoEm = Date.now() + IG_CASTIGO_MS;
      log(`⛔ Instagram bloqueou — pausando captura por ${IG_CASTIGO_MS / 3_600_000}h`);
    } else {
      const s = IG_PAUSA_MIN_S + Math.random() * (IG_PAUSA_MAX_S - IG_PAUSA_MIN_S);
      igLiberadoEm = Date.now() + s * 1000;
    }

    await api.fimTarefa(t.id, {
      status: r.ok ? "concluida" : "erro",
      erro: r.ok
        ? null
        : r.status === "bloqueado"
          ? `${r.resumo} As próximas capturas ficam esperando na fila por ${IG_CASTIGO_MS / 3_600_000} horas.`
          : r.resumo,
      progresso: r.ok ? 1 : 0,
    });
    log(r.ok ? `✅ ${r.resumo}` : `⚠️  ${r.resumo}`);
    return;
  }

  log(`▶ tarefa ${t.id.slice(0, 8)} — ${t.nicho} em "${t.local}" (até ${t.limite})`);

  let ultimoProgresso = 0;
  const filtros = normalizarFiltros(t.filtros);
  if (temFiltro(filtros) || filtros.evitarRepetidas) log(`   filtro: ${resumoFiltros(filtros).join(" · ")}`);

  const resultado = await coletarDoGoogle(t.nicho!, t.local!, t.limite, {
    headless: HEADLESS,
    pausaMs: PAUSA_MS,
    filtros,
    jaExistem: api.jaExistem,
    log: (m) => log(`   ${m}`),
    aoProgredir: async (lidas, total) => {
      // Grava progresso a cada 2 empresas: dá para acompanhar no painel sem
      // martelar o servidor a cada passo.
      if (lidas !== total && lidas - ultimoProgresso < 2) return;
      ultimoProgresso = lidas;
      await api.progresso(t.id, lidas, total).catch(() => {});
    },
  });

  if (resultado.bloqueio && resultado.empresas.length === 0) {
    await api.fimTarefa(t.id, {
      status: "erro",
      erro: `O Google mostrou ${resultado.bloqueio}. Espere alguns minutos e tente com um limite menor.`,
    });
    log(`⛔ bloqueio: ${resultado.bloqueio}`);
    // Descanso maior depois de bloqueio, para não insistir e piorar.
    await espera(120_000);
    return;
  }

  log("   enviando para o painel…");
  const resumo = await api.gravarEmpresas(t.nicho!, t.local!, resultado.empresas);

  await api.fimTarefa(t.id, {
    status: "concluida",
    gravadas: resumo.gravadas,
    progresso: resultado.empresas.length,
    erro: resultado.bloqueio
      ? `Parou no meio: o Google mostrou ${resultado.bloqueio}. O que já foi coletado está salvo.`
      : /*
         * Filtro apertado não é ERRO — é informação. Sem esta linha o cliente
         * pede 20, recebe 6 e conclui que a busca falhou; com ela, ele
         * entende que aquele bairro não tem 20 do que ele pediu e afrouxa o
         * filtro em vez de abrir chamado.
         */
        resultado.empresas.length < t.limite && (resultado.descartadas > 0 || resultado.repetidas > 0)
        ? [
            resultado.repetidas > 0
              ? `${resultado.repetidas} já estavam na sua lista e foram puladas.`
              : "",
            resultado.descartadas > 0
              ? `O filtro deixou de fora ${resultado.descartadas}.`
              : "",
            "Foi o que essa região tinha de novo — busque num bairro vizinho ou afrouxe um filtro para completar.",
          ]
            .filter(Boolean)
            .join(" ")
        : null,
  });

  log(
    `✅ ${resumo.gravadas} gravadas · ${resumo.oportunidades} com oportunidade · ${resumo.quentes} prioridade alta`,
  );
}

async function main() {
  try {
    const r = await api.ping();
    log(`conectado ao painel como "${r.agente}"`);
  } catch (e) {
    console.error(`\n❌ ${(e as Error).message}\n`);
    process.exit(1);
  }

  log(`agente "${AGENTE}" no ar · versão ${versaoLocal()} · navegador ${HEADLESS ? "oculto" : "visível"}`);
  if (estudioLigado()) log(`🎬 Estúdio de Vídeos ligado — MoneyPrinterTurbo em ${process.env.MPT_URL}`);
  // Primeira checagem já no arranque: quem religou depois de um Atualizar
  // confirma ao painel, na hora, que está na versão nova.
  await talvezAtualizar();

  /*
   * Modo estúdio: laço curto e sozinho. Nada de WhatsApp, nada de buscas —
   * esta máquina existe só para renderizar, e o outro agente (a VPS) segue
   * dono da prospecção sem disputa.
   */
  if (SOMENTE_ESTUDIO) {
    if (!estudioLigado()) {
      console.error("\n❌ SOMENTE_ESTUDIO=1 mas falta MPT_URL no .env — não há o que fazer.\n");
      process.exit(1);
    }
    log("modo estúdio: só vídeos (WhatsApp e prospecção ficam com o outro agente)");
    for (;;) {
      if (encerrando) return;
      await talvezAtualizar();
      try {
        await rodarEstudio((m) => log(`   ${m}`));
      } catch (e) {
        log(`⚠️  estúdio: ${(e as Error).message}`);
      }
      await espera(INTERVALO_MS);
    }
  }

  log(`checando a fila a cada ${INTERVALO_MS / 1000}s · pausa de ${PAUSA_MS}ms entre empresas`);

  let ocioso = true;
  for (;;) {
    // Desligando: não pega trabalho novo, deixa o encerrar() terminar.
    if (encerrando) return;
    // Entre uma tarefa e outra é a hora segura de trocar de versão.
    await talvezAtualizar();
    try {
      const tarefa = igEmDescanso()
        ? await api.proximaTarefa().then((t) => (t?.tipo === "instagram" ? null : t))
        : await api.proximaTarefa();

      if (!tarefa) {
        // Sem busca para fazer, o agente cuida da fila de abordagem — assim as
        // duas coisas convivem sem disputar o navegador.
        try {
          await rodarAbordagem(HEADLESS, (m) => log(`   ${m}`));
        } catch (e) {
          log(`⚠️  abordagem: ${(e as Error).message}`);
        }

        // E, se esta máquina tiver o MoneyPrinterTurbo, a fila de vídeos.
        // Sem MPT_URL no .env isto nem consulta o painel.
        try {
          await rodarEstudio((m) => log(`   ${m}`));
        } catch (e) {
          log(`⚠️  estúdio: ${(e as Error).message}`);
        }
        if (ocioso) {
          log(
            igEmDescanso()
              ? `sem tarefas — Instagram descansando por mais ${faltaIg()} min`
              : "sem tarefas — aguardando",
          );
          ocioso = false;
        }
        await espera(INTERVALO_MS);
        continue;
      }
      ocioso = true;
      try {
        await executar(tarefa);
      } catch (e) {
        // Sem isto a tarefa ficaria presa em "rodando" para sempre e o painel
        // mostraria um progresso que nunca termina.
        const msg = (e as Error).message.slice(0, 400);
        log(`❌ tarefa ${tarefa.id.slice(0, 8)} falhou: ${msg}`);
        await api.fimTarefa(tarefa.id, { status: "erro", erro: msg }).catch(() => {});
      }
    } catch (e) {
      // Erro de rede ou do navegador não pode derrubar o serviço: ele precisa
      // sobreviver para pegar a próxima tarefa.
      log(`⚠️  ${(e as Error).message}`);
      await espera(INTERVALO_MS);
    }
  }
}

main();
