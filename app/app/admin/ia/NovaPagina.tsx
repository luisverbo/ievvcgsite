"use client";

import { useActionState } from "react";
import { criarPaginaIA, type NovaPaginaState } from "./actions";
import { MODELOS_IA, MODELO_PADRAO } from "@/lib/ia/modelos";
import { inputClass } from "@/components/painel/ui";

export default function NovaPagina({ temChave }: { temChave: boolean }) {
  const [state, formAction, pending] = useActionState<NovaPaginaState, FormData>(
    criarPaginaIA,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="titulo"
          placeholder="Nome da página (ex: Pudim de Copo — página de vendas)"
          className={`${inputClass} flex-1`}
          required
        />
        <select name="modelo" defaultValue={MODELO_PADRAO} className={inputClass}>
          {Object.entries(MODELOS_IA).map(([id, m]) => (
            <option key={id} value={id}>
              {m.rotulo}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !temChave}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? "Criando…" : "Criar página"}
        </button>
      </div>
      <p className="text-xs text-paper-dim">
        {MODELOS_IA[MODELO_PADRAO].nota} · dá para trocar o modelo depois, a
        qualquer momento.
      </p>
      {!temChave && (
        <p className="text-sm text-danger">
          Configure a chave da Anthropic no painel admin antes de criar a primeira página.
        </p>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
