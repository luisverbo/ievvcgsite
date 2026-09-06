"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarFila } from "./actions";

/*
 * Cancelar a fila — o botão que faltava.
 *
 * Depois de montar um envio não havia como desmontar: dava para pausar (o
 * envio para, a fila fica) ou cancelar mensagem por mensagem no histórico.
 * Quem montou a lista errada ficava travado, porque as empresas da fila
 * também somem de "Quem abordar".
 *
 * Aqui a fila é apagada e as empresas voltam para a lista. Pergunta antes:
 * o texto já montado se perde.
 */
export default function CancelarFila({ quantas }: { quantas: number }) {
  const router = useRouter();
  const [indo, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (quantas === 0) return null;

  return (
    <>
      <button
        type="button"
        disabled={indo}
        onClick={() => {
          if (
            !window.confirm(
              `Cancelar as ${quantas} mensagens que ainda não saíram?\n\nElas são apagadas da fila e as empresas voltam para “Quem abordar”, prontas para você montar o envio de novo. O que já foi enviado não muda.`,
            )
          ) {
            return;
          }
          setErro(null);
          iniciar(async () => {
            const r = await cancelarFila();
            if (r?.error) setErro(r.error);
            router.refresh();
          });
        }}
        className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper-dim transition hover:border-danger hover:text-danger disabled:opacity-60"
      >
        {indo ? "Cancelando…" : `🗑️ Cancelar a fila (${quantas})`}
      </button>
      {erro && <p className="w-full text-xs text-danger">{erro}</p>}
    </>
  );
}
