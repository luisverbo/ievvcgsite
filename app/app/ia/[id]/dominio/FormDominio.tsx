"use client";

import { useActionState } from "react";
import { adicionarDominio, type DominioState } from "./actions";
import { inputClass } from "@/components/painel/ui";

export default function FormDominio({ siteIaId }: { siteIaId: string }) {
  const [estado, acao, pendente] = useActionState<DominioState, FormData>(
    adicionarDominio.bind(null, siteIaId),
    undefined,
  );

  return (
    <form action={acao} className="rounded-xl border border-white/10 bg-ink-2 p-5">
      <h2 className="text-sm font-bold text-paper">Conectar um domínio</h2>
      <p className="mt-1 text-xs text-paper-dim">
        Digite o domínio do seu cliente — só o endereço, sem https:// e sem barras.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="dominio"
          placeholder="clinicasorriso.com.br"
          autoComplete="off"
          className={`${inputClass} min-w-0 flex-1 font-mono text-sm`}
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pendente ? "Registrando…" : "Conectar"}
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
