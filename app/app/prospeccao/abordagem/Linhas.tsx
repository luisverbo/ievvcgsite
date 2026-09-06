"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarLinha,
  alternarLinha,
  conectarLinha,
  conectarWhatsapp,
  desconectarLinha,
  desconectarWhatsapp,
  removerLinha,
  salvarLinhasSimultaneas,
  type EstadoAbordagem,
} from "./actions";
import Robo from "@/components/painel/Robo";
import PausarEnvio from "./PausarEnvio";

/*
 * O card dos WhatsApps da conta — as LINHAS.
 *
 * Um número era o teto natural de um WhatsApp Web: um perfil, uma sessão.
 * Aqui cada linha é um número com QR e estado próprios, e o dono escolhe
 * uma coisa só: quantas enviam ao mesmo tempo. O resto (revezar, chamar a
 * reserva quando uma cai) é o servidor que decide.
 *
 * Sem a migração das linhas (`legado`), o card mostra a linha de sempre
 * pelas colunas antigas e explica o que falta para ter mais.
 */

export type LinhaTela = {
  id: string;
  nome: string;
  principal: boolean;
  status: "desconectado" | "aguardando_qr" | "conectado" | "erro";
  qr: string | null;
  mensagem: string | null;
  ativa: boolean;
  desconectar_pedido: boolean;
  enviadasHoje: number;
  /* O WhatsApp restringiu este número (não abre conversas novas) até aqui. */
  restringidaAte: string | null;
};

/* A foto da tela na última falha de envio, com a linha, a hora e o motivo. */
export type FotoFalha = { linha: string; foto: string; em: string; motivo: string | null };

const ROTULO: Record<LinhaTela["status"], { texto: string; cor: string; borda: string }> = {
  conectado: { texto: "conectado", cor: "text-ok", borda: "border-ok/30" },
  aguardando_qr: { texto: "aguardando leitura do QR", cor: "text-brand-2", borda: "border-brand-2/40" },
  erro: { texto: "com problema", cor: "text-danger", borda: "border-danger/40" },
  desconectado: { texto: "desconectado", cor: "text-paper-dim", borda: "border-white/10" },
};

export default function Linhas({
  linhas,
  legado,
  simultaneas,
  limiteDiario,
  pausado,
  naFila,
  maxLinhas,
  motivo,
  motivoEm,
  fotoFalha = null,
}: {
  linhas: LinhaTela[];
  /* Migração pendente: só a linha principal, pelas colunas antigas. */
  legado: boolean;
  simultaneas: number;
  limiteDiario: number;
  pausado: boolean;
  naFila: number;
  maxLinhas: number;
  /* A última resposta do servidor ao agente sobre o envio, e quando foi. */
  motivo?: string | null;
  motivoEm?: string | null;
  fotoFalha?: FotoFalha | null;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [addEstado, adicionar, adicionando] = useActionState<EstadoAbordagem, FormData>(
    async () => adicionarLinha(),
    undefined,
  );
  const [simEstado, setSimEstado] = useState<EstadoAbordagem>(undefined);
  const [n, setN] = useState(Math.max(1, simultaneas || 1));

  const conectadas = linhas.filter((l) => l.status === "conectado" && l.ativa);
  const emUso = conectadas.slice(0, n);

  function acao(fn: () => Promise<unknown>) {
    iniciar(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="anim-entrada d1 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            WhatsApp do agente{" "}
            <span className="text-sm font-normal text-paper-dim">
              · {conectadas.length} de {linhas.length} {linhas.length === 1 ? "linha conectada" : "linhas conectadas"}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-paper-dim">
            Cada número é uma linha, com QR e limite diário próprios. Use sempre{" "}
            <b className="text-paper">chips separados</b>, nunca o número que seus clientes já têm.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!pausado && <PausarEnvio pausado={false} naFila={naFila} />}
          {!legado && linhas.length < maxLinhas && (
            <form action={adicionar}>
              <button
                type="submit"
                disabled={adicionando}
                className="rounded-lg border border-brand-2/40 bg-brand/10 px-4 py-2.5 text-sm font-bold text-brand-2 transition hover:bg-brand/20 disabled:opacity-60"
              >
                {adicionando ? "Criando…" : "+ Adicionar número"}
              </button>
            </form>
          )}
        </div>
      </div>
      {addEstado?.error && <p className="text-sm text-danger">{addEstado.error}</p>}
      {addEstado?.ok && <p className="text-sm text-ok">✅ {addEstado.ok}</p>}

      {/* ------------------------------ as linhas ------------------------------ */}
      <div className="grid gap-3 md:grid-cols-2">
        {linhas.map((l, i) => {
          const r = ROTULO[l.status];
          const posicao = emUso.findIndex((x) => x.id === l.id);
          const papel = !l.ativa
            ? "desligada"
            : l.status !== "conectado"
              ? null
              : posicao >= 0
                ? n === 1
                  ? "enviando"
                  : `revezando (${posicao + 1}ª)`
                : "reserva";
          return (
            <div key={l.id} className={`rounded-xl border bg-ink-2 p-4 ${r.borda} ${!l.ativa ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Robo
                    estado={l.status === "conectado" ? "trabalhando" : l.status === "aguardando_qr" ? "novo" : "dormindo"}
                    tamanho={40}
                  />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {l.nome}
                      {l.principal && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-paper-dim">principal</span>}
                      {papel && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            papel === "desligada"
                              ? "bg-white/10 text-paper-dim"
                              : papel === "reserva"
                                ? "bg-warn/15 text-warn"
                                : "bg-ok/15 text-ok"
                          }`}
                        >
                          {papel}
                        </span>
                      )}
                    </p>
                    <p className={`text-xs ${r.cor}`}>{r.texto}</p>
                  </div>
                </div>
                <span className="flex-none text-xs text-paper-dim">
                  hoje <b className="text-paper">{l.enviadasHoje}</b>/{limiteDiario}
                </span>
              </div>

              {l.restringidaAte && (
                <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-paper">
                  <p className="font-bold text-danger">
                    ⛔ O WhatsApp restringiu este número: ele não abre conversas novas pelo WhatsApp Web
                    por enquanto.
                  </p>
                  <p className="mt-1 text-paper-dim">
                    É uma trava do próprio WhatsApp contra disparo para desconhecidos a partir de
                    “dispositivos conectados”. Conversas já existentes continuam (por isso o teste para
                    o seu número passa). O agente parou de enviar por esta linha até{" "}
                    <b className="text-paper">
                      {new Date(l.restringidaAte).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </b>
                    ; se houver outra linha conectada, ela assume.
                  </p>
                  <p className="mt-1 text-paper-dim">
                    O que ajuda: não insistir hoje; usar o celular normalmente (conversas de verdade);
                    quando voltar, começar com 10 a 15 mensagens por dia e subir devagar; e usar o
                    gancho curto em vez de textão. Insistir enquanto restringido é o caminho para o
                    banimento definitivo.
                  </p>
                </div>
              )}

              {l.mensagem && <p className="mt-2 text-xs text-paper-dim">{l.mensagem}</p>}

              {l.status === "aguardando_qr" && !l.qr && (
                <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-brand-2">
                  Aguardando o agente abrir o WhatsApp… o QR aparece aqui em alguns segundos. Se não
                  aparecer em 1 minuto, confira se o agente está ligado.
                </p>
              )}
              {l.qr && l.status !== "conectado" && (
                <div className="mt-3 flex flex-col items-center gap-2 rounded-xl bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.qr} alt={`QR do WhatsApp · ${l.nome}`} className="max-h-[360px] w-auto max-w-full rounded" />
                  <p className="text-center text-xs text-black">
                    No celular do chip desta linha: <b>Aparelhos conectados</b> → <b>Conectar aparelho</b>
                  </p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => acao(() => (legado ? conectarWhatsapp() : conectarLinha(l.id)))}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                    l.status === "conectado"
                      ? "border border-white/15 text-paper-dim hover:border-white/40 hover:text-paper"
                      : "bg-brand text-white hover:bg-brand-2"
                  }`}
                >
                  {l.status === "conectado" ? "Reconectar" : "Conectar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Desconectar a ${l.nome}? A sessão é apagada e você lê o QR de novo para voltar.`)) {
                      acao(() => (legado ? desconectarWhatsapp() : desconectarLinha(l.id)));
                    }
                  }}
                  title="Apaga a sessão para você entrar com outro número"
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-danger hover:text-danger"
                >
                  Desconectar
                </button>
                {!legado && (
                  <button
                    type="button"
                    onClick={() => acao(() => alternarLinha(l.id, !l.ativa))}
                    title={l.ativa ? "Tira esta linha do envio, sem desconectar" : "Volta a usar esta linha no envio"}
                    className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-paper-dim transition hover:border-brand-2 hover:text-brand-2"
                  >
                    {l.ativa ? "Desligar do envio" : "Ligar no envio"}
                  </button>
                )}
                {!legado && !l.principal && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remover a ${l.nome}? O agente apaga a sessão dela.`)) acao(() => removerLinha(l.id));
                    }}
                    className="ml-auto text-xs text-paper-dim transition hover:text-danger"
                  >
                    Remover
                  </button>
                )}
              </div>
              {i === 0 && legado && (
                <p className="mt-3 text-[11px] text-paper-dim">
                  Para ter mais de um número, rode a migração das linhas no Supabase
                  (2026-09-09_linhas_whatsapp.sql).
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* --------------------- quantas enviam ao mesmo tempo --------------------- */}
      {!legado && linhas.length > 1 && (
        <div className="rounded-xl border border-white/10 bg-ink-2 p-4">
          <p className="text-sm font-bold">Quantas linhas enviam ao mesmo tempo</p>
          <p className="mt-0.5 text-xs text-paper-dim">
            As linhas conectadas entram em ordem; as {n === 1 ? "outras ficam" : "que sobram ficam"} de
            reserva e assumem sozinhas quando uma cai. O intervalo entre mensagens vale para a conta
            inteira: com 2 linhas e 10 minutos, sai uma a cada 10 minutos, alternando.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {Array.from({ length: Math.min(maxLinhas, linhas.length) }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setN(v);
                  setSimEstado(undefined);
                  iniciar(async () => {
                    setSimEstado(await salvarLinhasSimultaneas(v));
                    router.refresh();
                  });
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  n === v ? "bg-brand text-white" : "border border-white/15 text-paper-dim hover:border-brand-2 hover:text-brand-2"
                }`}
              >
                {v === 1 ? "1 · uma por vez" : `${v} · revezando`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-paper-dim">
            {n === 1
              ? "Uma linha manda; caiu, a próxima conectada assume na hora — a mensagem que estava saindo volta para a fila."
              : `${n} linhas alternam mensagem sim, mensagem não. Cada uma respeita o próprio limite de ${limiteDiario} por dia.`}
          </p>
          {simEstado?.error && <p className="mt-2 text-sm text-danger">{simEstado.error}</p>}
          {simEstado?.ok && <p className="mt-2 text-sm text-ok">✅ {simEstado.ok}</p>}
        </div>
      )}

      {/*
        O diagnóstico: a última coisa que o servidor respondeu ao agente
        quando ele pediu mensagem. É o que responde "está conectado e não
        sai nada" sem precisar abrir o log da VPS.
      */}
      {motivo && (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-paper-dim">
          <b className="text-paper">Último pedido do agente:</b> {motivo}
          {motivoEm && (
            <span className="text-paper-dim/70">
              {" "}
              · {new Date(motivoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {!/entregue/.test(motivo) && (
            <span className="mt-1 block">
              Enquanto isto não virar “mensagem entregue”, nada sai. Se disser que a linha está fora
              do ar, reconecte; se falar em intervalo ou vez, é só esperar o ritmo que você definiu.
            </span>
          )}
        </p>
      )}

      {/*
        A foto que o agente tirou quando a conversa não abriu. Numa VPS sem
        monitor é a única forma de ver o que o WhatsApp mostrou — e a
        diferença entre adivinhar e saber.
      */}
      {fotoFalha && (
        <details className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-paper-dim">
          <summary className="cursor-pointer">
            <b className="text-paper">Foto da última falha</b> · {fotoFalha.linha} ·{" "}
            {new Date(fotoFalha.em).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {fotoFalha.motivo && <span className="text-danger"> · {fotoFalha.motivo}</span>}
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoFalha.foto}
            alt="Tela do WhatsApp no momento da falha"
            className="mt-2 w-full max-w-3xl rounded border border-white/10"
          />
          <p className="mt-1">
            É a tela do WhatsApp Web no instante em que o agente desistiu. Se aparecer um aviso,
            ele é a resposta; se for só a lista de conversas, a busca do número não andou.
          </p>
        </details>
      )}

      {!legado && linhas.length > 1 && (
        <p className="text-[11px] text-paper-dim">
          Cada linha é um navegador aberto na máquina do agente (uns 400 a 600 MB de memória cada).
          Numa VPS pequena, 3 ou 4 linhas é o razoável.
        </p>
      )}
    </div>
  );
}
