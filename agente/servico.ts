/*
 * Serviço do agente: fica olhando a fila de tarefas no Supabase e executa.
 *
 * Roda na VPS (ou no seu computador — é o mesmo código). Ele NUNCA recebe
 * conexão de fora: só consulta o banco. Por isso não precisa de porta aberta,
 * IP fixo nem domínio.
 *
 *   npm run servico
 */

import { createClient } from "@supabase/supabase-js";
import os from "node:os";

import { coletarDoGoogle } from "./coletor.ts";
import { pontuarEGravar } from "./gravar.ts";

const AGENTE = process.env.AGENTE_NOME || os.hostname();
const INTERVALO_MS = Math.max(3000, Number(process.env.AGENTE_INTERVALO_MS) || 8000);
const PAUSA_MS = Math.max(800, Number(process.env.AGENTE_PAUSA_MS) || 2500);
// Na VPS não há tela: headless é o padrão. Em casa, AGENTE_HEADLESS=false
// deixa você assistir o navegador trabalhando.
const HEADLESS = process.env.AGENTE_HEADLESS !== "false";

type Tarefa = {
  id: string;
  org_id: string;
  nicho: string;
  local: string;
  limite: number;
};

const agora = () => new Date().toISOString();
const hora = () => new Date().toLocaleTimeString("pt-BR");
const log = (msg: string) => console.log(`[${hora()}] ${msg}`);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("\n❌ Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (agente/.env)\n");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

// Pega uma tarefa da fila. O filtro status='pendente' no UPDATE garante que
// dois agentes rodando ao mesmo tempo nunca peguem a mesma tarefa.
async function pegarTarefa(): Promise<Tarefa | null> {
  const { data: fila } = await supabase
    .from("prospeccao_tarefas")
    .select("id, org_id, nicho, local, limite")
    .eq("status", "pendente")
    .order("created_at")
    .limit(1);

  const candidata = (fila as Tarefa[] | null)?.[0];
  if (!candidata) return null;

  const { data: presa } = await supabase
    .from("prospeccao_tarefas")
    .update({ status: "rodando", agente: AGENTE, iniciada_em: agora() })
    .eq("id", candidata.id)
    .eq("status", "pendente")
    .select("id, org_id, nicho, local, limite");

  return (presa as Tarefa[] | null)?.[0] ?? null;
}

async function executar(t: Tarefa) {
  log(`▶ tarefa ${t.id.slice(0, 8)} — ${t.nicho} em "${t.local}" (até ${t.limite})`);

  let ultimoProgresso = 0;
  const resultado = await coletarDoGoogle(t.nicho, t.local, t.limite, {
    headless: HEADLESS,
    pausaMs: PAUSA_MS,
    log: (m) => log(`   ${m}`),
    aoProgredir: async (lidas, total) => {
      // Grava progresso a cada 2 empresas: dá para acompanhar no painel sem
      // martelar o banco a cada passo.
      if (lidas !== total && lidas - ultimoProgresso < 2) return;
      ultimoProgresso = lidas;
      await supabase
        .from("prospeccao_tarefas")
        .update({ progresso: lidas, total })
        .eq("id", t.id);
    },
  });

  if (resultado.bloqueio && resultado.empresas.length === 0) {
    await supabase
      .from("prospeccao_tarefas")
      .update({
        status: "erro",
        erro: `O Google mostrou ${resultado.bloqueio}. Espere alguns minutos e tente com um limite menor.`,
        concluida_em: agora(),
      })
      .eq("id", t.id);
    log(`⛔ bloqueio: ${resultado.bloqueio}`);
    // Descanso maior depois de bloqueio, para não insistir e piorar.
    await espera(120_000);
    return;
  }

  const resumo = await pontuarEGravar(
    supabase,
    t.org_id,
    t.nicho,
    t.local,
    resultado.empresas,
    (m) => log(`   ${m}`),
  );

  await supabase
    .from("prospeccao_tarefas")
    .update({
      status: "concluida",
      gravadas: resumo.gravadas,
      progresso: resultado.empresas.length,
      concluida_em: agora(),
      erro: resultado.bloqueio
        ? `Parou no meio: o Google mostrou ${resultado.bloqueio}. O que já foi coletado está salvo.`
        : null,
    })
    .eq("id", t.id);

  log(
    `✅ ${resumo.gravadas} gravadas · ${resumo.oportunidades} com oportunidade · ${resumo.quentes} prioridade alta`,
  );
}

async function main() {
  log(`agente "${AGENTE}" no ar · navegador ${HEADLESS ? "oculto" : "visível"}`);
  log(`checando a fila a cada ${INTERVALO_MS / 1000}s · pausa de ${PAUSA_MS}ms entre empresas`);

  let ocioso = true;
  for (;;) {
    try {
      const tarefa = await pegarTarefa();
      if (!tarefa) {
        if (ocioso) {
          log("sem tarefas — aguardando");
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
        await supabase
          .from("prospeccao_tarefas")
          .update({ status: "erro", erro: msg, concluida_em: agora() })
          .eq("id", tarefa.id);
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
