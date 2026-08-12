"use client";

import { useActionState } from "react";
import { salvarChavePropria, type ChaveState } from "./actions";
import { inputClass } from "@/components/painel/ui";

export default function FormChave({
  qual,
  titulo,
  ajuda,
  final,
  onde,
}: {
  qual: "anthropic" | "openai";
  titulo: string;
  ajuda: string;
  final: string | null;
  onde: string;
}) {
  const [estado, acao, pendente] = useActionState<ChaveState, FormData>(salvarChavePropria, undefined);

  return (
    <form action={acao} className="rounded-xl border border-white/10 bg-ink-2 p-4">
      <input type="hidden" name="qual" value={qual} />
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-paper">{titulo}</h3>
        {final && (
          <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-bold text-ok">
            salva · termina em {final}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-paper-dim">{ajuda}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="chave"
          type="password"
          autoComplete="off"
          placeholder={final ? "•••••••• (deixe vazio para remover)" : onde}
          className={`${inputClass} min-w-0 flex-1 font-mono text-sm`}
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pendente ? "Testando…" : "Salvar"}
        </button>
      </div>

      {estado?.error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p role="status" className="mt-2 text-xs font-medium text-ok">
          {estado.ok}
        </p>
      )}
    </form>
  );
}
