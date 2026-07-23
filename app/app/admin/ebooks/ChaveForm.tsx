"use client";

import { useActionState } from "react";
import { salvarChave, type ChaveState } from "./actions";
import { inputClass } from "@/components/painel/ui";

export default function ChaveForm({ temChave }: { temChave: boolean }) {
  const [state, formAction, pending] = useActionState<ChaveState, FormData>(salvarChave, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="password"
        name="openai_key"
        placeholder="sk-..."
        autoComplete="off"
        className={`${inputClass} flex-1`}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {pending ? "Salvando…" : temChave ? "Substituir chave" : "Salvar chave"}
      </button>
      {state?.error && <p className="text-sm text-danger sm:basis-full">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok sm:basis-full">Chave salva com sucesso. ✅</p>}
    </form>
  );
}
