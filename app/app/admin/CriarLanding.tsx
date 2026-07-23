"use client";

import { useActionState } from "react";
import { criarLandingPaginaPro, type LandingState } from "./actions";

export default function CriarLanding() {
  const [state, formAction, pending] = useActionState<LandingState, FormData>(
    () => criarLandingPaginaPro(),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        {pending ? "Criando as 3 páginas…" : "🚀 Criar minha landing page do PáginaPro"}
      </button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
