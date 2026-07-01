"use client";

import { useActionState } from "react";
import { saveTextos } from "./actions";
import type { ConfigEvento } from "@/lib/types";
import { TEXTOS_GRUPOS, TEXTOS_PADRAO } from "@/lib/textos";
import { inputClass, labelClass, fieldClass, cardClass } from "../ui";

export default function TextosForm({ config }: { config: ConfigEvento }) {
  const [state, formAction, pending] = useActionState(saveTextos, undefined);
  const isFallback = config.id === "fallback";

  const valor = (key: string) => {
    // Campos com prefixo "_" são colunas reais do config_evento, não jsonb.
    if (key === "_texto_sobre") return config.texto_sobre;
    if (key === "_endereco") return config.endereco;
    return config.textos?.[key] ?? TEXTOS_PADRAO[key] ?? "";
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {!isFallback && <input type="hidden" name="id" value={config.id} />}

      {TEXTOS_GRUPOS.map((grupo) => (
        <div key={grupo.grupo} className={cardClass}>
          <h2 className="mb-4 font-display text-lg font-extrabold">{grupo.grupo}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {grupo.campos.map((campo) => (
              <div
                className={`${fieldClass}${campo.multiline ? " sm:col-span-2" : ""}`}
                key={campo.key}
              >
                <label className={labelClass} htmlFor={campo.key}>
                  {campo.label}
                </label>
                {campo.multiline ? (
                  <textarea
                    id={campo.key}
                    name={campo.key}
                    defaultValue={valor(campo.key)}
                    rows={3}
                    className={inputClass}
                  />
                ) : (
                  <input
                    id={campo.key}
                    name={campo.key}
                    defaultValue={valor(campo.key)}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-0 flex items-center gap-4 border-t border-white/10 bg-night/90 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral px-6 py-3 font-bold text-cream disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar textos"}
        </button>
        {state?.error && <p className="text-sm text-coral">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green">Salvo com sucesso.</p>}
      </div>
    </form>
  );
}
