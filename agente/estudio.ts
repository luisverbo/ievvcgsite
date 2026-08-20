/*
 * Estúdio de Vídeos: a ponte entre a fila do painel e o MoneyPrinterTurbo
 * rodando NESTA máquina.
 *
 *   painel (fila)  →  este módulo  →  http://localhost:8080  →  MP4 no disco
 *
 * Liga sozinho: só existe se MPT_URL estiver no .env. O agente da VPS não
 * tem essa variável, então nunca pega job de vídeo — o roteamento entre as
 * máquinas é a própria configuração, sem código de decisão.
 *
 * Um render por vez, de propósito: FFmpeg come a CPU da máquina onde o dono
 * está trabalhando.
 */

import * as api from "./api.ts";

const MPT = (process.env.MPT_URL || "").replace(/\/$/, "");
const BASE_API = `${MPT}/api/v1`;

export const estudioLigado = () => !!MPT;

let ocupado = false;
// Sem MPT no ar não adianta perguntar por job a cada volta de 8s.
let proximaChecagemEm = 0;

type TarefaMpt = {
  state?: number | string;
  progress?: number;
  videos?: string[];
  combined_videos?: string[];
  error?: string;
  failed_stage?: string;
};

async function mpt<T>(caminho: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_API}${caminho}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`MoneyPrinterTurbo respondeu ${res.status}: ${corpo.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/*
 * O nome interno do estado varia entre versões do MPT; o que não varia é o
 * par (videos preenchido = terminou) e (error/failed_stage = falhou). Ler o
 * resultado em vez do rótulo evita quebrar quando ele renomear o enum.
 */
function terminou(t: TarefaMpt): { fim: boolean; ok: boolean; erro?: string } {
  const arquivos = [...(t.combined_videos ?? []), ...(t.videos ?? [])];
  if (arquivos.length > 0) return { fim: true, ok: true };
  if (t.error || t.failed_stage) {
    return { fim: true, ok: false, erro: t.error || `falhou na etapa ${t.failed_stage}` };
  }
  const estado = String(t.state ?? "").toLowerCase();
  if (estado.includes("fail") || estado === "-1") {
    return { fim: true, ok: false, erro: "o MoneyPrinterTurbo marcou a tarefa como falha" };
  }
  return { fim: false, ok: false };
}

async function gerarUm(
  projeto: api.ProjetoVideo,
  aspecto: "9:16" | "16:9",
  log: (m: string) => void,
): Promise<string> {
  const criada = await mpt<{ data?: { task_id?: string }; task_id?: string }>("/videos", {
    method: "POST",
    body: JSON.stringify({
      video_subject: projeto.titulo,
      // O roteiro vai PRONTO: assim o MPT não chama LLM nenhum (é o que
      // dispara o erro "failed to generate video script/terms" quando ele
      // está sem chave configurada).
      video_script: projeto.roteiro,
      video_terms: (projeto.termos ?? []).join(", "),
      video_aspect: aspecto,
      video_language: "pt-BR",
      voice_name: process.env.MPT_VOZ || "pt-BR-FranciscaNeural",
      subtitle_enabled: true,
      video_clip_duration: 5,
      video_count: 1,
      bgm_type: "random",
      bgm_volume: 0.2,
    }),
  });
  const taskId = criada.data?.task_id ?? criada.task_id;
  if (!taskId) throw new Error("O MoneyPrinterTurbo não devolveu o número da tarefa.");
  log(`tarefa ${taskId} criada (${aspecto})`);

  // Renderizar 60s leva minutos: acompanha de 10 em 10 segundos, com teto de
  // 40 minutos para uma tarefa travada não prender o agente para sempre.
  const limite = Date.now() + 40 * 60_000;
  let ultimoAviso = "";
  while (Date.now() < limite) {
    await espera(10_000);
    let t: TarefaMpt;
    try {
      const r = await mpt<{ data?: TarefaMpt }>(`/tasks/${taskId}`);
      t = r.data ?? (r as TarefaMpt);
    } catch (e) {
      log(`consulta falhou (segue tentando): ${(e as Error).message}`);
      continue;
    }

    const fim = terminou(t);
    if (fim.fim && fim.ok) {
      const arquivo = (t.combined_videos ?? t.videos ?? [])[0] ?? "";
      log(`pronto: ${arquivo}`);
      return arquivo;
    }
    if (fim.fim) throw new Error(fim.erro ?? "falhou");

    const aviso = `${aspecto} · ${t.progress ?? 0}%`;
    if (aviso !== ultimoAviso) {
      ultimoAviso = aviso;
      await api.videoProgresso(projeto.id, `renderizando ${aviso}`).catch(() => {});
    }
  }
  throw new Error("passou de 40 minutos — tarefa abandonada.");
}

export async function rodarEstudio(log: (m: string) => void): Promise<void> {
  if (!MPT || ocupado || Date.now() < proximaChecagemEm) return;

  let projeto: api.ProjetoVideo | null;
  try {
    projeto = await api.videoProximo();
  } catch {
    // Falha de rede aqui não é notícia: a próxima volta tenta de novo.
    return;
  }
  if (!projeto) return;

  ocupado = true;
  log(`🎬 gerando vídeo: ${projeto.titulo}`);
  try {
    const arquivo = await gerarUm(projeto, "9:16", log);
    let arquivo169 = "";
    if (projeto.formato_16x9) {
      log("gerando também em 16:9…");
      await api.videoProgresso(projeto.id, "renderizando versão 16:9").catch(() => {});
      arquivo169 = await gerarUm(projeto, "16:9", log);
    }
    await api.videoFim({ id: projeto.id, ok: true, arquivo, arquivo_16x9: arquivo169 });
    log(`✅ vídeo pronto — veja em ${MPT}`);
  } catch (e) {
    const motivo = (e as Error).message.slice(0, 300);
    log(`⚠️  vídeo falhou: ${motivo}`);
    await api.videoFim({ id: projeto.id, ok: false, erro: motivo }).catch(() => {});
    // MPT fora do ar: espera um pouco antes de tentar o próximo.
    if (motivo.includes("fetch") || motivo.includes("respondeu 5")) {
      proximaChecagemEm = Date.now() + 60_000;
    }
  } finally {
    ocupado = false;
  }
}
