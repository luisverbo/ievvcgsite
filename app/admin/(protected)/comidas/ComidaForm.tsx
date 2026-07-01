"use client";

import { useActionState } from "react";
import { saveComida } from "./actions";
import type { Comida } from "@/lib/types";
import { inputClass, labelClass, fieldClass } from "../ui";

export default function ComidaForm({ comida }: { comida?: Comida }) {
  const [state, formAction, pending] = useActionState(saveComida, undefined);
  const key = comida?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {comida && <input type="hidden" name="id" value={comida.id} />}

      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`emoji-${key}`}>
          Emoji
        </label>
        <input
          id={`emoji-${key}`}
          name="emoji"
          defaultValue={comida?.emoji}
          placeholder="🍽️"
          className={`${inputClass} sm:w-20`}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`pais-${key}`}>
          País
        </label>
        <input
          id={`pais-${key}`}
          name="pais"
          defaultValue={comida?.pais}
          required
          className={inputClass}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`prato-${key}`}>
          Prato
        </label>
        <input
          id={`prato-${key}`}
          name="prato"
          defaultValue={comida?.prato}
          required
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-fit rounded-full bg-coral px-5 py-2.5 font-bold text-cream disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
      {state?.error && <p className="text-sm text-coral sm:basis-full">{state.error}</p>}
    </form>
  );
}
