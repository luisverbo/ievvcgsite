"use client";

import { useActionState } from "react";
import { ajustarCredito, type AjusteState } from "./actions";

/*
 * Ajuste manual de crédito, direto na linha da conta.
 *
 * Compacto de propósito: mora dentro da tabela de contas, ao lado dos botões
 * de plano, porque é ali que você está quando percebe que precisa creditar
 * alguém. Valor negativo estorna.
 */
export default function AjusteCredito({ orgId }: { orgId: string }) {
  const [estado, acao, pendente] = useActionState<AjusteState, FormData>(
    ajustarCredito.bind(null, orgId),
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-paper-dim">US$</span>
        <input
          name="dolares"
          inputMode="decimal"
          placeholder="10"
          title="Valor em dólares. Negativo estorna."
          className="w-16 rounded-md border border-white/15 bg-ink px-2 py-1 text-right text-xs text-paper outline-none focus-visible:border-brand-2"
        />
        <input
          name="motivo"
          placeholder="motivo"
          className="w-24 rounded-md border border-white/15 bg-ink px-2 py-1 text-xs text-paper outline-none focus-visible:border-brand-2"
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md border border-white/15 px-2 py-1 text-xs font-bold text-paper-dim transition hover:border-ok hover:text-ok disabled:opacity-50"
        >
          {pendente ? "…" : "creditar"}
        </button>
      </div>
      {estado?.error && <span className="text-[10px] text-danger">{estado.error}</span>}
      {estado?.ok && <span className="text-[10px] text-ok">{estado.ok}</span>}
    </form>
  );
}
