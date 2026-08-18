"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/*
 * Seletor das pesquisas já feitas.
 *
 * Precisa ser componente de cliente por um motivo específico: com <details>
 * puro ele NÃO fechava ao escolher. O Next navega no cliente, o DOM não é
 * recriado, e o atributo `open` sobrevive à troca de página — o painel ficava
 * aberto por cima da lista já filtrada.
 *
 * Aqui o estado é nosso: clicou numa opção, fecha. E fecha também no clique
 * fora e no Esc, que é o que qualquer menu faz.
 */

export type ItemPesquisa = { chave: string; rotulo: string; total: number };

export default function SeletorPesquisa({
  pesquisas,
  busca,
  filtro,
  total,
  q,
}: {
  pesquisas: ItemPesquisa[];
  busca: string;
  filtro: string;
  total: number;
  q?: string;
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

  const sufixoQ = q ? `&q=${encodeURIComponent(q)}` : "";
  const atual = pesquisas.find((p) => p.chave === busca);
  const rotuloAtual = atual ? `${atual.rotulo} (${atual.total})` : `Todas (${total} empresas)`;

  const linha = (href: string, escolhido: boolean, esquerda: React.ReactNode, contagem: number) => (
    <Link
      href={href}
      onClick={() => setAberto(false)}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition ${
        escolhido
          ? "bg-brand/20 font-bold text-paper"
          : "text-paper-dim hover:bg-white/5 hover:text-paper"
      }`}
    >
      <span className="min-w-0 truncate">{esquerda}</span>
      <span className="flex-none text-xs tabular-nums text-paper-dim">{contagem}</span>
    </Link>
  );

  return (
    <div
      ref={caixa}
      className={`anim-entrada d4 relative ${aberto ? "z-30" : ""}`}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-2 px-4 py-3 text-left transition hover:border-white/25"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="flex-none text-xs font-semibold uppercase tracking-wide text-paper-dim">
            Pesquisa:
          </span>
          <b className="truncate text-sm text-paper">{rotuloAtual}</b>
        </span>
        <span
          className={`flex-none text-xs font-bold text-paper-dim transition ${aberto ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-ink-2 p-2 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)]">
          {linha(
            `/app/prospeccao?f=${filtro}${sufixoQ}`,
            busca === "todas",
            "Todas as pesquisas",
            total,
          )}
          {pesquisas.map((p) => {
            const [nicho, local] = p.rotulo.split(" · ");
            return (
              <div key={p.chave}>
                {linha(
                  `/app/prospeccao?f=${filtro}&b=${encodeURIComponent(p.chave)}${sufixoQ}`,
                  busca === p.chave,
                  <>
                    <span className="text-paper">{nicho}</span>
                    {local && <span className="text-paper-dim"> · {local}</span>}
                  </>,
                  p.total,
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
