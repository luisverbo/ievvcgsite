"use client";

import { useActionState } from "react";
import { analisarMetricasIA, type OtimizadorState } from "../../actions";

// O botão que gasta: preço escrito nele, estado de espera honesto (a análise
// leva ~30s — o modelo lê a página inteira) e o erro aparece aqui embaixo.
export default function Analisar({ siteId, temSugestoes }: { siteId: string; temSugestoes: boolean }) {
  const [estado, agir, rodando] = useActionState<OtimizadorState, FormData>(
    (prev) => analisarMetricasIA(siteId, prev),
    undefined,
  );

  return (
    <form action={agir} className="flex flex-col items-start gap-2">
      <button
        type="submit"
        disabled={rodando}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {rodando
          ? "🧠 Lendo suas métricas e sua página…"
          : temSugestoes
            ? "Analisar de novo (~US$0,10)"
            : "🧠 Analisar com IA (~US$0,10)"}
      </button>
      {rodando && (
        <p className="text-xs text-paper-dim">
          Isso leva uns 30 segundos — a IA está lendo a página inteira e cruzando com os números.
        </p>
      )}
      {estado?.error && <p className="text-sm text-danger">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-ok">✅ {estado.ok}</p>}
    </form>
  );
}
