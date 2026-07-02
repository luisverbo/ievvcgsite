"use client";

import { useActionState } from "react";
import type { AuthState } from "./actions";
import { inputClass, labelClass, fieldClass, btnPrimary } from "@/components/painel/ui";

export default function AuthForm({
  action,
  submitLabel,
  de,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  de?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {de && <input type="hidden" name="de" value={de} />}
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.aviso && <p className="text-sm text-ok">{state.aviso}</p>}
      <button type="submit" disabled={pending} className={`mt-2 ${btnPrimary}`}>
        {pending ? "Aguarde…" : submitLabel}
      </button>
    </form>
  );
}
