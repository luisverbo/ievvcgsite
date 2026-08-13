"use client";

import { useActionState } from "react";
import { testarMercadoPago, type TesteMpState } from "./diagnostico-actions";

// Botão que pergunta ao próprio Mercado Pago se o token vale.
export default function TesteMp() {
  const [estado, acao, pendente] = useActionState<TesteMpState>(
    async () => testarMercadoPago(),
    undefined,
  );

  return (
    <form action={acao} className="mt-3">
      <button
        type="submit"
        disabled={pendente}
        className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-paper transition hover:border-brand-2 disabled:opacity-60"
      >
        {pendente ? "Testando…" : "Testar o Mercado Pago agora"}
      </button>
      {estado && (
        <p
          role={estado.ok ? "status" : "alert"}
          className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
            estado.ok
              ? "border-ok/40 bg-ok/10 text-ok"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {estado.detalhe}
        </p>
      )}
    </form>
  );
}
