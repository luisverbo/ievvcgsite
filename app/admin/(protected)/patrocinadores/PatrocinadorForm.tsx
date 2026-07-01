"use client";

import { useActionState } from "react";
import { savePatrocinador } from "./actions";
import type { Patrocinador } from "@/lib/types";
import { inputClass, labelClass, fieldClass } from "../ui";

export default function PatrocinadorForm({ patrocinador }: { patrocinador?: Patrocinador }) {
  const [state, formAction, pending] = useActionState(savePatrocinador, undefined);
  const key = patrocinador?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {patrocinador && <input type="hidden" name="id" value={patrocinador.id} />}

      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`nome-${key}`}>
          Nome
        </label>
        <input
          id={`nome-${key}`}
          name="nome"
          defaultValue={patrocinador?.nome}
          required
          className={inputClass}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`link-${key}`}>
          Link (site do patrocinador)
        </label>
        <input
          id={`link-${key}`}
          name="link_url"
          type="url"
          placeholder="https://..."
          defaultValue={patrocinador?.link_url ?? ""}
          className={inputClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <label className={labelClass}>Logo — upload</label>
          <input type="file" name="logo_arquivo" accept="image/*" className={inputClass} />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>ou link do logo</label>
          <input
            name="logo_url"
            type="url"
            placeholder="https://..."
            defaultValue={patrocinador?.logo_url ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-coral px-5 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
