"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Escolher qual pesquisa abordar — em um campo, não em quatorze chips.
 *
 * Com uma busca feita, chips eram ótimos. Com quatorze (dentista na Barra,
 * dentista em Campo Grande, psicólogo no Recreio…), viravam cinco linhas de
 * botões antes da lista — a tela toda empurrada para baixo por um filtro que
 * se usa uma vez. Aqui é um campo que mostra a escolha atual e abre a lista
 * ordenada por tamanho.
 *
 * Fecha ao escolher, no clique fora e no Esc — o que qualquer menu faz.
 */

export type ItemNicho = { chave: string; rotulo: string; total: number };

export default function SeletorNicho({
  itens,
  valor,
  total,
  aoEscolher,
}: {
  itens: ItemNicho[];
  valor: string;
  /* Quantas empresas no total (a opção "Todas"). */
  total: number;
  aoEscolher: (chave: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const foraDaCaixa = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", foraDaCaixa);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", foraDaCaixa);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const atual = itens.find((i) => i.chave === valor);

  const linha = (chave: string, esquerda: React.ReactNode, contagem: number) => (
    <button
      key={chave}
      type="button"
      onClick={() => {
        aoEscolher(chave);
        setAberto(false);
      }}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
        valor === chave
          ? "bg-brand/20 font-bold text-paper"
          : "text-paper-dim hover:bg-white/5 hover:text-paper"
      }`}
    >
      <span className="min-w-0 truncate">{esquerda}</span>
      <span className="flex-none text-xs tabular-nums text-paper-dim">{contagem}</span>
    </button>
  );

  return (
    <div ref={caixa} className={`relative mb-3 ${aberto ? "z-30" : ""}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-2 px-4 py-2.5 text-left transition hover:border-white/25 sm:w-auto sm:min-w-[26rem]"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="flex-none text-xs font-semibold uppercase tracking-wide text-paper-dim">
            Pesquisa:
          </span>
          <b className="truncate text-sm text-paper">
            {atual ? `${atual.rotulo} (${atual.total})` : `Todas (${total})`}
          </b>
        </span>
        <span className={`flex-none text-xs font-bold text-paper-dim transition ${aberto ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-30 mt-2 max-h-80 w-full min-w-[20rem] overflow-y-auto rounded-xl border border-white/15 bg-ink-2 p-2 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] sm:w-auto sm:min-w-[26rem]">
          {linha("todas", "Todas as pesquisas", total)}
          {itens.map((i) => {
            const [nicho, local] = i.rotulo.split(" · ");
            return linha(
              i.chave,
              <>
                <span className="text-paper">{nicho}</span>
                {local && <span className="text-paper-dim"> · {local}</span>}
              </>,
              i.total,
            );
          })}
        </div>
      )}
    </div>
  );
}
