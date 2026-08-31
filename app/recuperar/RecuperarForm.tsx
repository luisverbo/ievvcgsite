"use client";

import { useActionState } from "react";
import { pedirRecuperacao, type RecuperarState } from "./actions";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";

export default function RecuperarForm({ emailInicial }: { emailInicial?: string }) {
  const [state, formAction, pending] = useActionState<RecuperarState, FormData>(
    pedirRecuperacao,
    undefined,
  );

  /*
   * Depois do envio o formulário SOME e fica só a confirmação. Deixar o campo
   * na tela convida a clicar de novo achando que não foi — e o segundo clique
   * invalida o link do primeiro e-mail, que é o que a pessoa vai abrir.
   */
  if (state?.ok) {
    return (
      <div className="rounded-xl border border-ok/40 bg-ok/10 p-4">
        <p className="text-sm font-bold text-ok">📬 Link enviado</p>
        <p className="mt-1.5 text-sm text-paper-dim">{state.ok}</p>
        <p className="mt-3 text-xs text-paper-dim">
          Abra o link <b className="text-paper">neste mesmo navegador</b> — é o que confirma que foi
          você quem pediu.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="email">
          Seu e-mail de acesso
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={emailInicial}
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={`mt-1 ${btnPrimary}`}>
        {pending ? "Enviando…" : "Enviar link de recuperação"}
      </button>
    </form>
  );
}
