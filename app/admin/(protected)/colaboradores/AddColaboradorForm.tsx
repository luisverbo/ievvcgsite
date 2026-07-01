"use client";

import { useActionState } from "react";
import { addColaborador } from "./actions";
import { inputClass, labelClass, fieldClass } from "../ui";

export default function AddColaboradorForm() {
  const [state, formAction, pending] = useActionState(addColaborador, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="senha">
          Senha (mín. 6 caracteres)
        </label>
        <input id="senha" name="senha" type="text" required minLength={6} className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-fit rounded-full bg-coral px-5 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Adicionando…" : "Adicionar"}
      </button>
      {state?.error && <p className="text-sm text-coral sm:basis-full">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green sm:basis-full">Colaborador adicionado.</p>}
    </form>
  );
}
