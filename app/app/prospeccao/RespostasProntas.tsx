"use client";

import { useState } from "react";

/*
 * Os botões de resposta pronta, ao lado do lead que respondeu.
 *
 * Um clique COPIA o texto (com {empresa} já trocado pelo nome real) — colar
 * no WhatsApp é o passo seguinte natural, e é o vendedor quem envia. De
 * propósito não enviamos por ele: resposta de conversa é território humano,
 * o robô só adianta a digitação.
 */
export default function RespostasProntas({
  respostas,
  empresa,
}: {
  respostas: { t: string; x: string }[];
  empresa: string;
}) {
  const [copiada, setCopiada] = useState<number | null>(null);
  if (respostas.length === 0) return null;

  async function copiar(i: number, texto: string) {
    try {
      await navigator.clipboard.writeText(texto.replaceAll("{empresa}", empresa));
      setCopiada(i);
      window.setTimeout(() => setCopiada((c) => (c === i ? null : c)), 1600);
    } catch {
      // Clipboard bloqueado (http, permissão): mostra o texto para copiar na mão.
      window.prompt("Copie o texto:", texto.replaceAll("{empresa}", empresa));
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-paper-dim/70">
        ⚡ colar:
      </span>
      {respostas.map((r, i) => (
        <button
          key={i}
          type="button"
          onClick={() => copiar(i, r.x)}
          title={r.x.slice(0, 200)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
            copiada === i
              ? "border-ok/60 bg-ok/15 text-ok"
              : "border-white/15 text-paper-dim hover:border-brand-2/50 hover:text-brand-2"
          }`}
        >
          {copiada === i ? "✓ copiado!" : r.t}
        </button>
      ))}
    </div>
  );
}
