"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarPausaEnvio } from "./actions";

/*
 * O freio de mão do envio.
 *
 * Antes, depois de mandar a fila não havia volta: dava para cancelar
 * mensagem por mensagem, ou desconectar o WhatsApp inteiro — que apaga a
 * sessão e obriga a ler o QR de novo. Faltava simplesmente PARAR.
 *
 * Parar PERGUNTA antes ("é isso mesmo?"), porque o botão fica ao lado dos
 * outros e um clique errado calaria o agente sem ninguém perceber. Retomar
 * não pergunta: religar o que já estava ligado não quebra nada.
 */
export default function PausarEnvio({
  pausado,
  naFila,
  desde,
}: {
  pausado: boolean;
  /** Quantas mensagens automáticas continuam esperando na fila. */
  naFila: number;
  desde?: string | null;
}) {
  const router = useRouter();
  const [indo, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function alternar(pausar: boolean) {
    if (pausar) {
      const fila =
        naFila > 0
          ? `\n\nAs ${naFila} mensagens que ainda não saíram ficam guardadas na fila, esperando você retomar.`
          : "";
      if (!window.confirm(`Parar o envio agora?\n\nO agente para de mandar mensagens até você clicar em Retomar.${fila}`)) {
        return;
      }
    }
    setErro(null);
    iniciar(async () => {
      const r = await alternarPausaEnvio(pausar);
      if (r?.error) setErro(r.error);
      router.refresh();
    });
  }

  // Pausado: um aviso que não dá para não ver, com o botão de voltar.
  if (pausado) {
    return (
      <div className="anim-entrada rounded-xl border border-warn/40 bg-warn/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold text-warn">⏸️ Envio pausado</p>
            <p className="mt-0.5 text-sm text-paper-dim">
              Nenhuma mensagem sai enquanto isto estiver assim
              {naFila > 0 && (
                <>
                  {" "}
                  — <b className="text-paper">{naFila}</b>{" "}
                  {naFila === 1 ? "está guardada" : "estão guardadas"} na fila
                </>
              )}
              . O agente continua conectado e ouvindo quem responde.
              {desde && ` Parado desde ${new Date(desde).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => alternar(false)}
            disabled={indo}
            className="flex-none rounded-lg bg-ok px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {indo ? "Retomando…" : "▶️ Retomar envio"}
          </button>
        </div>
        {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => alternar(true)}
        disabled={indo}
        title="Para o envio na hora, sem perder a fila nem desconectar o WhatsApp"
        className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-bold text-paper-dim transition hover:border-warn hover:text-warn disabled:opacity-60"
      >
        {indo ? "Parando…" : "⏸️ Parar envio"}
      </button>
      {erro && <p className="w-full text-sm text-danger">{erro}</p>}
    </>
  );
}
