"use client";

import { useActionState } from "react";
import { importarPlanilha, type BuscaState } from "./actions";
import { inputClass } from "@/components/painel/ui";

/*
 * Importar a lista que o vendedor já tem.
 *
 * Recolhido num <details> de propósito: quem tem planilha acha na hora, quem
 * não tem não ganha mais um formulário na cara. O formato pedido é o mínimo
 * (uma coluna de nome; telefone se quiser abordar) — a leitura descobre o
 * resto sozinha.
 */
export default function Importar() {
  const [estado, acao, pendente] = useActionState<BuscaState, FormData>(importarPlanilha, undefined);

  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <summary className="cursor-pointer list-none text-sm font-bold text-paper-dim transition hover:text-paper [&::-webkit-details-marker]:hidden">
        📥 Já tem uma lista? Importe a planilha (CSV)
      </summary>
      <form action={acao} className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-paper-dim">
          Exporte do Excel ou Google Sheets como <b className="text-paper">.csv</b>. Basta uma
          coluna com o <b className="text-paper">nome da empresa</b>; se tiver{" "}
          <b className="text-paper">telefone</b>, o lead já entra pronto para o WhatsApp. Colunas
          como categoria, endereço e cidade são reconhecidas sozinhas. Importar duas vezes
          atualiza, não duplica.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="arquivo"
            accept=".csv,text/csv"
            required
            className={`${inputClass} max-w-xs text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
          />
          <button
            type="submit"
            disabled={pendente}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
          >
            {pendente ? "Importando…" : "Importar"}
          </button>
        </div>
        {estado?.error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {estado.error}
          </p>
        )}
        {estado?.ok && (
          <p className="rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok">
            ✅ {estado.ok}
          </p>
        )}
      </form>
    </details>
  );
}
