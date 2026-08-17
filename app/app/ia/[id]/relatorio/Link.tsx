"use client";

import { useState } from "react";
import { criarLinkRelatorio } from "../../actions";

/*
 * O link do relatório: criar, copiar, mandar. É o que o dono manda todo mês
 * para quem paga a mensalidade — então o caminho tem que ser de dois cliques,
 * não de dez.
 */
export default function Link({ siteId, codigo: inicial }: { siteId: string; codigo: string | null }) {
  const [codigo, setCodigo] = useState(inicial);
  const [criando, setCriando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const url = codigo ? `${typeof window === "undefined" ? "" : window.location.origin}/relatorio/${codigo}` : "";

  async function criar() {
    setCriando(true);
    setErro(null);
    const r = await criarLinkRelatorio(siteId);
    if (r.error) setErro(r.error);
    else if (r.codigo) setCodigo(r.codigo);
    setCriando(false);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não consegui copiar — selecione o endereço e copie na mão.");
    }
  }

  if (!codigo) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={criar}
          disabled={criando}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {criando ? "Criando…" : "Criar o link do relatório"}
        </button>
        {erro && <p className="text-sm text-danger">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-paper-dim">
          {url}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-2"
        >
          {copiado ? "Copiado ✓" : "Copiar link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper-dim transition hover:border-white/40 hover:text-paper"
        >
          Abrir ↗
        </a>
      </div>
      {url && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Olá! Segue o relatório do seu site deste mês: ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="self-start rounded-lg bg-ok/20 px-4 py-2 text-xs font-bold text-ok transition hover:bg-ok/30"
        >
          Mandar pelo WhatsApp →
        </a>
      )}
      {erro && <p className="text-sm text-danger">{erro}</p>}
    </div>
  );
}
