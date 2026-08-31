"use client";

import { useActionState } from "react";
import { definirSenha, type NovaSenhaState } from "./actions";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";

export default function NovaSenhaForm() {
  const [state, formAction, pending] = useActionState<NovaSenhaState, FormData>(
    definirSenha,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="senha_nova">
          Senha nova
        </label>
        <input
          id="senha_nova"
          name="senha_nova"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="senha_repetida">
          Repita a senha nova
        </label>
        <input
          id="senha_repetida"
          name="senha_repetida"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={`mt-1 ${btnPrimary}`}>
        {pending ? "Salvando…" : "Salvar e entrar"}
      </button>
    </form>
  );
}
