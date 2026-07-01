"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-cream-dim">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-white/15 bg-night-2 px-4 py-3 text-cream outline-none focus-visible:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-cream-dim">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-white/15 bg-night-2 px-4 py-3 text-cream outline-none focus-visible:border-gold"
        />
      </div>
      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-coral px-6 py-3 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
