"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/*
 * Busca por nome na lista de empresas.
 *
 * Com 200+ empresas, achar "aquela ótica" é rolagem. Digitou, a URL ganha
 * ?q= (com um respiro de 350ms para não recarregar a cada tecla) e o
 * servidor filtra — assim o filtro convive com os outros (status, pesquisa)
 * e sobrevive a recarregar a página ou compartilhar o link.
 */
export default function BuscaNome() {
  const router = useRouter();
  const params = useSearchParams();
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const timer = useRef<number | null>(null);
  const primeira = useRef(true);

  useEffect(() => {
    // Não navega no primeiro render — só quando o usuário digita.
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const novos = new URLSearchParams(params.toString());
      const limpo = texto.trim();
      if (limpo) novos.set("q", limpo);
      else novos.delete("q");
      router.replace(`/app/prospeccao/leads?${novos.toString()}`, { scroll: false });
    }, 350);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-paper-dim">
        🔍
      </span>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nome…"
        aria-label="Buscar empresa por nome"
        className="w-full rounded-lg border border-white/10 bg-ink-2 py-2 pl-9 pr-8 text-sm text-paper placeholder:text-paper-dim/60 focus:border-brand-2 focus:outline-none"
      />
      {texto && (
        <button
          type="button"
          onClick={() => setTexto("")}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-sm text-paper-dim transition hover:text-paper"
        >
          ✕
        </button>
      )}
    </div>
  );
}
