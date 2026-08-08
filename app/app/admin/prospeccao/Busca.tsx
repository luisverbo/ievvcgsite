"use client";

import { useActionState } from "react";
import { buscarProspectos, type BuscaState } from "./actions";
import { NICHOS } from "@/lib/prospeccao/nichos";
import { inputClass, labelClass, fieldClass } from "@/components/painel/ui";

export default function Busca() {
  const [state, formAction, pending] = useActionState<BuscaState, FormData>(
    buscarProspectos,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className={fieldClass}>
          <label className={labelClass} htmlFor="nicho">
            Nicho
          </label>
          <select id="nicho" name="nicho" defaultValue="dentista" className={inputClass}>
            {NICHOS.map((n) => (
              <option key={n.chave} value={n.chave}>
                {n.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="local">
            Onde
          </label>
          <input
            id="local"
            name="local"
            defaultValue=""
            placeholder="Barra da Tijuca, Rio de Janeiro"
            className={inputClass}
            required
          />
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="limite">
            Máximo
          </label>
          <input
            id="limite"
            name="limite"
            type="number"
            min={5}
            max={60}
            defaultValue={20}
            className={`${inputClass} w-24`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? "Buscando…" : "🔎 Buscar empresas"}
        </button>
        <span className="text-xs text-paper-dim">
          Busca no OpenStreetMap — gratuito e sem limite de uso.
        </span>
      </div>

      {pending && (
        <p className="text-sm text-brand-2">
          Procurando empresas e conferindo os sites de cada uma… leva alguns segundos.
        </p>
      )}
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
          ✅ {state.ok}
        </p>
      )}
    </form>
  );
}
